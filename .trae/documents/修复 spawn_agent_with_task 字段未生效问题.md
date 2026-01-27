## 选定方案
- A2：在 AgentManager.spawnAgent/spawnAgentAs 层面支持并落地 taskBrief。
- B2：initialMessage 允许 string，并在工具侧自动转换为 object。

## 目标问题（现状）
- spawn_agent_with_task 的 taskBrief.inputs 等字段校验通过，但没有进入新智能体的上下文（system prompt 注入依赖 runtime._agentTaskBriefs，而该 Map 从未被写入）。

## 实施步骤
1. 在 AgentManager 落地 taskBrief（核心修复点）
   - 扩展 AgentManager.spawnAgent(input) 支持可选 input.taskBrief。
   - 在智能体实例创建并注册完成后：
     - 若 input.taskBrief 存在，则调用 runtime._state.setAgentTaskBrief(agent.id, input.taskBrief) 写入。
   - 扩展 AgentManager.spawnAgentAs(callerAgentId, input) 透传 input.taskBrief 给 spawnAgent。
   - 约束：AgentManager 不负责校验 TaskBrief 结构（保持职责单一）；TaskBrief 的结构校验仍在工具侧（validateTaskBrief）。

2. 在 ToolExecutor 支持 initialMessage 为 string（B2）
   - ToolExecutor._executeSpawnAgentWithTask：
     - 若 args.initialMessage 是 string，则转换为 { message_type: 'task_assignment', text: args.initialMessage }。
     - 若是 object，则保持现有逻辑：message_type 默认补齐。
   - 同时保持 tool schema 不变（仍声明 object），仅实现层向后兼容。

3. 确保时序正确（保证“第一次调用 LLM 就能看到 inputs”）
   - 关键顺序：spawnAgentWithTask → spawnAgentAs/spawnAgent 创建成功 → 写入 taskBrief → bus.send initialMessage。
   - 这样新智能体处理 initialMessage 时构建 system prompt，就能从 runtime._agentTaskBriefs 读到并注入。

4. terminate_agent 清理 taskBrief
   - 在 AgentManager.terminateAgent 的清理循环中，增加 runtime._agentTaskBriefs.delete(agentId)（或通过 RuntimeState 增加删除接口；为减少改动先用 Map.delete）。
   - 目的：避免已终止智能体残留 TaskBrief。

5. 单测更新与新增（验证字段“真的起作用”）
   - 更新 ToolExecutor 的 spawn_agent_with_task 测试：
     - initialMessage 改为 string（覆盖 B2 路径），断言工具返回成功（无 error 且 id 存在）。
     - 断言 runtime._agentTaskBriefs.get(newAgentId) 存在且 inputs 等字段一致。
     - 构建 childCtx，调用 runtime._buildSystemPromptForAgent(childCtx)，断言包含“【任务委托书 Task Brief】”与 inputs 文本。
   - 新增 terminate_agent 测试：创建子智能体并写入 taskBrief 后终止，断言 runtime._agentTaskBriefs 不再包含该 agentId。

## 可选收敛项（不影响主修复，可后续再做）
- core/runtime.js 内仍有一份 _executeSpawnAgentWithTask 的重复实现：
  - 方案：改为内部委托 ToolExecutor 或删除该重复方法，避免未来两份逻辑再度不一致。
  - 此项不影响本次 inputs 注入修复，默认先不动。

## 验收点
- spawn_agent_with_task 传入的 taskBrief.inputs 在新智能体 system prompt 中可见。
- initialMessage 传 string 时可正常创建并发送任务消息。
- terminate_agent 后对应 taskBrief 被清理。
- 单测覆盖并通过。