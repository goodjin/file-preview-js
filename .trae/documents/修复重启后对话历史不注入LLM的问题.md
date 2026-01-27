## 现状说明（老链路/新链路）
- 新链路（当前实际在用）：Runtime 把消息处理委托给 RuntimeLlm
  - 委托关系：[runtime.js](file:///c:/Users/ASUS/Desktop/ai-build-ai/agents/src/platform/core/runtime.js#L793-L802)
- 老链路（代码仍在，但不在主路径）：LlmHandler（以及与它配套的“构建 system prompt/格式化消息/ensureConversation”等旧式逻辑）
  - 文件入口：[llm_handler.js](file:///c:/Users/ASUS/Desktop/ai-build-ai/agents/src/platform/runtime/llm_handler.js#L162-L230)
- 当前问题来自“新链路缺少写盘持久化”，导致重启后 loadAllConversations 读不到最新历史。

## 目标
1. 先按方案A修补新链路：让对话历史在运行中能写入 runtimeDir/conversations。
2. 再删除老链路：移除 llm_handler.js 及其导出、测试、文档引用，避免两套逻辑并存。

## 步骤一：修补新链路（方案A）
- 修改 [runtime_llm.js](file:///c:/Users/ASUS/Desktop/ai-build-ai/agents/src/platform/runtime/runtime_llm.js#L35-L55)
  - 在 handleWithLlm 中把 `doLlmProcessing(...)` 包裹在 try/finally
  - finally 里调用 `this.runtime._conversationManager.persistConversation(agentId)`
  - 目的：无论成功、提前 return、抛错，都会把当前会话变更排队写盘

## 步骤二：补测试（覆盖“重启后历史仍在”）
- 新增测试文件：test/platform/runtime_llm_persistence.test.js（bun test）
  - 用临时目录作为 conversationsDir
  - 构造最小 runtime stub：
    - _conversations: Map
    - _conversationManager: ConversationManager（真实实现）
    - getLlmClientForAgent: 返回 fake llmClient（chat 固定返回 assistant）
    - getToolDefinitions: 返回空数组
    - _state: 提供 set/getAgentComputeStatus（最小实现）
    - log/loggerRoot：最小 noop
  - 断言：
    1) 处理一次消息后生成 {agentId}.json
    2) 新建 ConversationManager.loadAllConversations 后能恢复 messages

## 步骤三：删除老链路（llm_handler）
- 删除文件：src/platform/runtime/llm_handler.js
- 更新导出与文档：
  - 修改 [runtime/index.js](file:///c:/Users/ASUS/Desktop/ai-build-ai/agents/src/platform/runtime/index.js) 去掉 `export { LlmHandler ... }`，并同步更新文件头部列表
  - 修改 [runtime.md](file:///c:/Users/ASUS/Desktop/ai-build-ai/agents/src/platform/runtime/runtime.md) 去掉 llm_handler 相关描述，改为说明 RuntimeLlm 是 LLM 子模块
  - 修改 [runtime.js](file:///c:/Users/ASUS/Desktop/ai-build-ai/agents/src/platform/core/runtime.js#L37-L73) 的模块清单，移除 LlmHandler 描述，避免误导
- 删除/迁移老链路测试：
  - 删除 test/platform/llm_handler*.test.js（这 6 个文件目前只覆盖老链路）
  - 若其中有“通用能力”测试价值（例如取消、插话、工具循环），再按新链路 RuntimeLlm/TurnEngine 的实际入口重写到新的测试文件中（不再依赖 LlmHandler）

## 步骤四：清理 ContextBuilder 的“老链路残留”接口（只保留它现在真正使用的 buildAgentContext）
- 说明：ContextBuilder 目前仍被 Runtime 用于构建 agent ctx（用于工具集合等），不能删除：
  - [runtime.js:_buildAgentContext](file:///c:/Users/ASUS/Desktop/ai-build-ai/agents/src/platform/core/runtime.js#L864-L866)
- 但 ContextBuilder 里关于 system prompt / message format / ensureConversation 的方法与 RuntimeLlm 重复且几乎不再被引用（当前只被 http_server 的 system-prompt 查询接口优先调用）：
  - [http_server.js](file:///c:/Users/ASUS/Desktop/ai-build-ai/agents/src/platform/services/http/http_server.js#L2035-L2042)
- 我会把 http_server 的 systemPrompt 查询改为直接调用 `runtime._buildSystemPromptForAgent(ctx)`，然后删除 ContextBuilder 中不再需要的那几组方法与对应 import，避免两套 prompt 组装逻辑并存。

确认后我会按以上顺序落地代码与测试，并确保 bun test 全量通过。