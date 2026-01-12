# Requirements Document

## Introduction

本功能旨在调整聊天界面中工具调用消息的显示位置。当前工具调用消息显示在左侧（类似接收的消息），用户希望将其改为显示在右侧，使其看起来像智能体的"自言自语"，与智能体发送的消息保持一致的视觉风格。

## Glossary

- **Tool_Call_Message**: 工具调用消息，表示智能体调用工具时产生的消息记录
- **Chat_Panel**: 聊天面板组件，负责渲染和显示消息列表
- **Message_Item**: 消息项，聊天界面中的单条消息显示单元
- **Sent_Message**: 发送的消息，显示在右侧，使用绿色气泡样式
- **Received_Message**: 接收的消息，显示在左侧，使用白色气泡样式

## Requirements

### Requirement 1: 工具调用消息右对齐显示

**User Story:** As a user, I want tool call messages to appear on the right side of the chat, so that they look like the agent's internal monologue rather than received messages.

#### Acceptance Criteria

1. WHEN a tool call message is rendered, THE Chat_Panel SHALL display it on the right side of the chat area
2. WHEN a tool call message is rendered, THE Message_Item SHALL use `flex-direction: row-reverse` layout
3. WHEN a tool call message is rendered, THE Message_Item avatar SHALL appear on the right side of the message content
4. THE Tool_Call_Message style SHALL be visually distinct from regular Sent_Message while maintaining right alignment

### Requirement 2: 工具调用消息视觉样式调整

**User Story:** As a user, I want tool call messages to have a distinct visual style, so that I can easily distinguish them from regular chat messages.

#### Acceptance Criteria

1. THE Tool_Call_Message SHALL maintain its current blue-themed color scheme (background: #e3f2fd, text: #1976d2)
2. THE Tool_Call_Message bubble arrow SHALL point to the right side (towards the avatar)
3. THE Tool_Call_Message content alignment SHALL be right-aligned (align-items: flex-end)
4. THE Tool_Call_Message header elements SHALL be arranged from right to left

### Requirement 3: 工具调用详情折叠区域适配

**User Story:** As a user, I want the tool call details section to remain functional and properly aligned, so that I can still expand and view tool arguments and results.

#### Acceptance Criteria

1. WHEN the tool call details are expanded, THE details wrapper SHALL align to the right side
2. THE tool call toggle button SHALL remain clickable and functional after alignment change
3. THE tool call arguments and results sections SHALL maintain proper formatting and readability
