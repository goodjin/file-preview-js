## 目标
- 在网页里“与 root 对话”的界面增加“新会话”按钮。
- 点击后：从这一刻起，root 后续发给大模型的上下文不再包含此前所有历史信息。
- 不改变其他智能体界面（不出现该按钮），其他智能体不具备此功能。

## 采用方案
- 方案 A（你已确认）：点击后直接清空 root 的会话上下文与上下文 token 统计。
- 说明：网页消息列表（JSONL）仍保留；但 root 的 conversations.json 会被清空/删除，因此旧消息的“思考过程/推理内容”查询可能无法再加载。

## 关键代码位置
- 前端对话头部 DOM： [index.html](file:///c:/Users/ASUS/Desktop/ai-build-ai/agents/web/index.html#L74-L83)
- 对话面板逻辑： [chat-panel.mjs](file:///c:/Users/ASUS/Desktop/ai-build-ai/agents/web/js/components/chat-panel.mjs#L673-L736)
- 前端 API 封装： [api.js](file:///c:/Users/ASUS/Desktop/ai-build-ai/agents/web/js/api.js#L123-L207)
- 后端 HTTP 路由分发： [http_server.js](file:///c:/Users/ASUS/Desktop/ai-build-ai/agents/src/platform/services/http/http_server.js#L707-L818)
- 会话上下文管理器： [conversation_manager.js](file:///c:/Users/ASUS/Desktop/ai-build-ai/agents/src/platform/services/conversation/conversation_manager.js#L811-L888)

## 实施步骤
### 1) 前端：仅在 root 对话头部显示按钮
- 修改 [index.html](file:///c:/Users/ASUS/Desktop/ai-build-ai/agents/web/index.html#L74-L83)
  - 在 .chat-header 内新增按钮（例如 id="root-new-session-btn"，文案“新会话”）。
- 修改 [chat-panel.mjs](file:///c:/Users/ASUS/Desktop/ai-build-ai/agents/web/js/components/chat-panel.mjs#L42-L97)
  - init() 获取按钮引用并绑定 click。
  - updateHeader() 中根据 currentAgentId === "root" 控制按钮 display；其他智能体时隐藏。
  - click 行为：调用 API.startRootNewSession()；成功后 Toast 提示“已开始新会话（root）”。
- 修改 web/css/style.css
  - 为按钮补齐与现有 header 一致的样式（不改动其他区域）。

### 2) 前端 API：增加一个专用接口封装
- 修改 [api.js](file:///c:/Users/ASUS/Desktop/ai-build-ai/agents/web/js/api.js)
  - 新增 API.startRootNewSession()，POST 到 /api/root/new-session。

### 3) 后端：新增“root 新会话”接口（只允许 root）
- 修改 [http_server.js](file:///c:/Users/ASUS/Desktop/ai-build-ai/agents/src/platform/services/http/http_server.js#L707-L818)
  - 新增路由：POST /api/root/new-session
  - 处理逻辑（固定作用于 root，不接收任意 agentId 参数）：
    - 调用 runtime._conversationManager.clearTokenUsage("root")。
    - 调用 runtime._conversationManager.deleteConversation("root") 清空内存会话。
    - 调用 runtime._conversationManager.deletePersistedConversation("root") 删除 conversations 持久化文件，避免重启后旧上下文回流。
    - 写入一条 web 消息标记到 root 的 messages JSONL（payload.text="--- 新会话 ---"），便于 UI 看到分隔。
    - 返回 {ok:true}。

## 验证方式（你来启动网页）
- UI：选中 root 时显示“新会话”按钮；选中其他智能体不显示。
- 行为：点击“新会话”后，消息列表出现“--- 新会话 ---”。之后再给 root 发消息，root 不再带入此前对话背景。
- 稳定性：点击按钮不会影响其他智能体对话页的显示与发送。
