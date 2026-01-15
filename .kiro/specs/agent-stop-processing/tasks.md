# Implementation Plan: Agent Stop Processing

## Overview

本实现计划将智能体停止处理功能分解为一系列增量式的编码任务。每个任务都建立在前一个任务的基础上，确保功能逐步完善并通过测试验证。

## Tasks

- [x] 1. 修改 Runtime 类以支持新的智能体状态
  - 在 `src/platform/runtime.js` 中扩展 `_agentComputeStatus` 映射以支持新状态
  - 添加状态常量：`stopping`, `stopped`, `terminating`
  - 更新 `setAgentComputeStatus` 方法以接受新状态
  - 更新 `getAgentComputeStatus` 方法以返回新状态
  - _Requirements: 2.1, 5.1, 5.3_

- [ ]* 1.1 为新状态编写单元测试
  - 测试状态设置和获取
  - 测试状态转换的有效性
  - _Requirements: 2.1, 5.1, 5.3_

- [ ] 2. 实现停止操作的核心逻辑
  - [x] 2.1 修改 `abortAgentLlmCall` 方法
    - 将状态设置为 `stopping` 而不是 `idle`
    - 中止 LLM 调用
    - 清空消息队列
    - 最后设置状态为 `stopped`
    - _Requirements: 1.1, 1.2, 1.3, 2.1_

  - [ ]* 2.2 编写停止操作的属性测试
    - **Property 1: 停止操作立即中止 LLM 请求**
    - **Validates: Requirements 1.1, 3.1**

  - [ ]* 2.3 编写停止操作的属性测试
    - **Property 2: 停止后状态正确设置**
    - **Validates: Requirements 2.1**

  - [ ]* 2.4 编写停止操作的属性测试
    - **Property 3: 停止操作清空消息队列**
    - **Validates: Requirements 1.3, 6.1**

- [ ] 3. 实现消息队列过滤机制
  - [x] 3.1 修改 MessageBus 的 `send` 方法
    - 在添加消息前检查智能体状态
    - 如果状态为 `stopped` 或 `stopping` 或 `terminating`，拒绝消息
    - 记录被拒绝的消息日志
    - _Requirements: 2.2, 2.3_

  - [x] 3.2 添加清空队列的方法
    - 在 MessageBus 中添加 `clearQueue(agentId)` 方法
    - 返回被清空的消息数量
    - _Requirements: 1.3, 3.2_

  - [ ]* 3.3 编写消息过滤的属性测试
    - **Property 4: 已停止智能体拒绝新消息**
    - **Validates: Requirements 2.2, 2.3**

- [x] 4. Checkpoint - 确保基础停止功能正常工作
  - 确保所有测试通过，询问用户是否有问题

- [ ] 5. 实现 LLM 响应过滤机制
  - [x] 5.1 修改 `_doLlmProcessing` 方法
    - 在处理 LLM 响应前检查智能体状态
    - 如果状态为 `stopped` 或 `terminating`，丢弃响应
    - 记录丢弃响应的日志
    - _Requirements: 1.4, 3.4_

  - [ ]* 5.2 编写 LLM 响应过滤的属性测试
    - **Property 6: 已停止或已删除智能体丢弃 LLM 响应**
    - **Validates: Requirements 1.4, 3.4**

- [ ] 6. 修改删除操作以执行停止流程
  - [x] 6.1 修改 `_executeTerminateAgent` 方法
    - 在删除前先执行停止操作（调用 `abortAgentLlmCall`）
    - 设置状态为 `terminating`
    - 清理所有资源
    - 从系统中移除智能体
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ]* 6.2 编写删除操作的属性测试
    - **Property 7: 删除操作移除所有注册信息**
    - **Validates: Requirements 3.3, 6.5**

  - [ ]* 6.3 编写资源清理的属性测试
    - **Property 15: 删除操作清理资源**
    - **Validates: Requirements 6.3, 6.4**

- [ ] 7. 移除停止和删除操作中的通知消息
  - [x] 7.1 修改 `abortAgentLlmCall` 方法
    - 移除向父智能体发送中断通知的代码
    - 确保不调用 `_sendErrorNotificationToParent`
    - _Requirements: 2.4_

  - [x] 7.2 修改 `_executeTerminateAgent` 方法
    - 确保删除过程中不发送任何通知消息
    - _Requirements: 3.5_

  - [ ]* 7.3 编写通知消息的属性测试
    - **Property 5: 停止和删除操作不发送通知**
    - **Validates: Requirements 2.4, 3.5, 4.4**

- [x] 8. Checkpoint - 确保停止和删除功能完整
  - 确保所有测试通过，询问用户是否有问题

- [ ] 9. 实现级联停止功能
  - [x] 9.1 添加级联停止方法
    - 在 Runtime 类中添加 `_cascadeStopAgents(parentAgentId)` 方法
    - 递归查找所有子智能体
    - 对每个子智能体调用停止操作
    - 返回被停止的智能体 ID 列表
    - _Requirements: 4.1_

  - [x] 9.2 修改 `abortAgentLlmCall` 以支持级联
    - 添加可选参数 `cascade` (默认为 false)
    - 当 `cascade` 为 true 时，调用 `_cascadeStopAgents`
    - _Requirements: 4.1_

  - [ ]* 9.3 编写级联停止的属性测试
    - **Property 8: 级联停止子智能体**
    - **Validates: Requirements 4.1**

  - [ ]* 9.4 编写级联操作一致性的属性测试
    - **Property 10: 级联操作一致性**
    - **Validates: Requirements 4.3**

- [ ] 10. 实现级联删除功能
  - [x] 10.1 修改 `_executeTerminateAgent` 方法
    - 确保级联删除所有子智能体
    - 验证现有的 `_collectDescendantAgents` 方法是否正确工作
    - _Requirements: 4.2_

  - [ ]* 10.2 编写级联删除的属性测试
    - **Property 9: 级联删除子智能体**
    - **Validates: Requirements 4.2**

- [ ] 11. 实现原子性和竞态条件保护
  - [x] 11.1 添加状态锁机制
    - 在 Runtime 类中添加 `_stateLocks` Map
    - 实现简单的互斥锁（使用 Promise 队列）
    - 在状态转换时获取锁
    - _Requirements: 5.1, 5.4_

  - [x] 11.2 修改 `abortAgentLlmCall` 使用锁
    - 在方法开始时获取锁
    - 检查当前状态，如果已经在停止中则直接返回
    - 执行停止操作
    - 释放锁
    - _Requirements: 5.1, 5.4_

  - [ ]* 11.3 编写原子性的属性测试
    - **Property 11: 停止操作原子性**
    - **Validates: Requirements 5.1, 5.4**

- [ ] 12. 实现正在停止状态的操作拒绝
  - [x] 12.1 修改消息处理逻辑
    - 在 `_processAgentMessage` 中检查状态
    - 如果状态为 `stopping` 或 `stopped` 或 `terminating`，跳过处理
    - _Requirements: 5.2_

  - [ ]* 12.2 编写正在停止状态的属性测试
    - **Property 12: 正在停止状态拒绝新操作**
    - **Validates: Requirements 5.2**

- [ ] 13. 实现停止操作优先级
  - [x] 13.1 修改 LLM 响应处理逻辑
    - 在 `_doLlmProcessing` 的 LLM 调用后立即检查状态
    - 如果状态已变为 `stopping` 或 `stopped`，丢弃响应
    - **重要修复**: 在工具调用执行循环中添加状态检查
    - 在每个工具调用执行前和执行后检查状态
    - 如果智能体已停止，立即返回，不执行剩余工具调用
    - _Requirements: 5.5_

  - [ ]* 13.2 编写停止优先级的属性测试
    - **Property 13: 停止操作优先级**
    - **Validates: Requirements 5.5**

- [x] 14. Checkpoint - 确保所有核心功能完整
  - 确保所有测试通过，询问用户是否有问题

- [ ] 15. 更新 API 端点
  - [x] 15.1 修改 `/agent/:agentId/abort` 端点
    - 调用更新后的 `abortAgentLlmCall` 方法
    - 返回更新后的结果格式
    - _Requirements: 1.1_

  - [x] 15.2 确保删除端点正确工作
    - 验证现有的删除端点是否调用了更新后的方法
    - _Requirements: 3.1_

- [ ] 16. 更新前端 UI
  - [x] 16.1 更新智能体状态显示
    - 在 `web/js/components/agent-list.js` 中添加 `stopped` 状态的显示
    - 显示停止图标和状态文本
    - _Requirements: 7.1_

  - [x] 16.2 更新停止按钮行为
    - 确保点击停止按钮后立即更新 UI 状态
    - _Requirements: 7.1_

  - [x] 16.3 更新删除按钮行为
    - 确保删除后立即从列表中移除智能体
    - _Requirements: 7.3_

- [ ] 17. 集成测试和端到端测试
  - [ ]* 17.1 编写端到端测试
    - 测试从 UI 点击停止到后端处理的完整流程
    - 测试从 UI 删除智能体的完整流程
    - _Requirements: 1.1, 3.1_

  - [ ]* 17.2 编写并发场景测试
    - 测试多个智能体同时停止
    - 测试停止和消息处理的竞态条件
    - _Requirements: 5.4, 5.5_

- [x] 18. 最终 Checkpoint - 完整功能验证
  - 确保所有测试通过
  - 手动测试所有场景
  - 询问用户是否有问题或需要调整

## Notes

- 任务标记 `*` 的为可选任务，可以跳过以加快 MVP 开发
- 每个任务都引用了具体的需求条款以确保可追溯性
- Checkpoint 任务确保增量验证
- 属性测试验证通用正确性属性
- 单元测试验证特定示例和边界条件
