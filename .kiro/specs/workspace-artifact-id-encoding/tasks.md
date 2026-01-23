# Implementation Plan: 工作区工件ID编码方案

## Overview

实现工件ID编码方案，使工件管理器能够识别和正确打开工作区文件。按照依赖关系和执行顺序，先开发编解码器，再修改工作区管理器，最后修改工件存储和工具执行器。

## Tasks

- [x] 1. 实现ArtifactIdCodec编解码器
  - [x] 1.1 创建artifact_id_codec.js文件
    - 实现isWorkspaceArtifact静态方法
    - 实现encode静态方法
    - 实现decode静态方法
    - 实现Base64编解码私有方法
    - _Requirements: 1.2, 1.3, 2.1, 3.1, 3.2_
  
  - [ ]* 1.2 编写ArtifactIdCodec单元测试
    - **Property 1: 工作区工件ID包含前缀标识符**
    - **Validates: Requirements 1.2**
  
  - [ ]* 1.3 编写round-trip属性测试
    - **Property 2: 工件ID编解码往返一致性**
    - **Validates: Requirements 1.3**
  
  - [ ]* 1.4 编写安全字符属性测试
    - **Property 3: 编码后的工件ID不包含文件系统特殊字符**
    - **Validates: Requirements 1.4**
  
  - [ ]* 1.5 编写类型识别属性测试
    - **Property 4: 工件类型识别正确性**
    - **Validates: Requirements 2.1**
  
  - [ ]* 1.6 编写错误处理属性测试
    - **Property 5: 无效格式返回解析错误**
    - **Validates: Requirements 3.3**

- [x] 2. 修改WorkspaceManager支持元数据和工件ID
  - [x] 2.1 修改writeFile方法
    - 添加mimeType必选参数验证
    - 调用_updateWorkspaceMeta更新元数据
    - 生成并返回工件ID
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [x] 2.2 实现_updateWorkspaceMeta方法
    - 读取或创建工作区元数据文件
    - 更新文件元信息（mimeType, modifiedBy数组）
    - 写入元数据文件
    - _Requirements: 5.1, 5.2_
  
  - [ ]* 2.3 编写WorkspaceManager集成测试
    - 测试writeFile返回工件ID
    - 测试元数据文件正确创建和更新
    - 测试modifiedBy数组记录修改历史
    - _Requirements: 5.1, 5.3_

- [x] 3. Checkpoint - 验证基础功能
  - 确保ArtifactIdCodec所有测试通过
  - 确保WorkspaceManager正确生成工件ID和元数据
  - 询问用户是否有问题

- [x] 4. 修改ToolExecutor的write_file工具
  - [x] 4.1 修改write_file工具定义
    - 添加mimeType必选参数到schema
    - 更新description说明MIME类型要求
    - _Requirements: 5.1_
  
  - [x] 4.2 修改_executeWriteFile方法
    - 验证mimeType参数
    - 传递mimeType和agentId到WorkspaceManager
    - 返回工件ID给智能体
    - _Requirements: 5.1, 5.3_
  
  - [ ]* 4.3 编写write_file工具集成测试
    - 测试缺少mimeType参数时返回错误
    - 测试正常写入返回工件ID
    - _Requirements: 5.1, 5.3_

- [x] 5. 修改ArtifactStore支持工作区工件
  - [x] 5.1 重构getArtifact方法
    - 添加工件类型判断逻辑
    - 调用_getWorkspaceArtifact或_getRegularArtifact
    - _Requirements: 2.1, 4.1, 4.2_
  
  - [x] 5.2 实现_getWorkspaceArtifact方法
    - 解码工件ID
    - 构建文件路径
    - 读取文件内容
    - 从元数据文件读取mimeType
    - 检测二进制类型
    - 返回标准工件对象格式
    - _Requirements: 3.1, 3.2, 4.2, 4.3_
  
  - [x] 5.3 重构_getRegularArtifact方法
    - 将现有getArtifact逻辑提取到此方法
    - _Requirements: 6.1, 6.3_
  
  - [ ]* 5.4 编写ArtifactStore集成测试
    - 测试读取工作区工件
    - 测试工件不存在返回null
    - 测试元数据正确返回
    - _Requirements: 4.1, 4.2, 4.4_
  
  - [ ]* 5.5 编写路径构建属性测试
    - **Property 6: 工作区工件路径构建正确性**
    - **Validates: Requirements 4.3**

- [x] 6. Checkpoint - 验证端到端流程
  - 确保所有单元测试和集成测试通过
  - 手动测试：使用write_file写入文件，验证返回工件ID
  - 手动测试：使用get_artifact读取工件，验证内容正确
  - 询问用户是否有问题

- [x] 7. 添加HTTP API支持（如需要）
  - [x] 7.1 添加/artifacts/:id/metadata端点
    - 支持工作区工件ID
    - 返回标准元数据格式
    - _Requirements: 4.1, 4.2_
  
  - [x] 7.2 添加/artifacts/:id端点支持
    - 支持工作区工件ID
    - 返回文件内容
    - _Requirements: 4.1, 4.2_

- [x] 8. 最终验证
  - 确保所有测试通过
  - 验证向后兼容性（现有工件ID仍正常工作）
  - 验证chat-panel能正确显示工作区工件
  - 询问用户是否有问题

## Notes

- 任务标记`*`为可选测试任务，可跳过以加快MVP开发
- 每个任务引用具体的需求编号以保证可追溯性
- Checkpoint任务确保增量验证
- 属性测试使用fast-check库，每个测试运行100+次迭代
- 单元测试验证具体示例和边界情况
