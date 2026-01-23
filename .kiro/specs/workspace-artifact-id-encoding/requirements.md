# Requirements Document

## Introduction

当前系统中，智能体通过write_file工具向工作区写入文件时，生成的工件ID无法被工件管理器正确定位，因为工件管理器在artifacts目录中查找，而文件实际保存在workspaces目录中。本需求旨在实现一个工件ID编码方案，使工件管理器能够识别并正确打开工作区文件。

## Glossary

- **Artifact**: 工件，系统中由智能体生成的文件或内容
- **Artifact_ID**: 工件ID，用于唯一标识工件的字符串
- **Workspace**: 工作区，智能体的工作目录，路径为 `{dataRoot}/workspaces/{workspaceId}/`，其中dataRoot是可配置的数据根目录
- **Artifact_Storage**: 工件存储目录，路径为 `{dataRoot}/artifacts/`
- **Artifact_Manager**: 工件管理器，负责管理和打开工件的模块
- **ID_Generator**: ID生成器，负责生成单调递增的数字ID
- **Write_File_Tool**: 文件写入工具，智能体用于向工作区写入文件的工具
- **Workspace_Artifact**: 工作区工件，保存在工作区目录中的工件
- **Regular_Artifact**: 普通工件，保存在工件存储目录中的工件

## Requirements

### Requirement 1: 工件ID编码格式

**User Story:** 作为系统开发者，我希望工件ID能够编码工件类型和位置信息，以便工件管理器能够正确定位文件。

#### Acceptance Criteria

1. WHEN 生成普通工件ID时，THE ID_Generator SHALL 生成单调递增的数字字符串
2. WHEN 生成工作区工件ID时，THE System SHALL 使用前缀标识符区分工作区工件
3. THE Workspace_Artifact ID SHALL 包含工作区ID和文件相对路径信息
4. THE Artifact_ID SHALL 是有效的字符串且不包含导致文件系统问题的特殊字符
5. WHERE 工件ID包含路径信息，THE System SHALL 对路径进行编码以避免特殊字符冲突

### Requirement 2: 工件ID识别

**User Story:** 作为工件管理器，我需要识别工件ID的类型，以便采用正确的方式打开工件。

#### Acceptance Criteria

1. WHEN 接收到工件ID时，THE Artifact_Manager SHALL 判断该ID是工作区工件还是普通工件
2. WHEN 工件ID以特定前缀开始时，THE Artifact_Manager SHALL 识别为工作区工件
3. WHEN 工件ID不包含特定前缀时，THE Artifact_Manager SHALL 识别为普通工件
4. THE Artifact_Manager SHALL 提供统一的接口用于判断工件类型

### Requirement 3: 工作区工件ID解析

**User Story:** 作为工件管理器，我需要从工作区工件ID中解析出工作区ID和文件路径，以便正确定位文件。

#### Acceptance Criteria

1. WHEN 解析工作区工件ID时，THE Artifact_Manager SHALL 提取工作区ID
2. WHEN 解析工作区工件ID时，THE Artifact_Manager SHALL 提取文件相对路径
3. IF 工件ID格式无效，THEN THE Artifact_Manager SHALL 返回解析错误
4. THE Artifact_Manager SHALL 对编码的路径进行解码以恢复原始路径

### Requirement 4: 工件文件定位

**User Story:** 作为工件管理器，我需要根据工件ID定位到实际的文件路径，以便读取或操作文件。

#### Acceptance Criteria

1. WHEN 打开普通工件时，THE Artifact_Manager SHALL 在Artifact_Storage目录中查找文件
2. WHEN 打开工作区工件时，THE Artifact_Manager SHALL 在对应的Workspace目录中查找文件
3. WHEN 构建工作区工件路径时，THE Artifact_Manager SHALL 组合工作区根目录、工作区ID和文件相对路径
4. IF 文件不存在，THEN THE Artifact_Manager SHALL 返回友好的错误信息

### Requirement 5: 工件ID生成集成

**User Story:** 作为文件写入工具，我需要在写入工作区文件时生成正确的工件ID，以便工件管理器能够追踪这些文件。

#### Acceptance Criteria

1. WHEN Write_File_Tool写入工作区文件时，THE System SHALL 生成工作区工件ID
2. WHEN 生成工作区工件ID时，THE System SHALL 使用当前工作区ID和文件相对路径
3. THE Write_File_Tool SHALL 将生成的工件ID反馈给工件管理器
4. THE System SHALL 保持普通工件ID生成机制不变

### Requirement 6: 向后兼容性

**User Story:** 作为系统维护者，我希望新的编码方案不影响现有的普通工件，以便系统平滑升级。

#### Acceptance Criteria

1. WHEN 处理现有的数字工件ID时，THE Artifact_Manager SHALL 按照普通工件处理
2. THE System SHALL 保持ID_Generator的现有行为不变
3. WHEN 系统升级后，THE System SHALL 正确处理升级前创建的所有工件
4. THE System SHALL 不修改或迁移现有的工件ID
