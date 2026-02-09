# Git版本控制管理文档

## 1. 分支策略

### 1.1 分支结构

```
main (主分支)
├── dev (开发分支)
│   ├── feature/pdf-parser (功能分支)
│   ├── feature/word-parser (功能分支)
│   ├── feature/excel-parser (功能分支)
│   ├── fix/buffer-overflow (修复分支)
│   └── ...
```

### 1.2 分支类型说明

#### main（主分支）
- **用途**：稳定发布版本
- **保护级别**：受保护，禁止直接push
- **合并来源**：仅从dev分支合并
- **状态**：始终处于可发布状态
- **标记**：每次合并后打版本标签（如v1.0.0）

#### dev（开发分支）
- **用途**：开发过程中的集成分支
- **保护级别**：受保护，需要代码审查
- **合并来源**：feature分支、fix分支
- **状态**：可能存在未完成的代码
- **更新**：定期从main分支同步

#### feature（功能分支）
- **命名规范**：`feature/功能描述`
- **用途**：开发新功能或新模块
- **创建来源**：从dev分支创建
- **合并目标**：dev分支
- **示例**：
  - `feature/pdf-parser`
  - `feature/word-parser`
  - `feature/excel-parser`
  - `feature/rtf-preview`
  - `feature/ui-component`

#### fix（修复分支）
- **命名规范**：`fix/问题描述`
- **用途**：修复已发现的Bug
- **创建来源**：从dev或main分支创建
- **合并目标**：dev分支或main分支（紧急修复）
- **示例**：
  - `fix/pdf-parse-error`
  - `fix/excel-display-issue`
  - `fix/memory-leak`

## 2. 提交规范

### 2.1 提交信息格式

```
<类型>(<范围>): <描述>

[可选的详细说明]

[可选的关闭问题]
```

### 2.2 提交类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(pdf): 实现PDF文档解析器` |
| `fix` | 修复Bug | `fix(word): 修复Word文档表格显示问题` |
| `docs` | 文档更新 | `docs: 更新API接口文档` |
| `style` | 代码格式调整 | `style: 统一代码缩进格式` |
| `refactor` | 重构 | `refactor(core): 优化事件分发机制` |
| `test` | 测试相关 | `test(pdf): 添加PDF解析测试用例` |
| `chore` | 构建/工具相关 | `chore: 更新构建配置` |

### 2.3 提交范围

根据模块和功能进行分类：
- `core`: 核心框架层
- `adapter`: 适配器层
- `previewer`: 预览器实现
- `implementation`: 具体实现
- `component`: UI组件
- `utils`: 工具函数
- `pdf`: PDF相关
- `word`: Word相关
- `excel`: Excel相关
- `ppt`: PowerPoint相关
- `image`: 图片相关
- `video`: 视频相关
- `audio`: 音频相关
- `archive`: 压缩包相关
- `special`: 特殊格式（xmind/bpmn等）
- `test`: 测试
- `doc`: 文档

### 2.4 提交信息示例

```
feat(pdf): 实现PDF文档解析器

- 实现PDF文档结构解析
- 支持文本内容提取
- 支持图片内容渲染
- 实现基础字体渲染

Closes #123
```

```
fix(excel): 修复Excel单元格格式显示错误

- 修复日期格式解析问题
- 修复数字格式显示异常
- 优化单元格渲染性能

Fixes #456
```

```
docs: 更新Git工作流文档

- 添加分支策略说明
- 完善提交规范定义
- 增加版本管理流程
```

## 3. 版本管理规范

### 3.1 语义化版本（SemVer）

版本号格式：`主版本.次版本.修订号` (如 `v1.0.0`)

#### 主版本（Major）
- **变更条件**：不兼容的API修改
- **示例**：`v1.0.0` → `v2.0.0`
- **说明**：当进行重大架构调整或接口变更时升级

#### 次版本（Minor）
- **变更条件**：向下兼容的功能性新增
- **示例**：`v1.0.0` → `v1.1.0`
- **说明**：新增文件格式支持、新增功能特性时升级

#### 修订号（Patch）
- **变更条件**：向下兼容的问题修正
- **示例**：`v1.0.0` → `v1.0.1`
- **说明**：修复Bug、性能优化时升级

### 3.2 版本发布流程

#### 开发版本（dev分支）
- 版本号格式：`v主版本.次版本.修订号-dev.构建号`
- 示例：`v1.0.0-dev.1`
- 说明：开发中的版本，用于测试和集成

#### 正式版本（main分支）
- 版本号格式：`v主版本.次版本.修订号`
- 示例：`v1.0.0`
- 说明：经过完整测试的稳定版本

#### 预发布版本
- 版本号格式：`v主版本.次版本.修订号-alpha.n`（内测版）
- 版本号格式：`v主版本.次版本.修订号-beta.n`（公测版）
- 版本号格式：`v主版本.次版本.修订号-rc.n`（候选发布版）

### 3.3 版本记录

所有版本变更记录在 `docs/version.md` 中，格式如下：

```markdown
# 版本变更记录

## [v1.0.0] - 2024-01-01

### 新增
- 支持45种文件格式预览
- 实现完全自研的解析引擎
- 支持大文件（50MB以内）流畅预览

### 修复
- 修复PDF解析内存泄漏问题
- 修复Excel表格显示错位

### 已知问题
- 复杂PDF文档渲染性能有待优化

## [v0.9.0-beta.2] - 2023-12-25

### 新增
- 支持Office文档类10种格式
- 支持文档类8种格式
```

## 4. Git工作流程

### 4.1 日常开发流程

```
1. 从dev分支创建功能分支
   git checkout dev
   git pull origin dev
   git checkout -b feature/new-feature

2. 开发并提交代码
   git add .
   git commit -m "feat(module): 新增xxx功能"

3. 推送到远程分支
   git push origin feature/new-feature

4. 创建Pull Request到dev分支
   - 代码审查
   - 自动化测试
   - 审查通过后合并

5. 合并到dev分支
   - 删除功能分支（本地和远程）
```

### 4.2 Bug修复流程

```
1. 从dev或main分支创建修复分支
   git checkout dev
   git pull origin dev
   git checkout -b fix/bug-description

2. 修复并提交
   git add .
   git commit -m "fix(module): 修复xxx问题"

3. 推送并创建PR
   git push origin fix/bug-description

4. 合并到dev或main分支
```

### 4.3 版本发布流程

```
1. 确认dev分支状态
   - 所有功能已合并
   - 测试全部通过
   - 无严重Bug

2. 从dev创建发布分支（可选）
   git checkout dev
   git pull origin dev
   git checkout -b release/v1.0.0

3. 准备发布
   - 更新版本号
   - 更新CHANGELOG
   - 提交变更

4. 合并到main并打标签
   git checkout main
   git pull origin main
   git merge release/v1.0.0
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin main --tags

5. 合并回dev
   git checkout dev
   git merge main
   git push origin dev

6. 删除发布分支
   git branch -d release/v1.0.0
```

## 5. 代码审查规范

### 5.1 Pull Request要求

- 标题清晰描述变更内容
- 关联相关的Issue
- 提供详细的变更说明
- 更新相关文档
- 确保所有测试通过
- 代码符合项目规范

### 5.2 审查要点

- 代码质量和可读性
- 功能正确性
- 性能影响
- 安全性考虑
- 文档完整性
- 测试覆盖

### 5.3 审查流程

1. 提交PR后，至少需要1名审查者批准
2. 自动化CI检查必须通过
3. 审查者提出修改意见
4. 开发者修改并更新PR
5. 审查通过后合并

## 6. CI/CD集成

### 6.1 持续集成

- 每次提交触发自动构建
- 运行单元测试
- 代码质量检查
- 自动化测试

### 6.2 质量门槛

- 单元测试覆盖率 ≥ 80%
- 代码符合ESLint规范
- 无严重安全漏洞
- 构建成功

## 7. Git操作记录

### 7.1 操作记录方式

由于当前环境为工作空间，实际的Git操作需要由开发人员在本地执行。Git控制岗位负责：

1. 记录应该执行的Git操作
2. 在 `docs/git-ops-log.md` 中记录操作历史
3. 提醒开发人员进行Git操作
4. 维护版本发布记录

### 7.2 操作记录模板

```markdown
## 2024-01-01

### 应执行的操作
- [ ] 初始化Git仓库
- [ ] 创建main分支
- [ ] 创建dev分支
- [ ] 创建.feature分支策略
- [ ] 配置.gitignore

### 实际执行记录
- ✅ 初始化完成（由xxx执行）
- ⏳ 等待创建分支
```

## 8. 注意事项

### 8.1 禁止操作

- ❌ 禁止直接向main分支push
- ❌ 禁止合并后保留未关闭的分支
- ❌ 禁止提交敏感信息（密码、密钥等）
- ❌ 禁止提交编译产物
- ❌ 禁止提交大文件（>50MB）

### 8.2 推荐实践

- ✅ 频繁提交，保持提交原子性
- ✅ 提交前先pull，减少冲突
- ✅ 使用.gitignore忽略不必要的文件
- ✅ 每个PR只包含一个功能点
- ✅ 保持提交历史清晰

### 8.3 冲突解决

1. 从远程拉取最新代码
2. 执行合并或变基
3. 手动解决冲突
4. 测试确保功能正常
5. 提交并推送

## 9. Git配置建议

### 9.1 全局配置

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
git config --global core.autocrlf input  # Linux/Mac
git config --global core.autocrlf true   # Windows
```

### 9.2 项目配置

```bash
git config --local commit.template .gitmessage
```

### 9.3 .gitignore建议

```
# Node modules
node_modules/

# Build output
dist/
build/
*.log

# IDE
.vscode/
.idea/

# Test coverage
coverage/

# OS
.DS_Store
Thumbs.db

# Temporary files
*.tmp
*.swp
```

---

**文档版本**: v1.0.0
**最后更新**: 2024-01-01
**维护者**: Git控制岗
