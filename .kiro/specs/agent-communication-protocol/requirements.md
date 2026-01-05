# Requirements Document

## Introduction

本规范定义了智能体社会中的通信协议改进，解决当前系统中智能体之间信息传递不充分的问题。核心问题是：父智能体创建子智能体时，没有充分传递任务上下文（如技术约束、目标要求），导致子智能体做出错误的技术选择。

本规范引入"介绍式通信"机制，模拟真实企业中的协作模式：
1. 智能体之间不能天然感知彼此，需要通过已知智能体介绍
2. 创建子智能体时必须提供完整的任务委托书（Task Brief）
3. 跨部门协作需要通过上级确认并获取联系方式
4. 支持单方面认识和主动发起对话

## Glossary

- **Agent_Society**: 智能体社会系统，管理所有智能体的生命周期和通信
- **Task_Brief**: 任务委托书，父智能体创建子智能体时必须提供的结构化任务说明
- **Contact_Registry**: 联系人注册表，每个智能体维护的已知联系人列表
- **Introduction_Request**: 介绍请求，智能体向上级请求获取其他智能体联系方式的消息
- **Introduction_Response**: 介绍响应，上级提供目标智能体联系方式和接口说明的消息
- **Interface_Spec**: 接口规格说明，描述智能体对外提供的服务和调用方式
- **Communication_Channel**: 通信通道，两个智能体之间建立的消息传递路径
- **Parent_Agent**: 父智能体，创建并管理子智能体的智能体
- **Child_Agent**: 子智能体，由父智能体创建并接受其管理的智能体
- **Peer_Agent**: 同级智能体，具有相同父智能体的智能体

## Requirements

### Requirement 1: 任务委托书（Task Brief）

**User Story:** As a 父智能体, I want to 在创建子智能体时提供完整的任务委托书, so that 子智能体能够准确理解任务目标和约束条件。

#### Acceptance Criteria

1. WHEN 父智能体调用 spawn_agent 创建子智能体 THEN Agent_Society SHALL 要求提供 Task_Brief 参数
2. THE Task_Brief SHALL 包含以下必填字段：目标描述（objective）、技术约束（constraints）、输入说明（inputs）、输出要求（outputs）、完成标准（completion_criteria）
3. THE Task_Brief MAY 包含以下可选字段：协作联系人（collaborators）、参考资料（references）、优先级（priority）
4. WHEN Task_Brief 缺少必填字段 THEN Agent_Society SHALL 返回错误并拒绝创建子智能体
5. WHEN 子智能体被创建 THEN Agent_Society SHALL 将 Task_Brief 内容注入子智能体的初始上下文

### Requirement 2: 联系人注册表（Contact Registry）

**User Story:** As a 智能体, I want to 维护一个已知联系人列表, so that 我只能与已知的智能体进行通信。

#### Acceptance Criteria

1. WHEN 智能体被创建 THEN Agent_Society SHALL 为其初始化一个 Contact_Registry
2. THE Contact_Registry SHALL 自动包含：创建者（父智能体）
3. IF 智能体是 root THEN Contact_Registry SHALL 仅包含 user 端点
4. IF 智能体是 user THEN Contact_Registry SHALL 仅包含 root 端点
5. WHEN 父智能体创建子智能体 THEN Agent_Society SHALL 自动将子智能体添加到父智能体的 Contact_Registry
6. WHEN 智能体尝试向未在 Contact_Registry 中的目标发送消息 THEN Agent_Society SHALL 拒绝发送并返回 unknown_contact 错误
7. THE Contact_Registry 条目 SHALL 包含：智能体ID、角色名称、接口说明（Interface_Spec，如有）、介绍来源
8. WHEN 父智能体在 Task_Brief 中指定 collaborators THEN Agent_Society SHALL 将这些联系人添加到子智能体的 Contact_Registry

### Requirement 3: 介绍式通信机制

**User Story:** As a 智能体, I want to 通过已认识的智能体获取其他智能体的联系方式, so that 我可以与需要协作的智能体建立通信。

#### Acceptance Criteria

1. WHEN 智能体需要超出自己职能范围的支持 THEN 该智能体 SHALL 向父智能体或任意已认识的智能体发送 Introduction_Request
2. THE Introduction_Request SHALL 包含：请求原因（reason）、所需能力描述（required_capability）
3. WHEN 智能体收到 Introduction_Request THEN 该智能体 SHALL 评估自己是否认识符合条件的智能体
4. IF 介绍人认识符合条件的智能体 THEN 介绍人 SHALL 发送 Introduction_Response 包含目标智能体的联系信息和 Interface_Spec
5. IF 介绍人不认识符合条件的智能体 THEN 介绍人 MAY 向自己认识的其他智能体（包括父智能体或子智能体）询问
6. WHEN 介绍人向其他智能体询问后获得答复 THEN 介绍人 SHALL 将答复转发给原请求者
7. WHEN 智能体收到 Introduction_Response THEN Agent_Society SHALL 自动将目标智能体添加到请求者的 Contact_Registry
8. THE Introduction_Response SHALL 包含：目标智能体ID、角色名称、Interface_Spec、使用建议

### Requirement 4: 接口规格说明（Interface Spec）

**User Story:** As a 智能体, I want to 了解其他智能体提供的服务接口, so that 我可以正确地与其协作而无需阅读其内部实现。

#### Acceptance Criteria

1. WHEN 创建岗位（Role）THEN create_role SHALL 支持可选的 interface_spec 参数
2. THE Interface_Spec SHALL 包含：服务描述（services）、输入格式（input_format）、输出格式（output_format）、使用示例（examples）
3. WHEN 智能体被介绍给另一个智能体 THEN 介绍信息 SHALL 包含目标智能体的 Interface_Spec
4. WHEN 智能体向另一个智能体发送请求 THEN 发送者 SHOULD 遵循目标智能体的 Interface_Spec 格式

### Requirement 5: 单方面认识与主动发起对话

**User Story:** As a 智能体, I want to 在被介绍后主动发起对话, so that 我可以在需要时请求协作而无需等待对方先联系我。

#### Acceptance Criteria

1. WHEN 智能体A被介绍给智能体B THEN 智能体A SHALL 能够主动向智能体B发送消息
2. WHEN 智能体A向智能体B发送首次消息 THEN Agent_Society SHALL 自动将智能体A添加到智能体B的 Contact_Registry（单方面认识变为双向认识）
3. THE 首次消息 SHALL 包含发送者的自我介绍（角色、职责、联系原因）
4. WHEN 智能体B收到来自新联系人的消息 THEN 智能体B MAY 选择回复或仅处理请求
5. THE 消息 SHALL 明确包含发送者ID（from字段），以便接收方知道如何回复
6. WHEN 智能体B需要回复 THEN 智能体B SHALL 使用消息中的 from 字段作为回复目标
7. IF 智能体B不需要记录发送者 THEN 智能体B MAY 仅回复而不主动建立长期联系

### Requirement 6: 提示词模板增强

**User Story:** As a 系统管理员, I want to 更新提示词模板以支持新的通信协议, so that 智能体能够正确执行介绍式通信。

#### Acceptance Criteria

1. THE root.txt 提示词 SHALL 包含关于 Task_Brief 必填字段的说明
2. THE base.txt 提示词 SHALL 包含关于 Contact_Registry 和介绍式通信的说明
3. WHEN 创建子智能体 THEN 父智能体的提示词 SHALL 指导其提供完整的 Task_Brief
4. THE 提示词 SHALL 说明如何请求介绍和如何响应介绍请求
5. THE 提示词 SHALL 强调技术约束（如"静态网页"、"Python"等）必须明确传递给子智能体

### Requirement 7: 协作联系人预设

**User Story:** As a 父智能体, I want to 在创建子智能体时预设其协作联系人, so that 子智能体可以直接与相关智能体协作而无需额外请求介绍。

#### Acceptance Criteria

1. THE Task_Brief 的 collaborators 字段 SHALL 支持预设协作联系人列表
2. WHEN Task_Brief 包含 collaborators THEN Agent_Society SHALL 在创建子智能体时自动将这些联系人添加到其 Contact_Registry
3. EACH collaborator 条目 SHALL 包含：智能体ID、角色描述、协作说明、Interface_Spec（如有）
4. WHEN 子智能体需要与预设协作者通信 THEN 子智能体 SHALL 能够直接发送消息而无需请求介绍
5. THE 父智能体 MAY 在岗位提示词（rolePrompt）中描述哪些业务需要找谁，并写入对应智能体ID
6. WHEN 父智能体创建岗位 THEN rolePrompt MAY 包含协作指引，说明特定业务应联系的智能体

### Requirement 8: 消息格式规范化

**User Story:** As a 智能体, I want to 使用规范化的消息格式进行通信, so that 接收方能够准确理解消息意图和内容。

#### Acceptance Criteria

1. THE send_message payload SHALL 支持 message_type 字段，可选值包括：task_assignment、status_report、introduction_request、introduction_response、collaboration_request、collaboration_response
2. WHEN message_type 为 task_assignment THEN payload SHALL 包含 Task_Brief 结构
3. WHEN message_type 为 introduction_request THEN payload SHALL 包含 reason 和 required_capability 字段
4. WHEN message_type 为 introduction_response THEN payload SHALL 包含目标智能体信息和 Interface_Spec
5. THE Agent_Society SHALL 验证消息格式符合 message_type 的要求

### Requirement 9: 消息来源标识

**User Story:** As a 消息接收者, I want to 明确知道消息来自谁, so that 我可以决定是否需要向发送者发送消息。

#### Acceptance Criteria

1. THE Agent_Society SHALL 自动为每条消息填充 from 字段，标识发送者智能体ID
2. WHEN 消息投递给智能体 THEN Agent_Society SHALL 将消息格式化为包含来源信息的格式
3. THE 格式化消息 SHALL 包含：发送者标识、发送者角色（如已知）、消息内容
4. WHEN 智能体需要向发送者发送消息 THEN 智能体 SHALL 使用 send_message 工具并指定 to 为发送者ID
5. THE 智能体 SHALL NOT 需要在 send_message 中手动指定 from 字段，系统自动填充


### Requirement 10: 消息呈现格式

**User Story:** As a 智能体, I want to 收到的消息有清晰的来源标识, so that 我能立即知道消息来自谁并决定如何处理。

#### Acceptance Criteria

1. WHEN Agent_Society 向智能体投递消息 THEN 消息 SHALL 以结构化格式呈现给智能体
2. THE 消息呈现格式 SHALL 包含：来源标识行、消息内容、回复提示（如需要）
3. THE 来源标识行 SHALL 格式为："【来自 {发送者角色名}（{发送者ID}）的消息】"
4. IF 发送者是 user THEN 来源标识行 SHALL 格式为："【来自用户的消息】"
5. THE 回复提示 SHALL 格式为："如需回复，请使用 send_message(to='{发送者ID}', ...)"
6. WHEN 智能体的提示词被构建 THEN Agent_Society SHALL 将消息按此格式注入上下文
