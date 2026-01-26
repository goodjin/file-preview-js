## 需求
- 必做 1：当调用大模型接口因 token/context 超限失败时，自动滑动上下文窗口：只发送 system + 最后 70%（按 token 估算长度）的内容，并重试调用；避免直接报错。
- 必做 2：将每次 LLM 返回的 usage（prompt/completion/total tokens）写入消息数据，并在网页 UI 的“消息详情”里展示。

## 实现要点
- token 估算不引入新依赖，利用每次成功调用返回的 `usage.prompt_tokens` 动态校准。
- 滑动窗口裁剪必须保证工具调用历史一致：裁剪后不能出现孤立的 tool 响应（tool_call_id 找不到对应 tool_calls）。

## 改动范围
### 1) ConversationManager：token 估算器 + 按估算 token 滑动裁剪
- 文件：[conversation_manager.js](file:///c:/Users/ASUS/Desktop/ai-build-ai/agents/src/platform/services/conversation/conversation_manager.js)
- 新增内部状态：`_promptTokenEstimator`（MapagentId → {tokensPerChar, lastPromptTokens, lastPromptChars, updatedAt}）。
- 新增方法：
  - `updatePromptTokenEstimator(agentId, sentMessages, promptTokens)`：用本次发送消息的字符总数与 promptTokens 更新 `tokensPerChar`（带上下限夹逼，避免异常值污染）。
  - `estimateMessageTokens(agentId, message)` / `estimatePromptTokens(agentId, messages)`：基于 tokensPerChar 做估算；无样本时用保守默认值。
  - `slideWindowByEstimatedTokens(agentId, keepRatio = 0.7)`：
    - 保留开头连续 system 消息（system prompt + 历史摘要等）。
    - 对其余消息按估算 token 保留“最后 70% token 贡献”。
    - 边界保护：必要时向前扩展，直到 `verifyHistoryConsistency(agentId)` 不再出现孤立 tool 响应。

### 2) RuntimeLlm：超限错误触发滑动+重试；成功回填估算器；消息 payload 写入 usage
- 文件：[runtime_llm.js](file:///c:/Users/ASUS/Desktop/ai-build-ai/agents/src/platform/runtime/runtime_llm.js)
- doLlmProcessing：
  - 调用 LLM 前保存 `convSnapshot = conv.slice()` 作为“本次实际发送的 messages”。
  - 成功且 `msg._usage.promptTokens` 存在时：调用 `conversationManager.updatePromptTokenEstimator(agentId, convSnapshot, msg._usage.promptTokens)`。
  - catch(err) 时增加 `_isContextLengthExceededError(err)` 识别：
    - 命中则执行 `slideWindowByEstimatedTokens(agentId, 0.7)` 并 warn 日志。
    - 立即对裁剪后的 conv 重试一次 `llmClient.chat(...)`；重试失败才走原有错误上送。
- 自动发送纯文本回复时把 usage 写入 payload：
  - 修改点：[runtime_llm.js:L299-L304](file:///c:/Users/ASUS/Desktop/ai-build-ai/agents/src/platform/runtime/runtime_llm.js#L299-L304)
  - 目标：`payload: { text: content.trim(), usage: msg._usage ?? null }`

### 3) Web UI：消息详情弹窗展示 Usage
- 文件：[message-modal.js](file:///c:/Users/ASUS/Desktop/ai-build-ai/agents/web/js/components/message-modal.js)
- 修改 `renderContent(message)`：
  - 在“创建时间”之后、“Payload JSON”之前插入 Usage 区块。
  - 当 `message.payload?.usage` 存在时展示 promptTokens / completionTokens / totalTokens。

### 4) 单元测试
- 文件：[conversation_manager.test.js](file:///c:/Users/ASUS/Desktop/ai-build-ai/agents/test/platform/conversation_manager.test.js)
- 新增用例：
  - 估算器更新与估算结果变化。
  - 按估算 token 滑动裁剪后保留比例与一致性（含 tool_call 链路不被截断）。

## 验证
- 运行单测（bun test）。
- 人工验证：触发一次 token/context 超限后应看到“裁剪并重试”的日志；网页消息详情能看到 Usage 字段。

## 交付物
- token 超限自动滑动窗口 + 重试逻辑。
- usage 入库并在网页消息详情中可见。
- 对应单元测试覆盖。