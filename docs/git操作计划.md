# Git 操作计划

> 文件预览系统版本控制操作手册
> 创建日期：2026-01-29
> 负责人：版本管理员

## 一、仓库初始化

### 1.1 首次初始化方案（待执行）

#### 方案A：克隆远程仓库（推荐）
```bash
# 在有Git环境的机器上执行
git clone git@github.com:goodjin/file-preview-js.git
cd file-preview-js
```

#### 方案B：本地初始化后关联远程
```bash
# 在有Git环境的机器上执行
mkdir file-preview-js
cd file-preview-js
git init
git remote add origin git@github.com:goodjin/file-preview-js.git
git remote -v  # 验证远程仓库配置
```

### 1.2 初始文件提交
```bash
# 添加所有已配置的文件
git add .gitignore
git add README.md
git add docs/

# 首次提交
git commit -m "chore: 初始化项目配置

- 配置 .gitignore 忽略规则
- 创建 README.md 项目文档
- 创建 docs/git操作计划.md 版本控制计划
- 完成Git仓库基础配置"

# 推送到远程仓库
git push -u origin master  # 或 main，取决于远程默认分支
```

## 二、分支策略管理

### 2.1 分支创建流程

#### 开发主分支（如果远程没有）
```bash
# 从master创建develop分支
git checkout -b develop master
git push -u origin develop
```

#### 功能开发分支
```bash
# 基于develop创建功能分支
git checkout develop
git pull origin develop
git checkout -b feature/pdf-preview develop
git push -u origin feature/pdf-preview
```

#### 缺陷修复分支
```bash
# 基于develop创建bugfix分支
git checkout develop
git pull origin develop
git checkout -b bugfix/fix-image-loading develop
git push -u origin bugfix/fix-image-loading
```

#### 发布准备分支
```bash
# 基于develop创建release分支
git checkout develop
git pull origin develop
git checkout -b release/v0.1.0 develop
git push -u origin release/v0.1.0
```

### 2.2 分支合并流程

#### 功能分支合并到develop
```bash
# 合并feature分支
git checkout develop
git pull origin develop
git merge --no-ff feature/pdf-preview
git push origin develop
```

#### Release分支合并到master和develop
```bash
# 合并release到master
git checkout master
git merge --no-ff release/v0.1.0
git tag -a v0.1.0 -m "发布版本 v0.1.0"
git push origin master
git push origin v0.1.0

# 合并release到develop
git checkout develop
git merge --no-ff release/v0.1.0
git push origin develop
```

## 三、代码提交流程

### 3.1 日常提交规范

#### 程序员完成代码后
1. 将代码提交到工作空间（通过工作空间工具）
2. 通知版本管理员代码已就绪
3. 版本管理员审核代码变更
4. 版本管理员记录提交信息到 `docs/git提交记录.md`

#### 版本管理员准备提交
```bash
# 查看当前状态
git status

# 添加变更文件
git add src/pdf-preview.js
git add tests/pdf-preview.test.js

# 提交代码
git commit -m "feat(pdf): 添加PDF文件预览功能

- 集成PDF.js库
- 实现PDF渲染引擎
- 支持页面缩放和滚动功能
- 添加PDF预览单元测试

Closes #123"

# 推送到远程分支
git push origin feature/pdf-preview
```

### 3.2 提交类型说明

| 类型 | 说明 | 示例 |
|------|------|------|
| feat | 新功能 | feat(pdf): 添加PDF预览功能 |
| fix | 修复bug | fix(image): 修复图片加载失败问题 |
| docs | 文档更新 | docs(readme): 更新使用说明 |
| style | 代码格式调整 | style(format): 统一代码缩进 |
| refactor | 重构代码 | refactor(core): 重构预览核心逻辑 |
| perf | 性能优化 | perf(render): 优化渲染性能 |
| test | 测试相关 | test(pdf): 添加PDF预览测试 |
| chore | 构建/工具链 | chore(deps): 更新依赖包版本 |

### 3.3 批量提交计划

#### 版本0.1.0提交计划（示例）

**提交1：项目初始化**
```bash
git add .gitignore README.md docs/
git commit -m "chore: 初始化项目配置

- 配置 .gitignore 忽略规则
- 创建 README.md 项目文档
- 创建 docs/git操作计划.md 版本控制计划"
```

**提交2：核心功能开发**
```bash
git add src/core/
git commit -m "feat(core): 实现文件预览核心功能

- 实现文件类型检测
- 实现预览器注册机制
- 实现基础预览界面"
```

**提交3：PDF预览功能**
```bash
git add src/pdf-preview.js
git commit -m "feat(pdf): 添加PDF文件预览功能

- 集成PDF.js库
- 实现PDF渲染引擎
- 支持页面缩放和滚动"
```

## 四、版本发布流程

### 4.1 版本发布步骤

#### 1. 创建Release分支
```bash
git checkout develop
git pull origin develop
git checkout -b release/v0.1.0
```

#### 2. 版本准备
```bash
# 更新版本号（如果需要）
# 更新CHANGELOG.md
# 运行测试
# 构建生产版本
```

#### 3. 合并到master
```bash
git checkout master
git merge --no-ff release/v0.1.0
git tag -a v0.1.0 -m "版本 v0.1.0 - 初始发布版本

功能特性：
- 支持30+种文件格式预览
- 纯JavaScript实现，无需服务端
- 响应式设计，支持移动端"
git push origin master
git push origin v0.1.0
```

#### 4. 合并回develop
```bash
git checkout develop
git merge --no-ff release/v0.1.0
git push origin develop
```

#### 5. 删除Release分支
```bash
git branch -d release/v0.1.0
git push origin --delete release/v0.1.0
```

### 4.2 版本标签管理

#### 查看标签
```bash
git tag              # 查看所有标签
git show v0.1.0      # 查看标签详情
```

#### 创建标签
```bash
# 轻量标签
git tag v0.1.0

# 附注标签（推荐）
git tag -a v0.1.0 -m "版本 v0.1.0 发布说明"
```

#### 推送标签
```bash
# 推送单个标签
git push origin v0.1.0

# 推送所有标签
git push origin --tags
```

#### 删除标签
```bash
# 删除本地标签
git tag -d v0.1.0

# 删除远程标签
git push origin --delete v0.1.0
```

## 五、日常维护操作

### 5.1 代码同步

#### 同步远程更新
```bash
# 获取远程更新
git fetch origin

# 查看远程分支
git branch -r

# 拉取最新代码
git pull origin develop
```

#### 合并冲突处理
```bash
# 发生冲突时
git status                      # 查看冲突文件
# 手动编辑解决冲突
git add <resolved-file>         # 标记冲突已解决
git commit                       # 完成合并
```

### 5.2 回滚操作

#### 撤销未提交的修改
```bash
# 撤销工作区修改
git checkout -- <file>

# 撤销暂存区修改
git reset HEAD <file>
```

#### 撤销已提交的修改
```bash
# 软撤销（保留修改）
git reset --soft HEAD~1

# 混合撤销（保留修改到工作区）
git reset HEAD~1

# 硬撤销（完全删除修改）
git reset --hard HEAD~1
```

#### 回滚到指定版本
```bash
git log --oneline              # 查看提交历史
git revert <commit-id>         # 创建新提交回滚
git reset --hard <commit-id>   # 强制回滚（谨慎使用）
```

### 5.3 清理操作

#### 清理未跟踪文件
```bash
git clean -f                    # 删除未跟踪文件
git clean -fd                   # 删除未跟踪文件和目录
git clean -n -fd                # 预览将要删除的文件
```

#### 清理无用的分支
```bash
git branch -d <branch>          # 删除已合并的本地分支
git branch -D <branch>          # 强制删除本地分支
git push origin --delete <branch>  # 删除远程分支
```

## 六、紧急修复流程（Hotfix）

### 6.1 Hotfix分支创建
```bash
git checkout master
git pull origin master
git checkout -b hotfix/critical-fix master
git push -u origin hotfix/critical-fix
```

### 6.2 Hotfix合并
```bash
# 合并到master
git checkout master
git merge --no-ff hotfix/critical-fix
git tag -a v0.1.1 -m "紧急修复 v0.1.1"
git push origin master
git push origin v0.1.1

# 合并到develop
git checkout develop
git merge --no-ff hotfix/critical-fix
git push origin develop
```

## 七、代码审查流程

### 7.1 审查检查清单
- [ ] 代码符合项目规范
- [ ] 包含必要的单元测试
- [ ] 提交信息格式正确
- [ ] 没有引入安全漏洞
- [ ] 性能影响可接受
- [ ] 文档已更新

### 7.2 Pull Request流程（如果使用GitHub PR）

#### 创建PR
1. 在GitHub上创建Pull Request
2. 填写PR描述
3. 指定审查者
4. 等待审查通过

#### 合并PR
```bash
# 通过GitHub Web界面合并，或使用命令行
git checkout master
git pull origin master
git merge <branch-name>
git push origin master
```

## 八、备份与恢复

### 8.1 本地备份
```bash
# 创建完整备份
git bundle create backup-$(date +%Y%m%d).bundle --all

# 恢复备份
git clone backup-20260129.bundle restored-repo
```

### 8.2 远程备份
- GitHub作为主要远程仓库
- 可配置多个远程仓库作为备份
```bash
git remote add backup git@bitbucket.org:user/file-preview-js.git
git push backup --all
git push backup --tags
```

## 九、常见问题处理

### 9.1 连接问题
```bash
# 测试SSH连接
ssh -T git@github.com

# 查看远程仓库配置
git remote -v

# 更新远程仓库URL
git remote set-url origin git@github.com:goodjin/file-preview-js.git
```

### 9.2 文件过大问题
```bash
# 查找大文件
git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | awk '/^blob/ {print substr($0,6)}' | sort -k2 -rn | head -n 10

# 移除大文件历史
git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch large-file.zip' --prune-empty --tag-name-filter cat -- --all
```

### 9.3 分支丢失恢复
```bash
# 查找丢失的提交
git reflog

# 恢复丢失的分支
git checkout -b recovered-branch <commit-id>
```

## 十、检查清单

### 日常提交前检查
- [ ] 代码已通过测试
- [ ] 提交信息格式正确
- [ ] 已添加必要的注释
- [ ] 文档已更新
- [ ] 无敏感信息泄露

### 版本发布前检查
- [ ] 所有测试通过
- [ ] CHANGELOG已更新
- [ ] 版本号已更新
- [ ] 标签已创建
- [ ] 文档已同步

## 十一、操作日志模板

### Git操作日志（docs/git操作日志.md）
```markdown
# Git操作日志

| 日期 | 操作类型 | 分支 | 提交信息 | 操作人 |
|------|---------|------|---------|--------|
| 2026-01-29 | 初始化 | master | chore: 初始化项目配置 | 版本管理员 |
```

## 十二、待执行操作列表

### 当前待执行（优先级：高）
- [ ] 在有Git环境的机器上执行仓库初始化
- [ ] 推送初始文件到远程仓库
- [ ] 创建并推送develop分支
- [ ] 验证远程仓库配置

### 后续待执行（优先级：中）
- [ ] 配置Git hooks（pre-commit, commit-msg等）
- [ ] 设置自动化测试集成
- [ ] 配置CI/CD流程
- [ ] 创建Git操作日志文档

---

**文档版本**：v1.0
**创建日期**：2026-01-29
**最后更新**：2026-01-29
**维护人**：版本管理员
**状态**：✅ 已完成，等待执行
