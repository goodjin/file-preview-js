# 实现计划：自组织编程团队

## 概述

本实现计划分为两部分：
1. **系统核心能力**（任务1-5）：在 Runtime 中添加文件访问和命令执行工具
2. **应用层 Demo**（任务6-7）：创建编程团队的 demo 代码

## 任务

- [x] 1. 实现 WorkspaceManager 组件
  - [x] 1.1 创建 src/platform/workspace_manager.js 文件
    - 实现 WorkspaceManager 类的基础结构
    - 实现 bindWorkspace 方法：绑定 taskId 与工作空间路径
    - 实现 getWorkspacePath 方法：获取任务的工作空间路径
    - 实现 _isPathSafe 方法：验证路径安全性，防止路径遍历攻击
    - _Requirements: 9.2, 9.6, 9.8_
  - [x] 1.2 实现文件操作方法
    - 实现 readFile 方法：读取工作空间内的文件
    - 实现 writeFile 方法：在工作空间内创建或修改文件
    - 实现 listFiles 方法：列出目录内容
    - 实现 getWorkspaceInfo 方法：获取工作空间状态信息
    - _Requirements: 9.3, 9.4, 9.5, 11.1, 11.2, 11.3_
  - [x] 1.3 编写 WorkspaceManager 属性测试
    - **Property 1: 路径安全验证**
    - **Property 2: 文件操作 Round-Trip**
    - **Property 4: 目录列表完整性**
    - **Validates: Requirements 9.3, 9.4, 9.5, 9.6, 9.8**

- [x] 2. 实现 CommandExecutor 组件
  - [x] 2.1 创建 src/platform/command_executor.js 文件
    - 实现 CommandExecutor 类的基础结构
    - 实现 _checkCommandSafety 方法：检查命令是否被禁止
    - 实现 execute 方法：在工作空间内执行命令
    - 实现超时控制逻辑
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  - [x] 2.2 编写 CommandExecutor 属性测试
    - **Property 5: 危险命令拦截**
    - **Property 6: 命令执行超时**
    - **Property 7: 命令结果完整性**
    - **Validates: Requirements 10.3, 10.4, 10.5, 10.6**

- [x] 3. 扩展 Runtime 添加新工具
  - [x] 3.1 在 Runtime 中集成 WorkspaceManager 和 CommandExecutor
    - 在 Runtime 构造函数中初始化 WorkspaceManager
    - 在 Runtime 构造函数中初始化 CommandExecutor
    - 添加 _taskWorkspaces Map 用于跟踪任务工作空间
    - _Requirements: 9.2_
  - [x] 3.2 添加文件操作工具定义
    - 在 getToolDefinitions 中添加 read_file 工具定义
    - 在 getToolDefinitions 中添加 write_file 工具定义
    - 在 getToolDefinitions 中添加 list_files 工具定义
    - 在 getToolDefinitions 中添加 get_workspace_info 工具定义
    - _Requirements: 9.3, 9.4, 9.5, 11.1_
  - [x] 3.3 添加命令执行工具定义
    - 在 getToolDefinitions 中添加 run_command 工具定义
    - _Requirements: 10.1_
  - [x] 3.4 实现工具执行逻辑
    - 在 executeToolCall 中添加 read_file 执行逻辑
    - 在 executeToolCall 中添加 write_file 执行逻辑
    - 在 executeToolCall 中添加 list_files 执行逻辑
    - 在 executeToolCall 中添加 run_command 执行逻辑
    - 在 executeToolCall 中添加 get_workspace_info 执行逻辑
    - 实现 taskId 到工作空间的映射查找
    - _Requirements: 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 11.1, 11.2_

- [x] 4. 扩展 AgentSociety 支持工作空间
  - [x] 4.1 修改 submitRequirement 方法
    - 添加 options 参数支持 workspacePath
    - 调用 WorkspaceManager.bindWorkspace 绑定工作空间
    - 返回结果中包含 workspacePath
    - _Requirements: 9.1, 9.2_
  - [x] 4.2 编写工作空间隔离属性测试
    - **Property 3: 工作空间隔离**
    - **Property 8: 工作空间自动创建**
    - **Property 9: 工作空间信息准确性**
    - **Validates: Requirements 9.2, 11.1, 11.2, 11.3**

- [x] 5. Checkpoint - 系统核心能力验证
  - 确保所有测试通过
  - 验证文件操作工具可用
  - 验证命令执行工具可用
  - 如有问题请向用户询问

- [x] 6. 创建编程团队 Demo
  - [x] 6.1 创建 demo/dev_team.js 文件
    - 定义架构师提示词模板 ARCHITECT_ROLE_PROMPT
    - 定义程序员提示词模板 PROGRAMMER_ROLE_PROMPT
    - 实现 buildDevTeamRequirement 函数
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  - [x] 6.2 实现 Demo 主函数
    - 解析命令行参数（工作空间路径、用户需求）
    - 初始化 AgentSociety
    - 调用 submitRequirement 并传入 workspacePath
    - 实现用户交互循环
    - _Requirements: 1.1, 1.2_

- [x] 7. 最终验收 - 端到端测试
  - 运行 demo/dev_team.js 进行端到端测试
  - 验证架构师能正确分解模块
  - 验证程序员能正确开发代码
  - 验证文件操作和命令执行正常工作
  - 如有问题请向用户询问

## 备注

- 所有任务都是必需的，确保完整的测试覆盖
- 每个任务都引用了具体的需求编号以便追溯
- 属性测试使用 fast-check 库，每个属性至少运行 100 次迭代
