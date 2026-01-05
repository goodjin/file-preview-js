# 实现计划: 自组织AI Agent社会系统优化

## 概述

本实现计划将设计文档中的优化方案转化为可执行的编码任务。采用增量开发方式，每个任务都建立在前一个任务的基础上，确保系统始终可运行。

## 任务

- [x] 1. 用户端点消息流转修复
  - [x] 1.1 重构 User_Endpoint 的消息处理逻辑
    - 修改 `src/platform/agent_society.js` 中的 `_registerUserEndpointAgent` 方法
    - 用户输入时直接发送到目标智能体，不经过自己的队列
    - 添加目标智能体ID验证（不能是"user"）
    - _需求: 1.1, 1.2, 1.4_
  - [x] 1.2 编写用户端点输入验证的属性测试
    - **Property 1: 用户端点输入验证**
    - **验证: 需求 1.1, 1.4**
  - [x] 1.3 编写消息流转正确性的属性测试
    - **Property 2: 用户端点消息流转正确性**
    - **验证: 需求 1.2**

- [x] 2. 检查点 - 确保用户端点修复后系统正常运行
  - 运行现有测试，确保没有回归
  - 手动测试 demo1.js 验证消息流转

- [x] 3. 智能体终止与回收功能
  - [x] 3.1 在 `src/platform/org_primitives.js` 中添加终止记录方法
    - 添加 `recordTermination(agentId, terminatedBy, reason)` 方法
    - 更新组织状态数据结构支持 terminations 数组
    - _需求: 3.3_
  - [x] 3.2 在 `src/platform/runtime.js` 中实现 terminate_agent 工具
    - 添加工具定义到 `getToolDefinitions()`
    - 实现 `executeTerminateAgent(ctx, args)` 方法
    - 包含权限验证（只能终止子智能体）
    - 清理会话上下文和智能体注册
    - _需求: 3.1, 3.2, 3.4_
  - [x] 3.3 实现终止前消息队列处理
    - 添加 `_drainAgentQueue(agentId)` 方法
    - 在终止前处理完待处理消息
    - _需求: 3.5_
  - [x] 3.4 编写智能体终止完整性的属性测试
    - **Property 6: 智能体终止完整性**
    - **验证: 需求 3.1, 3.2, 3.3**
  - [x] 3.5 编写智能体终止权限验证的属性测试
    - **Property 7: 智能体终止权限验证**
    - **验证: 需求 3.4**

- [x] 4. 检查点 - 确保终止功能正常工作
  - 运行所有测试
  - 验证终止后资源被正确清理

- [x] 5. 会话上下文管理
  - [x] 5.1 创建会话上下文管理器
    - 创建 `src/platform/conversation_manager.js`
    - 实现 `compress(agentId, summary, keepRecentCount)` 方法
    - 实现 `checkAndWarn(agentId)` 方法
    - _需求: 4.2, 4.3_
  - [x] 5.2 在 Runtime 中集成会话上下文管理器
    - 修改 `src/platform/runtime.js` 使用 ConversationManager
    - 添加 compress_context 工具定义和执行逻辑
    - 在消息处理后检查上下文长度并发出警告
    - _需求: 4.1, 4.3_
  - [x] 5.3 编写上下文压缩保留性的属性测试
    - **Property 9: 上下文压缩保留性**
    - **验证: 需求 4.2**

- [x] 6. 检查点 - 确保上下文管理功能正常
  - 运行所有测试
  - 验证压缩后上下文内容正确

- [x] 7. 错误恢复与容错
  - [x] 7.1 实现 LLM 调用重试逻辑
    - 修改 `src/platform/llm_client.js` 添加重试支持
    - 实现指数退避策略（2^n秒延迟，最多3次）
    - _需求: 5.1_
  - [x] 7.2 实现智能体错误隔离
    - 修改 `src/platform/runtime.js` 的消息处理循环
    - 捕获单个智能体的异常，记录日志后继续处理其他智能体
    - _需求: 5.2_
  - [x] 7.3 实现工具调用轮次超限通知
    - 当超过 maxToolRounds 时向父智能体发送错误通知
    - _需求: 5.3_
  - [x] 7.4 编写 LLM 调用重试行为的属性测试
    - **Property 11: LLM调用重试行为**
    - **验证: 需求 5.1**
  - [x] 7.5 编写智能体错误隔离的属性测试
    - **Property 12: 智能体错误隔离**
    - **验证: 需求 5.2**

- [x] 8. 检查点 - 确保错误恢复功能正常
  - 运行所有测试
  - 模拟 LLM 失败验证重试行为

- [x] 9. 可观测性增强
  - [x] 9.1 增强日志记录
    - 在 `src/platform/logger.js` 中添加结构化日志支持
    - 记录智能体生命周期事件
    - 记录 LLM 调用指标（延迟、token数量）
    - _需求: 6.1, 6.2_
  - [x] 9.2 添加运行时状态查询方法
    - 在 Runtime 中添加 `getAgentStatus(agentId)` 方法
    - 添加 `getQueueDepths()` 方法
    - _需求: 6.3, 6.4_
  - [x] 9.3 实现空闲警告
    - 跟踪智能体最后活动时间
    - 超过配置时长时发出警告
    - _需求: 6.5_

- [x] 10. 组织状态一致性增强
  - [x] 10.1 增强组织状态持久化
    - 修改 `src/platform/org_primitives.js`
    - 确保创建操作的原子性
    - 添加数据结构验证
    - _需求: 7.1, 7.2_
  - [x] 10.2 添加状态损坏恢复逻辑
    - 检测损坏状态并记录错误
    - 以空状态启动
    - _需求: 7.3_
  - [x] 10.3 添加调试查询方法
    - 实现 `listRoles()` 和 `listAgents()` 方法
    - _需求: 7.4_
  - [x] 10.4 编写组织状态持久化一致性的属性测试
    - **Property 13: 组织状态持久化一致性**
    - **验证: 需求 7.1, 7.2**

- [x] 11. 检查点 - 确保可观测性和状态一致性功能正常
  - 运行所有测试
  - 验证日志输出和状态查询

- [x] 12. HTTP 服务支持
  - [x] 12.1 创建 HTTP 服务器组件
    - 创建 `src/platform/http_server.js`
    - 实现 POST /api/submit 端点
    - 实现 POST /api/send 端点
    - 实现 GET /api/messages/:taskId 端点
    - 实现 GET /api/agents 端点
    - _需求: 2.1, 2.2, 2.3, 2.4, 2.6_
  - [x] 12.2 集成 HTTP 服务器到 AgentSociety
    - 修改 `src/platform/agent_society.js`
    - 在 init() 中启动 HTTP 服务器
    - 处理启动失败的情况
    - _需求: 2.5_
  - [x] 12.3 编写 HTTP API 消息转发一致性的属性测试
    - **Property 4: HTTP API消息转发一致性**
    - **验证: 需求 2.2, 2.3**
  - [x] 12.4 编写 HTTP 消息查询完整性的属性测试
    - **Property 5: HTTP消息查询完整性**
    - **验证: 需求 2.4**

- [x] 13. 优雅关闭
  - [x] 13.1 实现信号处理
    - 修改 `src/platform/runtime.js`
    - 添加 SIGINT/SIGTERM 信号处理
    - 实现 `setupGracefulShutdown()` 方法
    - _需求: 8.1_
  - [x] 13.2 实现关闭流程
    - 停止接收新消息
    - 等待当前处理完成（最多30秒）
    - 持久化状态
    - 关闭 HTTP 服务器
    - 记录关闭摘要
    - _需求: 8.2, 8.3, 8.4_
  - [x] 13.3 编写优雅关闭完整性的属性测试
    - **Property 14: 优雅关闭完整性**
    - **验证: 需求 8.1, 8.2, 8.3, 8.4**

- [x] 14. 更新提示词模板
  - [x] 14.1 更新根智能体提示词
    - 修改 `config/prompts/root.txt`
    - 添加 terminate_agent 工具的使用指导
    - _需求: 3.1_
  - [x] 14.2 更新基础提示词
    - 修改 `config/prompts/base.txt`
    - 添加上下文管理指导（职责分担、业务分流、历史压缩）
    - 添加 compress_context 工具的使用指导
    - _需求: 4.4, 4.5, 4.6, 4.7_

- [x] 15. 最终检查点 - 全面验证
  - 运行所有测试确保通过
  - 运行 demo1.js 和 demo2.js 验证功能
  - 验证 HTTP 服务正常工作
  - 验证优雅关闭功能

## 备注

- 所有任务均已完成
- 每个检查点确保增量开发的稳定性
- 属性测试使用 fast-check 库，每个属性至少运行100次迭代
