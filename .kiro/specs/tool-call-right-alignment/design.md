# Design Document: Tool Call Right Alignment

## Overview

本设计文档描述如何将聊天界面中的工具调用消息从左侧对齐改为右侧对齐，使其看起来像智能体的"自言自语"。这是一个纯 CSS 样式调整，不涉及 JavaScript 逻辑变更。

## Architecture

### 当前架构

聊天消息的布局由以下 CSS 类控制：
- `.message-item` - 基础消息容器，使用 flexbox 布局
- `.message-item.sent` - 发送的消息，使用 `flex-direction: row-reverse` 实现右对齐
- `.message-item.received` - 接收的消息，使用默认 `flex-direction: row` 实现左对齐
- `.message-item.tool-call` - 工具调用消息，当前使用 `flex-direction: row`（左对齐）

### 目标架构

将 `.message-item.tool-call` 的布局改为与 `.message-item.sent` 类似的右对齐样式，同时保持其独特的蓝色主题视觉风格。

## Components and Interfaces

### 受影响的文件

1. **web/css/style.css** - 主样式文件，需要修改工具调用消息的 CSS 规则

### CSS 类修改

```css
/* 修改前 */
.message-item.tool-call {
  flex-direction: row;
}

/* 修改后 */
.message-item.tool-call {
  flex-direction: row-reverse;
}
```

### 需要调整的样式规则

1. **消息容器布局** - 改为 `row-reverse`
2. **头像边距** - 从 `margin-right` 改为 `margin-left`
3. **内容对齐** - 改为 `align-items: flex-end`
4. **气泡箭头** - 调整伪元素位置，从左侧改为右侧

## Data Models

本功能不涉及数据模型变更，仅为 CSS 样式调整。

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Tool call messages right alignment

*For any* tool call message rendered in the chat panel, the message container should have `flex-direction: row-reverse` applied, causing the avatar to appear on the right side and content on the left.

**Validates: Requirements 1.1, 1.2**

### Property 2: Tool call toggle functionality preservation

*For any* tool call message with expandable details, clicking the toggle button should correctly expand/collapse the details section regardless of the alignment change.

**Validates: Requirements 3.2**

## Error Handling

本功能为纯样式调整，不涉及错误处理逻辑。如果 CSS 加载失败，消息将回退到默认样式显示。

## Testing Strategy

### Unit Tests (CSS Verification)

由于这是纯 CSS 变更，测试主要通过视觉验证：

1. 验证工具调用消息显示在右侧
2. 验证头像在消息内容右侧
3. 验证气泡箭头指向正确方向
4. 验证折叠/展开功能正常工作

### Property-Based Testing

使用 fast-check 进行属性测试：

1. **Property 1**: 对于任意工具调用消息，验证其 CSS 类包含正确的样式规则
2. **Property 2**: 对于任意可展开的工具调用消息，验证点击切换按钮后状态正确变化

### Manual Testing Checklist

- [ ] 工具调用消息显示在聊天区域右侧
- [ ] 工具图标（🔧）显示在消息内容右侧
- [ ] 蓝色主题样式保持不变
- [ ] 点击"参数与结果"可以正常展开/折叠
- [ ] 展开后的详情区域对齐正确
- [ ] 与普通发送消息（绿色）视觉上有明显区分
