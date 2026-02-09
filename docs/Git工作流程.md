# Git工作流程与版本控制规范

## 1. 分支策略

### 1.1 分支结构
```
main          - 主分支（稳定版本）
dev           - 开发分支（开发中版本）
feature/*     - 功能分支（单个功能开发）
fix/*         - 修复分支（bug修复）
hotfix/*      - 紧急修复分支（线上紧急修复）
release/*     - 发布分支（版本发布准备）
```

### 1.2 分支说明

#### main分支
- **用途**：主分支，始终保持稳定可发布状态
- **来源**：仅接受从release分支合并
- **保护**：禁止直接推送，必须通过Pull Request合并
- **版本**：每次合并后打tag（如v1.0.0）

#### dev分支
- **用途**：开发分支，集成所有开发中的功能
- **来源**：从main分支创建
- **合并**：接受feature分支和fix分支合并
- **发布**：定期合并到release分支准备发布

#### feature分支
- **用途**：单个功能开发
- **命名规范**：`feature/功能描述` 或 `feature/模块名-功能名`
- **来源**：从dev分支创建
- **合并**：开发完成后合并回dev分支
- **删除**：合并后删除

#### fix分支
- **用途**：bug修复（非紧急）
- **命名规范**：`fix/问题描述`
- **来源**：从dev分支创建
- **合并**：修复完成后合并回dev分支

#### hotfix分支
- **用途**：线上紧急修复
- **命名规范**：`hotfix/问题描述`
- **来源**：从main分支创建
- **合并**：修复完成后同时合并回main和dev分支
- **删除**：合并后删除

#### release分支
- **用途**：版本发布准备
- **命名规范**：`release/v版本号`（如release/v1.0.0）
- **来源**：从dev分支创建
- **合并**：测试通过后合并到main和dev分支
- **删除**：合并后删除

## 2. 提交规范

### 2.1 提交信息格式
```
<type>(<scope>): <subject>

<body>

<footer>
```

### 2.2 Type类型
- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式调整（不影响代码逻辑）
- `refactor`: 重构（既不是新功能也不是修复bug）
- `test`: 测试相关
- `chore`: 构建/工具相关
- `perf`: 性能优化
- `ci`: CI/CD相关

### 2.3 Scope范围
- `core`: 核心框架层
- `adapter`: 适配器层
- `ui`: UI层
- `office`: Office文档类
- `document`: 文档类
- `image`: 图片类
- `media`: 音视频类
- `archive`: 压缩包类
- `other`: 其他格式

### 2.4 Subject说明
- 简短描述（不超过50字符）
- 使用动词开头（如：添加、修复、更新）
- 首字母小写
- 结尾不加句号

### 2.5 Body说明
- 详细描述本次提交的内容
- 可以多行，每行不超过72字符
- 说明变更的原因和影响

### 2.6 Footer说明
- 关联Issue：`#123`
- 关闭Issue：`Closes #123`
- 破坏性变更：`BREAKING CHANGE: 详细说明`

### 2.7 提交示例
```
feat(office): 添加xlsx文件预览支持

- 实现xlsx文件解析
- 添加表格渲染组件
- 支持基本单元格格式

Closes #15
```

## 3. 版本管理规范

### 3.1 语义化版本（SemVer）
版本号格式：`主版本.次版本.修订号`（如：`1.0.0`）

- **主版本**：不兼容的API修改
- **次版本**：向下兼容的功能性新增
- **修订号**：向下兼容的问题修正

### 3.2 预发布版本
- `alpha`: 内部测试版（如：0.1.0-alpha.1）
- `beta`: 公开测试版（如：0.1.0-beta.1）
- `rc`: 发布候选版（如：1.0.0-rc.1）

### 3.3 版本规划（基于PRD）
- **v0.1.0**: 核心框架 + P0格式（5+5+3=13种）
- **v0.2.0**: P1格式支持（新增10种，累计23种）
- **v0.3.0**: P2格式支持（新增11种，累计34种）
- **v1.0.0**: 全部格式支持（新增11种，累计45种）+ 正式发布

### 3.4 版本发布流程
1. 从dev分支创建release分支
2. 在release分支上进行bug修复和版本号调整
3. 通过测试后，合并到main分支
4. 在main分支上打tag
5. 合并回dev分支
6. 删除release分支

## 4. 开发工作流程

### 4.1 功能开发流程
```
1. 从dev分支创建feature分支
   git checkout dev
   git pull origin dev
   git checkout -b feature/功能名

2. 开发功能并提交代码
   git add .
   git commit -m "feat(scope): 功能描述"

3. 推送到远程仓库
   git push origin feature/功能名

4. 创建Pull Request到dev分支
   - 代码审查
   - 自动化测试

5. 合并到dev分支
   - Squash and merge
   - 删除feature分支
```

### 4.2 Bug修复流程
```
1. 从dev分支创建fix分支
   git checkout dev
   git pull origin dev
   git checkout -b fix/问题描述

2. 修复bug并提交代码
   git add .
   git commit -m "fix(scope): 问题描述"

3. 推送到远程并创建Pull Request
   git push origin fix/问题描述

4. 审查通过后合并到dev分支
```

### 4.3 紧急修复流程
```
1. 从main分支创建hotfix分支
   git checkout main
   git pull origin main
   git checkout -b hotfix/问题描述

2. 修复bug并提交代码
   git add .
   git commit -m "fix(scope): 问题描述"

3. 推送到远程并创建Pull Request

4. 同时合并到main和dev分支
   - 先合并到main并打tag
   - 再合并到dev分支

5. 删除hotfix分支
```

## 5. 代码审查规范

### 5.1 Pull Request要求
- 清晰的标题和描述
- 关联相关的Issue
- 通过所有自动化测试
- 至少1人审查通过
- 代码风格符合规范

### 5.2 审查要点
- 代码逻辑正确性
- 性能影响评估
- 安全性检查
- 代码可读性
- 注释和文档完整性

### 5.3 审查响应时间
- 普通PR：24小时内响应
- 紧急PR：4小时内响应

## 6. 分阶段开发与发布

### 6.1 第一阶段（P0 - 核心功能）
- **目标版本**: v0.1.0
- **功能范围**:
  - 核心框架层搭建
  - Office文档预览（docx, xlsx, pptx）
  - PDF预览
  - 图片预览（jpg, png, gif）
  - 基础UI界面
- **测试节点**: 第一阶段测试
- **发布方式**: dev → release/v0.1.0 → main (tag: v0.1.0)

### 6.2 第二阶段（P1 - 高优先级）
- **目标版本**: v0.2.0
- **功能范围**:
  - 其他Office格式（doc, xls, ppt, csv）
  - 文档预览（txt, md, xml, json）
  - 音视频预览（mp3, mp4）
  - 压缩包预览（zip, 7z, tar）
- **测试节点**: 第二阶段测试
- **发布方式**: dev → release/v0.2.0 → main (tag: v0.2.0)

### 6.3 第三阶段（P2 - 中优先级）
- **目标版本**: v0.3.0
- **功能范围**:
  - 国产格式（wps, et, dps, ofd）
  - 更多图片格式（bmp, svg, webp, psd, tif）
  - 更多音视频格式（wav, flv, avi, mkv, webm）
  - 其他压缩格式（rar, gzip, jar）
- **测试节点**: 第三阶段测试
- **发布方式**: dev → release/v0.3.0 → main (tag: v0.3.0)

### 6.4 第四阶段（P3 - 低优先级）
- **目标版本**: v1.0.0
- **功能范围**:
  - 特殊格式（xmind, bpmn, drawio, eml, dcm）
  - rtf, epub
  - 扩展功能完善
- **测试节点**: 第四阶段测试
- **发布方式**: dev → release/v1.0.0 → main (tag: v1.0.0)

## 7. 模块化开发规范

### 7.1 模块结构
每个模块独立开发，遵循以下规范：
- 单个模块代码不超过500行
- 独立的测试文件
- 清晰的模块文档

### 7.2 模块开发流程
```
1. 创建功能分支
2. 开发模块代码（<500行）
3. 编写单元测试
4. 创建Pull Request
5. 代码审查
6. 合并到dev分支
```

### 7.3 模块提交规范
每个模块独立提交，提交信息格式：
```
feat(module-name): 模块功能描述

- 实现功能A
- 实现功能B
- 添加单元测试

Closes #issue-number
```

## 8. 测试规范

### 8.1 测试类型
- **单元测试**: 每个模块必须有单元测试
- **集成测试**: 每个阶段完成后进行集成测试
- **端到端测试**: 整个系统集成后进行端到端测试

### 8.2 测试提交
```
test(module-name): 添加XXX模块的单元测试

覆盖以下场景：
- 场景1
- 场景2
```

## 9. CI/CD集成

### 9.1 自动化检查
- 代码风格检查（ESLint）
- 单元测试执行
- 构建验证
- 安全扫描

### 9.2 自动化测试
- 每次Pull Request触发自动化测试
- 所有测试通过才能合并
- 测试覆盖率要求：>80%

## 10. Git操作记录模板

### 10.1 初始化操作（首次）
```bash
# 1. 克隆已有仓库
git clone git@github.com:goodjin/file-preview-js.git
cd file-preview-js

# 2. 创建并切换到dev分支
git checkout -b dev
git push origin dev

# 3. 设置上游分支
git branch --set-upstream-to=origin/dev dev
```

### 10.2 日常开发操作
```bash
# 1. 同步最新代码
git checkout dev
git pull origin dev

# 2. 创建功能分支
git checkout -b feature/功能名

# 3. 开发并提交
git add .
git commit -m "feat(scope): 功能描述"

# 4. 推送到远程
git push origin feature/功能名

# 5. 创建Pull Request（在GitHub网页操作）
```

### 10.3 发布操作
```bash
# 1. 创建release分支
git checkout dev
git pull origin dev
git checkout -b release/v0.1.0

# 2. 更新版本号（手动修改package.json等文件）
git add .
git commit -m "chore(release): 准备发布v0.1.0"

# 3. 推送release分支
git push origin release/v0.1.0

# 4. 测试通过后，合并到main
git checkout main
git merge release/v0.1.0

# 5. 打tag
git tag -a v0.1.0 -m "Release version 0.1.0"
git push origin v0.1.0

# 6. 合并回dev
git checkout dev
git merge release/v0.1.0
git push origin dev

# 7. 删除release分支
git branch -d release/v0.1.0
git push origin --delete release/v0.1.0
```

## 11. 版本变更记录

版本变更记录在`docs/version.md`中维护，格式如下：

```markdown
# 版本变更记录

## [v0.1.0] - YYYY-MM-DD

### 新增
- 核心框架层搭建
- Office文档预览（docx, xlsx, pptx）
- PDF预览
- 图片预览（jpg, png, gif）
- 基础UI界面

### 修复
- 修复xxx问题

### 变更
- 模块化架构调整

## [v0.2.0] - YYYY-MM-DD
...
```

## 12. 注意事项

### 12.1 禁止操作
- 禁止直接在main分支提交代码
- 禁止在main分支创建子分支
- 禁止修改历史提交记录（除非确定安全）
- 禁止在feature分支合并其他分支

### 12.2 推荐做法
- 频繁提交，小步迭代
- 保持提交信息清晰规范
- 及时删除已合并的功能分支
- 定期同步远程代码

### 12.3 冲突处理
- 合并时遇到冲突，优先沟通
- 不要直接覆盖他人代码
- 冲突解决后进行充分测试

---

**文档版本**: 1.0  
**编写日期**: 2024  
**维护岗位**: git控制  
**适用仓库**: git@github.com:goodjin/file-preview-js.git