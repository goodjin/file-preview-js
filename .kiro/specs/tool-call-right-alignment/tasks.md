# Implementation Plan: Tool Call Right Alignment

## Overview

将聊天界面中的工具调用消息从左侧对齐改为右侧对齐，使其看起来像智能体的"自言自语"。这是一个纯 CSS 样式调整任务。

## Tasks

- [x] 1. 修改工具调用消息的基础布局样式
  - 将 `.message-item.tool-call` 的 `flex-direction` 改为 `row-reverse`
  - 调整头像的边距（从 `margin-right` 改为 `margin-left`）
  - _Requirements: 1.1, 1.2_

- [x] 2. 调整工具调用消息的内容对齐
  - 将 `.message-item.tool-call .message-content` 的 `align-items` 改为 `flex-end`
  - 确保消息头部元素正确对齐
  - _Requirements: 2.3, 2.4_

- [x] 3. 调整工具调用详情区域的对齐
  - 确保 `.tool-call-details-wrapper` 在右对齐布局下正确显示
  - 验证展开/折叠功能正常工作
  - _Requirements: 3.1, 3.2_

- [x] 4. Checkpoint - 视觉验证
  - 在浏览器中验证工具调用消息显示在右侧
  - 验证蓝色主题样式保持不变
  - 验证折叠/展开功能正常
  - 确保与普通发送消息有视觉区分

## Notes

- 这是一个纯 CSS 修改任务，不涉及 JavaScript 代码变更
- 所有修改都在 `web/css/style.css` 文件中进行
- 由于是样式调整，主要通过视觉验证确认效果
