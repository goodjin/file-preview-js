## 目标
- 新增一组内部工具，直接作用于本软件自身 Web UI 页面：
  - 在页面内执行 JavaScript（可直接访问 window/document 等全局对象）
  - 获取页面内容
  - 修改页面结构（DOM/CSS）
- 修改只存在于页面内存态，刷新/重新加载自然丢失。

## 总体设计（单一活跃UI）
- Web UI 页面启动后生成 clientId（sessionStorage），持续轮询后端领取待执行指令。
- 后端记录“最近一次轮询的 clientId”为 activeUiClient。
- 智能体工具调用默认投递到 activeUiClient，不需要传 clientId。

## 新增工具函数（模块工具组，独立于 chrome）
- ui_page_eval_js
  - 入参：{ script, timeoutMs? }
  - 行为：在 UI 页面上下文执行 JS，脚本具备页面级权限，可直接读取/修改 window/document/DOM。
- ui_page_get_content
  - 入参：{ selector?, format: 'html'|'text'|'summary', maxChars?, timeoutMs? }
  - 行为：提取页面内容并做 maxChars 截断；summary 返回结构化摘要（标题、当前选中智能体/视图、可见关键节点摘要等）。
- ui_page_dom_patch
  - 入参：{ operations: [...], timeoutMs? }
  - 行为：结构化 DOM 补丁修改（setText/setHtml/setAttr/remove/insertAdjacentHtml/addClass/removeClass/injectCss），逐条返回结果与统计。

## 后端实现（轮询指令通道 + 工具模块）
- 新增 broker（内存队列 + pending Promise）：
  - enqueueToActive(command) → commandId
  - awaitResult(commandId, timeoutMs) → result
  - resolveResult(commandId, payload)
  - 维护 activeUiClient（每次 poll 更新 lastSeen）
- HTTP API（集成到现有 http_server.js）：
  - GET /api/ui-commands/poll?clientId=...&timeoutMs=...
  - POST /api/ui-commands/result
- 新模块 modules/ui_page：
  - 提供工具定义与 executeToolCall
  - 工具调用时：投递 command → 等待 result（timeoutMs 默认值）→ 返回工具结果

## 前端实现（UI 页面执行器，JS具备 window 权限）
- 新增 web/js/ui-page-tools.js（在 app.js 前加载）：
  - 初始化 clientId（sessionStorage）
  - 轮询 /api/ui-commands/poll
  - 执行器：
    - eval_js：以 Function 方式执行，并显式把 window/document 作为参数传入，保证脚本可以直接使用 window（同时允许脚本 return 任意可序列化值）。
    - get_content：按 selector/format 读取 DOM，maxChars 截断
    - dom_patch：执行结构化 operations，只改 DOM/CSS，不写 localStorage/indexedDB
  - POST /api/ui-commands/result 回传结果

## 错误处理约定（工具返回）
- ui_client_not_connected：当前没有活跃 UI
- ui_timeout：timeoutMs 内未收到前端回传
- ui_execute_error：前端执行脚本/patch 抛错（返回 message）

## 代码改动点（文件级）
- 后端：
  - src/platform/services/http/http_server.js：新增 /api/ui-commands/* 路由
  - src/platform/services/ui/ui_command_broker.js：新增 broker
  - modules/ui_page/index.js：新增工具模块
- 前端：
  - web/index.html：引入 js/ui-page-tools.js
  - web/js/ui-page-tools.js：新增轮询与执行器

## 测试与验证
- 单测（bun test）：
  - broker：enqueue/resolve/timeout/activeUiClient
  - ui_page 模块：未连接错误、超时错误、正常结果透传
- 不做启动验证（按你的规则不主动启动项目）。