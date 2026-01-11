# 实现计划：工具组管理

## 概述

本实现计划将工具函数分组管理功能分解为可执行的编码任务。采用增量开发方式，每个任务都建立在前一个任务的基础上。

## 任务

- [x] 1. 创建 ToolGroupManager 核心类
  - [x] 1.1 创建 `src/platform/tool_group_manager.js` 文件
    - 实现 `ToolGroupManager` 类基础结构
    - 实现 `registerGroup()` 方法
    - 实现 `unregisterGroup()` 方法
    - 实现 `getToolDefinitions()` 方法
    - 实现 `listGroups()` 方法
    - 实现 `getToolGroup()` 方法
    - 实现 `isToolInGroups()` 方法
    - 实现 `getAllGroupIds()` 方法
    - 实现保留标识符检查逻辑
    - _需求: 1.1, 1.2, 1.4, 2.3, 5.1, 5.2, 5.3, 5.4_

  - [x] 1.2 编写 ToolGroupManager 属性测试
    - **属性 1: 工具组注册一致性**
    - **属性 2: 工具组注销完整性**
    - **属性 3: 保留标识符冲突检测**
    - **属性 6: 工具组查询完整性**
    - **验证: 需求 1.1, 1.2, 1.4, 1.5, 2.3, 5.1-5.4**

- [x] 2. 定义内置工具组
  - [x] 2.1 在 ToolGroupManager 中定义内置工具组常量
    - 定义 `BUILTIN_TOOL_GROUPS` 对象
    - 包含 org_management、artifact、workspace、command、network、context、console 七个工具组
    - 每个工具组包含 description 和 tools 数组
    - _需求: 2.1_

  - [x] 2.2 实现内置工具组自动注册
    - 在 ToolGroupManager 构造函数中注册内置工具组
    - 将内置工具组标识符添加到保留名称集合
    - _需求: 2.2, 2.3_

- [x] 3. 检查点 - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户

- [-] 4. 集成 Runtime
  - [x] 4.1 在 Runtime 中初始化 ToolGroupManager
    - 在 Runtime 构造函数中创建 ToolGroupManager 实例
    - 在 `init()` 方法中调用内置工具组注册
    - _需求: 2.2_

  - [x] 4.2 重构 `getToolDefinitions()` 方法
    - 将现有工具定义按工具组分类
    - 从 ToolGroupManager 获取工具定义
    - _需求: 4.1_

  - [x] 4.3 实现 `getToolDefinitionsForAgent()` 方法
    - 根据智能体岗位配置获取工具定义
    - root 岗位硬编码返回 org_management 工具组
    - 未配置 toolGroups 的岗位返回全部工具组
    - _需求: 3.2, 3.3, 4.1, 4.2_

  - [x] 4.4 编写工具定义构建属性测试
    - **属性 4: 工具定义构建正确性**
    - **属性 8: 默认工具组行为**
    - **验证: 需求 3.3, 4.1, 4.2**

- [x] 5. 实现工具调用权限检查
  - [x] 5.1 修改 `executeToolCall()` 方法
    - 在执行工具调用前检查权限
    - 使用 `isToolInGroups()` 验证工具是否可用
    - 返回包含工具名称的错误消息
    - _需求: 4.3, 4.4_
    - **注意: 已在 Runtime 中实现 isToolAvailableForAgent() 方法**

  - [x] 5.2 编写未授权工具调用属性测试
    - **属性 5: 未授权工具调用拒绝**
    - **验证: 需求 4.3, 4.4**

- [x] 6. 检查点 - 确保所有测试通过
  - 21 个测试全部通过

- [x] 7. 扩展岗位数据结构
  - [x] 7.1 修改 OrgPrimitives 支持 toolGroups
    - 在 `createRole()` 方法中接受 toolGroups 参数
    - 在岗位元数据中存储 toolGroups
    - 在 `updateRole()` 方法中支持更新 toolGroups
    - 更新 validateRole 函数验证 toolGroups 字段
    - _需求: 3.1, 3.4_

  - [x] 7.2 修改 create_role 工具定义
    - 添加 toolGroups 参数到工具定义（runtime.js 和 tool_executor.js）
    - 更新参数描述
    - 更新 _executeCreateRole 传递 toolGroups 参数
    - _需求: 3.1_

  - [x] 7.3 编写岗位工具组持久化属性测试
    - **属性 7: 岗位工具组持久化**
    - 5 个测试全部通过
    - **验证: 需求 3.4**

- [x] 8. 集成模块加载器
  - [x] 8.1 修改 ModuleLoader 注册模块工具组
    - 在模块加载时向 ToolGroupManager 注册工具组
    - 使用模块的 toolGroupId 或模块名作为工具组标识符
    - 使用模块的 toolGroupDescription 或默认描述
    - 添加 _moduleToolGroupIds Map 跟踪模块工具组
    - _需求: 1.3_

  - [x] 8.2 修改 ModuleLoader 注销模块工具组
    - 在模块卸载时从 ToolGroupManager 注销工具组
    - 添加 getModuleToolGroupId() 和 getAllModuleToolGroupIds() 方法
    - _需求: 1.5_

  - [x] 8.3 更新 Chrome 模块添加工具组信息
    - 添加 toolGroupId: "chrome"
    - 添加 toolGroupDescription
    - _需求: 1.1, 1.2_

- [x] 9. 检查点 - 确保所有测试通过
  - 33 个相关测试全部通过

- [x] 10. 实现用户界面
  - [x] 10.1 添加工具组查询 API
    - 在 HTTP 服务器中添加 `/api/tool-groups` 端点
    - 返回所有可用工具组列表
    - _需求: 6.2_

  - [x] 10.2 修改岗位属性 API
    - 在获取岗位信息时包含 toolGroups
    - 添加 `/api/role/:roleId/tool-groups` 端点支持修改 toolGroups
    - _需求: 6.1, 6.3, 6.4_

  - [x] 10.3 更新岗位属性界面
    - 显示当前配置的工具组
    - 显示可用工具组供选择（复选框）
    - 显示每个工具组包含的工具数量
    - 添加保存功能
    - _需求: 6.1, 6.2, 6.5_

  - [x] 10.4 添加清空工具组提示
    - 当用户清空所有工具组时显示提示
    - 说明将使用默认的全部工具组
    - _需求: 6.6_

- [x] 11. 最终检查点 - 确保所有测试通过
  - 26 个测试全部通过

## 备注

- 每个任务都引用了具体的需求以便追溯
- 检查点确保增量验证
- 属性测试验证通用正确性属性
