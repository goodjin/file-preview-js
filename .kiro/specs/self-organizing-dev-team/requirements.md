# 需求文档

## 简介

本文档定义了基于现有自组织AI Agent社会系统构建"自组织编程团队"的需求。该团队由Root创建一个架构师智能体，架构师负责与用户沟通需求、设计系统架构、分解模块、安排程序员智能体进行开发。核心原则是：模块化、高内聚低耦合、每个代码文件不超过500行、每个模块只交给1个程序员、人员架构与代码架构温和对应。

本需求分为两部分：
1. **系统通用能力扩展**（需求9-11）：为系统核心添加文件访问和终端执行等通用能力，这些能力不针对编程场景，任何类型的任务都可能用到
2. **编程团队应用层**（需求1-8）：基于系统能力构建的编程团队demo，包含架构师和程序员的提示词模板，这部分在demo代码中实现

## 术语表

- **Architect_Agent**: 架构师智能体，由Root创建，负责与用户沟通需求、设计系统架构、分解模块、创建和管理程序员智能体
- **Programmer_Agent**: 程序员智能体，由架构师创建，每个程序员只负责一个子模块的开发
- **Module**: 模块，代码的逻辑单元，每个模块对应一个或多个文件，由单一程序员负责
- **Code_Artifact**: 代码工件，程序员产出的代码文件，通过工件系统存储和传递
- **Module_Spec**: 模块规格说明，架构师为每个模块编写的接口定义、输入输出规范、依赖关系说明
- **Integration_Plan**: 集成计划，架构师制定的模块组装顺序和集成测试方案
- **Task_Workspace**: 任务工作空间，用户指定的文件路径，该task内所有智能体只能在此路径下读写文件（系统通用能力）
- **Sandbox_Terminal**: 沙箱终端，智能体可以在工作空间内执行命令，用于测试和运行代码（系统通用能力）

---

## 第一部分：系统通用能力扩展

以下需求为系统核心添加通用能力，不针对编程场景。

### 需求 9: 任务工作空间与文件访问（系统能力）

**用户故事:** 作为任何类型的任务执行者，我希望能在指定的工作目录内读写文件，以便完成需要文件操作的任务。

#### 验收标准

1. WHEN 用户提交需求时，THE User SHALL 可以指定一个工作目录路径（workspacePath）
2. THE Runtime SHALL 将workspacePath与taskId绑定，该task内所有智能体共享此工作空间
3. THE Runtime SHALL 提供read_file工具，允许智能体读取工作空间内的文件
4. THE Runtime SHALL 提供write_file工具，允许智能体在工作空间内创建或修改文件
5. THE Runtime SHALL 提供list_files工具，允许智能体列出工作空间内的文件和目录结构
6. THE Runtime SHALL 确保所有文件操作只能在workspacePath范围内进行，禁止访问外部文件
7. THE Agent SHALL 使用相对路径访问文件，不感知绝对路径和外部文件结构
8. IF 智能体尝试访问工作空间外的路径，THEN THE Runtime SHALL 拒绝请求并返回错误

### 需求 10: 沙箱终端执行能力（系统能力）

**用户故事:** 作为任何类型的任务执行者，我希望能在工作空间内执行终端命令，以便完成需要命令行操作的任务。

#### 验收标准

1. THE Runtime SHALL 提供run_command工具，允许智能体在工作空间内执行终端命令
2. THE run_command工具 SHALL 将工作空间路径设为命令的当前工作目录
3. THE run_command工具 SHALL 返回命令的stdout、stderr和退出码
4. THE Runtime SHALL 对命令执行设置超时限制（默认60秒），防止无限阻塞
5. THE Runtime SHALL 限制可执行的命令类型，禁止危险命令（如rm -rf /、sudo等）
6. IF 命令执行超时或失败，THEN THE Runtime SHALL 返回错误信息供智能体处理
7. THE Runtime SHALL 记录所有命令执行的日志，包含命令内容、执行时间、结果

### 需求 11: 工作空间状态查询（系统能力）

**用户故事:** 作为任何类型的任务执行者，我希望能查询工作空间的状态信息，以便了解当前的文件结构和资源使用情况。

#### 验收标准

1. THE Runtime SHALL 提供get_workspace_info工具，返回工作空间的基本信息
2. THE get_workspace_info工具 SHALL 返回：文件数量、目录数量、总大小、最近修改时间
3. THE Runtime SHALL 在工作空间不存在时自动创建
4. IF 工作空间路径无效或无权限，THEN THE Runtime SHALL 返回明确的错误信息

---

## 第二部分：编程团队应用层

以下需求定义编程团队的行为规范，通过demo代码中的提示词模板实现。

## 需求

### 需求 1: 架构师岗位与智能体创建

**用户故事:** 作为用户，我希望Root能创建一个架构师智能体来负责整个编程项目，以便我只需与架构师沟通需求即可。

#### 验收标准

1. WHEN 用户提交编程需求时，THE Root_Agent SHALL 创建一个"架构师"岗位并在该岗位上创建一个架构师智能体实例
2. WHEN 架构师智能体被创建后，THE Root_Agent SHALL 将用户需求转发给架构师智能体
3. THE Architect_Agent SHALL 具备与用户直接沟通的能力（通过send_message to=user）
4. THE Architect_Agent SHALL 具备创建子岗位（程序员岗位）和子智能体（程序员智能体）的能力
5. WHEN 架构师需要澄清需求时，THE Architect_Agent SHALL 主动向用户提问并等待回复

### 需求 2: 需求分析与架构设计

**用户故事:** 作为用户，我希望架构师能理解我的需求并设计合理的系统架构，以便项目能够模块化、高内聚低耦合地实现。

#### 验收标准

1. WHEN 架构师收到用户需求后，THE Architect_Agent SHALL 分析需求并识别核心功能模块
2. THE Architect_Agent SHALL 设计系统架构，确保模块之间高内聚低耦合
3. THE Architect_Agent SHALL 将系统分解为多个子模块，每个子模块的代码量控制在500行以内
4. THE Architect_Agent SHALL 为每个模块编写Module_Spec，包含：模块名称、职责描述、接口定义、输入输出规范、依赖关系
5. THE Architect_Agent SHALL 使用put_artifact工具将架构设计文档和模块规格说明持久化为工件
6. WHEN 架构设计完成后，THE Architect_Agent SHALL 向用户汇报架构方案并征求确认

### 需求 3: 程序员岗位与智能体管理

**用户故事:** 作为架构师，我希望能为每个模块创建专属的程序员智能体，以便实现"一模块一程序员"的对应关系。

#### 验收标准

1. WHEN 架构设计确认后，THE Architect_Agent SHALL 为每个子模块创建一个程序员岗位
2. THE Architect_Agent SHALL 在每个程序员岗位上创建一个程序员智能体实例
3. THE Programmer_Agent SHALL 只负责其被分配的单一模块，不跨模块开发
4. THE Architect_Agent SHALL 向每个程序员智能体发送该模块的Module_Spec作为开发任务
5. WHEN 模块开发完成后，THE Programmer_Agent SHALL 向架构师汇报完成状态并提交代码工件
6. WHEN 程序员完成任务且无后续工作时，THE Architect_Agent SHALL 调用terminate_agent终止该程序员智能体

### 需求 4: 代码开发与质量控制

**用户故事:** 作为架构师，我希望程序员能按照规格说明开发高质量的代码，以便最终产出符合架构设计的系统。

#### 验收标准

1. THE Programmer_Agent SHALL 根据Module_Spec编写代码，确保代码符合接口定义
2. THE Programmer_Agent SHALL 确保单个代码文件不超过500行
3. IF 模块逻辑复杂需要超过500行，THEN THE Programmer_Agent SHALL 向架构师申请进一步拆分
4. THE Programmer_Agent SHALL 使用put_artifact工具将代码文件保存为工件
5. THE Programmer_Agent SHALL 在代码中添加必要的注释，说明模块职责和接口用法
6. WHEN 代码完成后，THE Programmer_Agent SHALL 进行自测并汇报测试结果

### 需求 5: 模块集成与交付

**用户故事:** 作为用户，我希望架构师能将所有模块集成为完整的系统并交付给我。

#### 验收标准

1. WHEN 所有程序员完成各自模块后，THE Architect_Agent SHALL 收集所有代码工件
2. THE Architect_Agent SHALL 按照Integration_Plan进行模块集成
3. THE Architect_Agent SHALL 验证模块之间的接口是否正确对接
4. IF 集成过程中发现问题，THEN THE Architect_Agent SHALL 创建新的程序员智能体进行修复
5. WHEN 集成完成后，THE Architect_Agent SHALL 将完整系统打包为工件并交付给用户
6. THE Architect_Agent SHALL 向用户提供系统说明文档，包含：模块结构、使用方法、扩展指南

### 需求 6: 层级化模块分解

**用户故事:** 作为架构师，我希望能支持多层级的模块分解，以便大型模块可以由子架构师进一步拆分。

#### 验收标准

1. IF 某个模块过于复杂（预估超过2000行），THEN THE Architect_Agent SHALL 创建一个子架构师岗位
2. THE Sub_Architect_Agent SHALL 负责将大模块进一步分解为更小的子模块
3. THE Sub_Architect_Agent SHALL 创建程序员智能体来开发其负责的子模块
4. THE Sub_Architect_Agent SHALL 向父架构师汇报进度和完成状态
5. WHEN 子架构师完成任务后，THE Architect_Agent SHALL 终止子架构师智能体

### 需求 7: 进度跟踪与状态汇报

**用户故事:** 作为用户，我希望能了解项目的开发进度，以便掌握项目状态。

#### 验收标准

1. THE Architect_Agent SHALL 维护一个项目状态工件，记录各模块的开发进度
2. WHEN 用户询问进度时，THE Architect_Agent SHALL 汇报当前状态：已完成模块、进行中模块、待开发模块
3. THE Architect_Agent SHALL 在关键节点（架构设计完成、模块开发完成、集成完成）主动向用户汇报
4. IF 开发过程中遇到阻塞问题，THEN THE Architect_Agent SHALL 及时向用户说明并寻求指导

### 需求 8: 架构师岗位提示词模板（应用层）

**用户故事:** 作为系统设计者，我希望有一个标准的架构师岗位提示词模板，以便Root能正确创建架构师智能体。

#### 验收标准

1. THE Demo_Code SHALL 定义标准化的架构师岗位提示词模板
2. THE Architect_Role_Prompt SHALL 包含：架构师职责、与用户沟通规范、模块分解原则、程序员管理规范
3. THE Architect_Role_Prompt SHALL 强调：模块化、高内聚低耦合、500行代码限制、一模块一程序员
4. THE Architect_Role_Prompt SHALL 包含：文件操作规范、进度汇报规范、智能体终止规范
5. THE Architect_Role_Prompt SHALL 包含：层级化分解的触发条件和执行方式
6. THE Demo_Code SHALL 定义程序员岗位提示词模板，包含：代码规范、测试要求、汇报规范
