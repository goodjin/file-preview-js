## 协程特性：采用“显式状态机 + 续跑（continuation）”
- 不使用真正的栈协程（JS/Node 无原生）；改用 **Turn 状态机** 表达执行点。
- 每次调度只推进 **一个 step**，step 的边界固定：
  - 发起一次 LLM 请求
  - 处理一次 LLM 响应
  - 执行一个 tool_call
  - 合并一次插话/新消息
- 长操作（LLM/tool）不在调度器内 await：调度器只负责启动异步任务并注册完成回调，完成后把 agent 重新入队。

## 模块拆分与责任
- **ComputeScheduler（调度器）**
  - 责任：公平选择“下一个可运行的 agent”，并驱动其运行一个 step。
  - 不关心对话内容、不解析 tool_calls、不写聊天记录。
  - 只维护：ready 队列、inFlight（每 agent 最多 1 个 in-flight）、并发上限（可选，主要用于 tool 并发）。

- **TurnEngine（回合引擎）**
  - 责任：
    - 为每个 agent 管理一个 FIFO 的 Turn 队列（每条入站消息一个 Turn）。
    - 提供 `step(agentId)`：推进该 agent 当前 Turn 的一个 step，并返回“下一步需要做什么”。
  - 约束：同一 agent 的 conv/历史只允许 TurnEngine 写（单写者）。

- **LlmDispatcher（LLM 派发）**
  - 责任：
    - 包装 LlmClient.chat；统一注入 meta：`agentId, turnId, stepId, epoch`。
    - 统一处理 abort + “晚到结果丢弃”。
  - 不解析业务文本、不执行工具。

- **ToolRunner（工具执行器包装）**
  - 责任：
    - 包装 runtime.executeToolCall；支持 cancel signal；结束后把结果交还 TurnEngine。
  - 约束：不直接写 conv，不直接发消息（除非工具本身是 send_message 这类显式副作用工具）。

- **AgentCancelManager（取消管理）**
  - 责任：统一 abort/stop/terminate 的信号与 epoch。
  - 提供：
    - `getEpoch(agentId)`
    - `newScope(agentId): { epoch, signal, assertActive() }`
    - `abort(agentId, reason)` / `stop(agentId, reason)` / `terminate(agentId, reason)`

## 核心接口规则（模块交接面）
- ComputeScheduler ↔ TurnEngine
  - `turnEngine.hasRunnable(agentId): boolean`
  - `turnEngine.step(agentId, scope): StepOutcome`
  - StepOutcome（只允许以下几种）：
    - `{ kind: 'need_llm', request: {messages, tools, meta} }`
    - `{ kind: 'need_tool', call: {name, args, callId} }`
    - `{ kind: 'send', message: OutboundMessage }`（用于“LLM 纯文本自动发 user”等显式动作）
    - `{ kind: 'done' }`
    - `{ kind: 'noop' }`（无事可做）

- ComputeScheduler ↔ LlmDispatcher
  - `llmDispatcher.start(request, scope): Promise<LlmResult>`
  - 完成回调必须带回：`{ turnId, stepId, epoch, msg|error }`

- ComputeScheduler ↔ ToolRunner
  - `toolRunner.start(call, scope): Promise<ToolResult>`

- TurnEngine ↔ AgentCancelManager
  - TurnEngine 只读 epoch/signal；任何推进前后都调用 `scope.assertActive()`，失败则立即 `done` 并清理副作用。

## Turn（回合）数据结构与状态机（关键约束）
- Turn 必须携带：
  - `turnId`（唯一）
  - `agentId`
  - `sourceMessage`（入站消息）
  - `convRef`（对话数组引用，仅 TurnEngine 写）
  - `phase`：`init | waiting_llm | have_llm_msg | executing_tools | finished`
  - `pendingToolCalls[]`（从 LLM msg 中解析出的 tool_calls 列表）
  - `lastStepId`（单调递增）

- 状态转移（只允许这些边）：
  - init → need_llm（准备 user 输入并请求 LLM）
  - waiting_llm + LLM返回 → have_llm_msg
  - have_llm_msg：
    - 若无 tool_calls → send（可选）→ finished
    - 若有 tool_calls → executing_tools（把 tool_calls 装入 pendingToolCalls）
  - executing_tools：每个 step 只取 1 个 tool_call → need_tool → tool返回 → 继续 executing_tools/或回到 need_llm（把 tool 结果 push 到 conv 后再请求下一轮 LLM）

## 公平性保证点（为什么不会饿死）
- 系统层面：ComputeScheduler 的 ready 队列按 agentId round-robin；一个 agent 每次只推进 1 个 step。
- LLM 层面：ConcurrencyController 重写为“每 agent 同时最多 1 个 pending + agentId round-robin 出队”。
- 组合效果：
  - 即使某 agent 有无限 tool_rounds，它也只能在每次轮到它时推进一步；其他 agent 的 step 机会不会被其长循环吞噬。

## 强取消语义（保证“取消请求 + 不处理晚到结果”）
- 每个 in-flight 任务（LLM/tool）启动时都绑定 `epoch`。
- 任务完成回调时必须执行：
  - 若 `callback.epoch !== cancelManager.getEpoch(agentId)` → **丢弃结果**（不进入 TurnEngine，不写 conv，不 emit 事件）。
- abort/stop/terminate 时：
  - `cancelManager.abort()` 递增 epoch + abort signal。
  - `llmClient.abort(agentId)` 取消 active/queued。
  - TurnEngine 清除该 agent 当前 turn 与队列（stop/terminate）；abort 只终止当前 turn。

## 插话/新消息的协程化处理规则
- 新消息到达 busy agent：写入 `pendingInterruptions[agentId]`。
- TurnEngine 在每次准备发起 LLM 的 step 前：
  - 先把 pendingInterruptions 统一格式化为一条 user 消息追加到 conv（或按多条追加）。
  - 若当前正 waiting_llm，则由 CancelManager 触发 abort，等待回调丢弃旧结果，然后继续下一步重新发起 LLM。

## 需要修改/新增的文件（保持目录责任清晰）
- 新增：
  - `src/platform/runtime/compute_scheduler.js`
  - `src/platform/runtime/turn_engine.js`
  - `src/platform/runtime/agent_cancel_manager.js`
- 重写：
  - `src/platform/services/llm/concurrency_controller.js`
- 调整接入：
  - `src/platform/core/runtime.js`：把 startProcessing/循环入口改为 ComputeScheduler。
  - `src/platform/runtime/runtime_llm.js`：收敛为 TurnEngine 的适配层（保留 system prompt、format 等纯函数职责）。
  - `src/platform/runtime/runtime_lifecycle.js`：abort/stop/terminate 走 CancelManager。
  - `src/platform/services/http/http_client.js` 与 `src/platform/runtime/tool_executor.js`：http_request 支持外部 signal。

## 测试验收点（围绕接口契约）
- 调度公平：1000 次 step 调度内，每个有待处理消息的 agent 都能获得 step（不存在长期 0 次）。
- LLM 公平：多 agent 同时排队时，出队顺序满足 round-robin（允许并发槽位导致的局部并行，但不允许单 agent 长期连续占用）。
- 取消正确：
  - abort 后即使 LLM/tool promise resolve，也不会：写 conv、emitToolCall、send_message。
  - stop/terminate 后队列清空且不会再被调度。

## 实施顺序（按模块边界可渐进验证）
1. AgentCancelManager + 生命周期接入（先让“丢弃晚到结果”生效）。
2. ConcurrencyController 公平重写 + 单测。
3. TurnEngine 最小闭环（LLM→文本→done）+ ComputeScheduler 驱动。
4. TurnEngine 加入 tool_calls（一次 tool_call 一步）+ 公平单测。
5. 插话与 http_request signal 透传 + 取消单测。
6. 移除旧长循环路径，保证唯一执行路径。