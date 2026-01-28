## 目标
在 chrome 模块新增 2 个工具函数：
- 打开开发者工具（按“启用调试采集能力”定义）
- 获取开发者工具内容（以 Console/页面错误/可选网络失败日志为主）

同时按你的要求：
- 采用方案 A。
- `chrome_launch` 仅增加 `autoOpenDevtoolsForTabs` 参数，不增加 `headless` 参数。

## 设计与接口
### 新增工具 1：chrome_open_devtools
- 入参：
  - tabId: string
  - captureConsole?: boolean（默认 true）
  - capturePageError?: boolean（默认 true）
  - captureRequestFailed?: boolean（默认 false）
  - maxEntries?: number（默认 500，环形缓冲）
  - clearExisting?: boolean（默认 false）
- 行为：
  - 对指定 tab 绑定 puppeteer Page 的事件监听并缓存日志。
  - 允许重复调用：若已启用，则更新配置/缓冲上限；不重复绑定监听。

### 新增工具 2：chrome_get_devtools_content
- 入参：
  - tabId: string
  - types?: string[]（"console" | "pageerror" | "requestfailed"，默认全部）
  - limit?: number（默认 200）
  - clearAfterRead?: boolean（默认 false）
- 返回：
  - { ok: true, entries: Array<...>, dropped: number, total: number }

### 增强工具：chrome_launch（按你要求仅新增一个参数）
- 入参：
  - autoOpenDevtoolsForTabs?: boolean（默认 false）
- 行为：
  - 当 autoOpenDevtoolsForTabs=true 时：
    - 启动参数追加 `--auto-open-devtools-for-tabs`
    - 强制以有界面模式启动（内部将 headless 置为 false），以确保该参数生效
  - 其他行为保持不变（仍按模块配置决定默认 headless/代理等）。

## 代码改动点（文件级）
- [modules/chrome/tools.js](file:///c:/Users/ASUS/Desktop/ai-build-ai/agents/modules/chrome/tools.js)
  - 增加 `chrome_open_devtools`、`chrome_get_devtools_content` 的 tool definitions。
  - 扩展 `chrome_launch` 参数：仅加入 `autoOpenDevtoolsForTabs`。
- [modules/chrome/index.js](file:///c:/Users/ASUS/Desktop/ai-build-ai/agents/modules/chrome/index.js)
  - 增加 2 个新工具的路由：转发到 TabManager（或 TabManager 内部的 devtools 相关方法）。
- [modules/chrome/tab_manager.js](file:///c:/Users/ASUS/Desktop/ai-build-ai/agents/modules/chrome/tab_manager.js)
  - 为 Tab 增加 devtools 状态：是否启用、ring buffer、丢弃计数、配置。
  - 实现：enableDevtools(tabId, options) / getDevtoolsContent(tabId, options)。
  - 绑定监听：`page.on('console')`、`page.on('pageerror')`、可选 `page.on('requestfailed')`。
- [modules/chrome/browser_manager.js](file:///c:/Users/ASUS/Desktop/ai-build-ai/agents/modules/chrome/browser_manager.js)
  - 支持 options.autoOpenDevtoolsForTabs：追加启动参数并强制 headless=false。
- [modules/chrome/chrome.md](file:///c:/Users/ASUS/Desktop/ai-build-ai/agents/modules/chrome/chrome.md)
  - 补充新增能力说明（工具列表/用途/限制）。

## 测试策略（不启动整套项目）
- 增加单元测试（mock Page）：
  - enableDevtools 会注册所需事件。
  - ring buffer 超限会丢弃旧数据，dropped 计数正确。
  - getDevtoolsContent 的 limit/clearAfterRead 行为正确。
- 增加一条可选集成测试（真实 Chrome）：
  - 若探测不到 Chrome 可执行文件则 skip，避免在无 Chrome 环境失败。

## 约束与行为保证
- 不采集 cookies/localStorage 等敏感数据，仅采集页面输出与错误信息。
- 单次返回做条数限制与字段裁剪，避免工具返回过大。
- 旧调用兼容：新增工具为增量；chrome_launch 新参数为可选。
