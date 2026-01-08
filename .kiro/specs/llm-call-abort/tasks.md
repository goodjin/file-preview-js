# Implementation Plan: LLM Call Abort Feature

## Overview

本实现计划将 LLM 调用中断功能分解为后端核心逻辑、API 层和前端 UI 三个主要部分，按依赖顺序逐步实现。

## Tasks

- [x] 1. 实现 LlmClient 中断支持
  - [x] 1.1 添加 _activeRequests Map 存储活跃的 AbortController
    - 在构造函数中初始化 `this._activeRequests = new Map()`
    - _Requirements: 4.1_
  - [x] 1.2 修改 chat() 方法支持 AbortController
    - 从 meta.agentId 获取智能体 ID
    - 创建 AbortController 并存入 _activeRequests
    - 将 signal 传递给 _chatWithRetry
    - 在 finally 块中清理 _activeRequests
    - _Requirements: 4.1, 4.2_
  - [x] 1.3 修改 _chatWithRetry() 方法接收 AbortSignal
    - 添加 signal 参数
    - 将 signal 传递给 OpenAI SDK 的 create() 调用
    - 处理 AbortError 异常
    - _Requirements: 4.2_
  - [x] 1.4 添加 abort(agentId) 方法
    - 从 _activeRequests 获取对应的 AbortController
    - 调用 controller.abort()
    - 从 _activeRequests 中删除
    - 返回是否成功中断
    - _Requirements: 4.2_
  - [x] 1.5 添加 hasActiveRequest(agentId) 方法
    - 检查 _activeRequests 是否包含指定 agentId
    - _Requirements: 4.5_
  - [x] 1.6 编写 LlmClient 中断功能单元测试
    - 测试 abort() 方法
    - 测试 hasActiveRequest() 方法
    - 测试 AbortController 生命周期
    - _Requirements: 4.1, 4.2_

- [x] 2. 实现 Runtime 中断方法
  - [x] 2.1 添加 abortAgentLlmCall(agentId) 方法
    - 验证 agentId 参数
    - 检查智能体是否存在
    - 检查当前 computeStatus 是否为 waiting_llm
    - 调用 llm.abort(agentId)
    - 设置 computeStatus 为 idle
    - 记录日志
    - 返回操作结果
    - _Requirements: 4.3, 4.4, 4.5, 5.1_
  - [x] 2.2 编写 Runtime.abortAgentLlmCall 单元测试
    - 测试智能体不存在的情况
    - 测试非 waiting_llm 状态的情况
    - 测试成功中断的情况
    - 测试无活跃调用的情况
    - _Requirements: 4.3, 4.5_
  - [x] 2.3 编写属性测试：中断后状态正确性
    - **Property 3: 中断后状态正确性**
    - **Validates: Requirements 4.3, 5.1**
  - [x] 2.4 编写属性测试：无活跃调用时的幂等性
    - **Property 4: 无活跃调用时的幂等性**
    - **Validates: Requirements 4.5**

- [x] 3. 实现 HTTP Server 中断 API
  - [x] 3.1 添加 /api/agent/:agentId/abort 路由
    - 在 _handleRequest 中添加路由匹配
    - 提取 agentId 参数
    - 调用 _handleAbortLlmCall 处理函数
    - _Requirements: 3.1_
  - [x] 3.2 实现 _handleAbortLlmCall 处理函数
    - 检查 society 和 runtime 是否初始化
    - 调用 runtime.abortAgentLlmCall(agentId)
    - 根据结果返回相应的 HTTP 状态码和响应
    - _Requirements: 3.2, 3.3, 3.4_
  - [x] 3.3 编写 HTTP Server 中断 API 单元测试
    - 测试成功中断响应
    - 测试智能体不存在返回 404
    - 测试 runtime 未初始化返回 500
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 3.4 编写属性测试：API 端点验证
    - **Property 6: API 端点验证**
    - **Validates: Requirements 3.2, 3.3**

- [x] 4. Checkpoint - 后端功能验证
  - 确保所有后端测试通过
  - 手动测试 API 端点
  - 如有问题请询问用户

- [x] 5. 实现前端 API 调用
  - [x] 5.1 在 API 模块添加 abortAgentLlmCall 方法
    - 发送 POST 请求到 /api/agent/:agentId/abort
    - 处理响应和错误
    - _Requirements: 2.1_

- [x] 6. 实现前端 UI
  - [x] 6.1 修改 Agent List 的 renderComputeStatus 方法
    - 在 waiting_llm 状态时渲染停止按钮
    - 添加 onclick 事件处理
    - 使用 event.stopPropagation() 防止触发行选择
    - _Requirements: 1.1, 1.2_
  - [x] 6.2 添加 abortLlmCall 方法
    - 调用 API.abortAgentLlmCall
    - 根据结果显示 Toast 提示
    - 处理错误情况
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 6.3 添加停止按钮 CSS 样式
    - 设置按钮背景色、边框、圆角
    - 添加 hover 和 active 状态样式
    - _Requirements: 1.3_
  - [x] 6.4 编写前端单元测试
    - 测试 renderComputeStatus 在不同状态下的输出
    - 测试 abortLlmCall 方法
    - _Requirements: 1.1, 1.2, 2.1_
  - [x] 6.5 编写属性测试：停止按钮可见性
    - **Property 1: 停止按钮可见性**
    - **Validates: Requirements 1.1, 1.2**

- [x] 7. Final Checkpoint - 完整功能验证
  - 确保所有测试通过
  - 手动测试完整流程：启动 LLM 调用 → 点击停止 → 验证中断
  - 如有问题请询问用户

## Notes

- All tasks are required for comprehensive testing
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
