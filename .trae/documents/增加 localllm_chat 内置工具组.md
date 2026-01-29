## 需求
- 增加内置工具函数组 `localllm`，暴露工具 `localllm_chat`，允许智能体调用 wllama 的 `chat(messages)` 并返回生成字符串。
- 采用方案 B：当 headless 未启动时自动尝试启动，再执行 chat。

## 改动范围
### 1) 增加内置工具组 localllm
- 修改 [tool_group_manager.js](file:///c:/Users/ASUS/Desktop/ai-build-ai/agents/src/platform/extensions/tool_group_manager.js)
  - `BUILTIN_TOOL_GROUPS` 增加：
    - `localllm`: `{ description, tools: ['localllm_chat'] }`

### 2) 增加内置工具 localllm_chat（schema + 执行）
- 修改 [tool_executor.js](file:///c:/Users/ASUS/Desktop/ai-build-ai/agents/src/platform/runtime/tool_executor.js)
  - `getToolDefinitions()` 增加工具定义：
    - name: `localllm_chat`
    - 参数：
      - `messages`: array<{ role: 'system'|'user'|'assistant', content: string }>
      - `timeoutMs`?: number
    - 返回：string
  - `executeToolCall()` 增加 case `localllm_chat`：
    - 若 wllama 未就绪：先调用 `launchWllamaHeadless({ port: runtime.config.httpPort ?? 3000, headless: true })`
      - 若 `AGENT_SOCIETY_WLLAMA_HEADLESS=0`，则直接返回 `{ error: 'localllm_not_ready', message: 'wllama headless 启动被禁用' }`
    - 然后调用 `chat(messages, { timeoutMs })` 并把字符串直接作为工具返回值。
    - 失败时返回结构化错误 `{ error: 'localllm_chat_failed', message }`（避免抛出导致上层只看到通用错误）。

### 3) 把 localllm_chat 纳入内置工具组“实定义替换”
- 修改 [runtime_tools.js](file:///c:/Users/ASUS/Desktop/ai-build-ai/agents/src/platform/runtime/runtime_tools.js)
  - `registerBuiltinToolGroups()`：
    - `toolGroupMapping` 增加 `localllm_chat: 'localllm'`
    - `toolsByGroup` 增加 `localllm: []`

### 4)（推荐一并做）create_role 的 toolGroups 描述动态列出可选组
- 修改 [tool_executor.js](file:///c:/Users/ASUS/Desktop/ai-build-ai/agents/src/platform/runtime/tool_executor.js)
  - `create_role` 的 `toolGroups.description` 改为 `runtime._generateToolGroupsDescription()` 的返回值，使 `localllm` 自动出现在可选值中。

## 测试
- 更新/新增测试，确保不启动真实浏览器：
  - `test/platform/tool_executor.test.js`
    - 断言工具列表包含 `localllm_chat`
    - 通过设置 `AGENT_SOCIETY_WLLAMA_HEADLESS=0`，调用该工具应返回 `{ error: 'localllm_not_ready' | 'localllm_chat_failed' }` 的稳定结构
  - `test/platform/runtime_tools.test.js`
    - 断言 `generateToolGroupsDescription()` 包含 `localllm`

## 验证
- 跑 `bun test`（相关测试集）验证通过。
- 运行时效果：智能体工具调用 `localllm_chat` 时，如 headless 未启动会自动启动并调用页面 `llmChat`，返回生成字符串。