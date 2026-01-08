# Requirements Document

## Introduction

本功能为智能体社会系统添加大模型调用中断机制。当智能体正在执行大模型调用时，用户可以通过页面上的停止按钮立即中断该调用，避免长时间等待或资源浪费。

## Glossary

- **LLM_Client**: 大模型客户端，负责与 OpenAI 兼容接口通信的组件
- **Agent_List**: 智能体列表组件，显示所有智能体及其状态
- **Compute_Status**: 智能体运算状态，包括 idle（空闲）、waiting_llm（等待大模型响应）、processing（处理中）
- **Abort_Controller**: 浏览器/Node.js 原生的请求中断控制器
- **HTTP_Server**: HTTP 服务器组件，提供 REST API 接口
- **Runtime**: 运行时组件，管理智能体消息循环和 LLM 调用

## Requirements

### Requirement 1: 显示停止按钮

**User Story:** As a user, I want to see a stop button on agents that are calling LLM, so that I can identify which agents can be interrupted.

#### Acceptance Criteria

1. WHILE an agent's computeStatus is 'waiting_llm', THE Agent_List SHALL display a stop button next to the agent's compute status indicator
2. WHEN an agent's computeStatus changes from 'waiting_llm' to another status, THE Agent_List SHALL hide the stop button
3. THE stop button SHALL be visually distinct and easily clickable without interfering with other agent list interactions

### Requirement 2: 前端中断请求

**User Story:** As a user, I want to click the stop button to abort an LLM call, so that I can immediately stop a long-running request.

#### Acceptance Criteria

1. WHEN a user clicks the stop button, THE Agent_List SHALL call the abort API endpoint with the agent ID
2. WHEN the abort API call succeeds, THE Agent_List SHALL update the agent's compute status display
3. IF the abort API call fails, THEN THE Agent_List SHALL display an error notification to the user

### Requirement 3: 后端中断 API

**User Story:** As a system, I want to provide an API endpoint to abort LLM calls, so that the frontend can trigger interruption.

#### Acceptance Criteria

1. THE HTTP_Server SHALL provide a POST /api/agent/:agentId/abort endpoint
2. WHEN the abort endpoint is called, THE HTTP_Server SHALL validate that the agent exists
3. IF the agent does not exist, THEN THE HTTP_Server SHALL return a 404 error response
4. WHEN the abort endpoint is called for a valid agent, THE HTTP_Server SHALL trigger the abort mechanism in Runtime

### Requirement 4: LLM 调用中断机制

**User Story:** As a system, I want to abort ongoing LLM requests, so that resources are released immediately when user requests interruption.

#### Acceptance Criteria

1. THE LLM_Client SHALL support AbortController for request cancellation
2. WHEN an abort signal is received, THE LLM_Client SHALL immediately cancel the pending HTTP request
3. WHEN an LLM call is aborted, THE Runtime SHALL set the agent's computeStatus to 'idle'
4. WHEN an LLM call is aborted, THE Runtime SHALL log the abort event with agent ID and reason
5. IF an abort is requested but no LLM call is in progress, THEN THE Runtime SHALL return a no-op success response

### Requirement 5: 中断后状态恢复

**User Story:** As a user, I want the system to properly recover after an abort, so that the agent can continue to receive new messages.

#### Acceptance Criteria

1. WHEN an LLM call is aborted, THE Runtime SHALL ensure the agent remains in a valid state to receive new messages
2. WHEN an LLM call is aborted, THE Runtime SHALL NOT corrupt the agent's conversation history
3. WHEN an LLM call is aborted mid-response, THE Runtime SHALL discard any partial response data
