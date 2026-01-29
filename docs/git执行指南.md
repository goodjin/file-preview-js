# Git执行指南

> 文件预览系统 - Git版本控制执行手册
> 创建日期：2026-01-29
> 负责人：版本管理员

## 快速开始

### 方式一：使用自动化脚本（推荐）

#### Linux/Mac系统
```bash
# 进入项目根目录
cd file-preview-js

# 添加执行权限
chmod +x setup-git.sh

# 执行脚本
./setup-git.sh
```

#### Windows系统
```batch
# 双击运行或在命令行执行
setup-git.bat
```

自动化脚本将自动完成以下操作：
1. ✓ 初始化Git仓库
2. ✓ 添加所有文件到暂存区
3. ✓ 提交文件（带规范的提交信息）
4. ✓ 配置远程仓库
5. ✓ 推送到GitHub

### 方式二：手动执行Git命令

#### 步骤1：初始化Git仓库
```bash
git init
```

#### 步骤2：添加文件到暂存区
```bash
git add .
```

查看已暂存的文件：
```bash
git status
```

#### 步骤3：提交文件
```bash
git commit -m "feat: 初始化文件预览系统 v0.1.0

- 配置 .gitignore 忽略规则
- 创建 README.md 项目文档
- 创建 docs/git操作计划.md 版本控制计划
- 创建 docs/git执行指南.md 执行说明
- 配置Git版本控制基础环境"
```

#### 步骤4：配置远程仓库
```bash
git remote add origin git@github.com:goodjin/file-preview-js.git
```

验证远程仓库配置：
```bash
git remote -v
```

#### 步骤5：推送到远程仓库
```bash
git push -u origin main
```

如果主分支名称是 `master`，则执行：
```bash
git push -u origin master
```

## 提交规范

所有提交必须遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

### 提交格式
```
<type>(<scope>): <subject>

<body>

<footer>
```

### 提交类型（type）
| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(pdf): 添加PDF预览功能` |
| `fix` | 修复bug | `fix(image): 修复图片加载失败问题` |
| `docs` | 文档更新 | `docs(readme): 更新使用说明` |
| `style` | 代码格式调整 | `style(format): 统一代码缩进` |
| `refactor` | 重构代码 | `refactor(core): 重构预览核心逻辑` |
| `perf` | 性能优化 | `perf(render): 优化渲染性能` |
| `test` | 测试相关 | `test(pdf): 添加PDF预览测试` |
| `chore` | 构建/工具链 | `chore(deps): 更新依赖包版本` |

### 提交示例

#### 新功能提交
```bash
git commit -m "feat(pdf): 添加PDF文件预览功能

- 集成PDF.js库
- 实现PDF渲染引擎
- 支持页面缩放和滚动功能
- 添加PDF预览单元测试

Closes #123"
```

#### Bug修复提交
```bash
git commit -m "fix(image): 修复WebP格式图片无法预览的问题

问题：WebP格式图片在Chrome浏览器中无法正常预览
原因：缺少WebP解码器依赖
解决：添加webpjs库并正确初始化

Fixes #456"
```

#### 文档更新提交
```bash
git commit -m "docs(readme): 更新API使用示例

- 添加初始化代码示例
- 补充事件监听示例
- 更新配置参数说明"
```

## 版本管理

### 创建版本标签

#### 轻量标签
```bash
git tag v0.1.0
```

#### 附注标签（推荐）
```bash
git tag -a v0.1.0 -m "版本 v0.1.0 - 初始发布版本

功能特性：
- 支持30+种文件格式预览
- 纯JavaScript实现，无需服务端
- 响应式设计，支持移动端"
```

### 推送标签
```bash
# 推送单个标签
git push origin v0.1.0

# 推送所有标签
git push origin --tags
```

### 查看标签
```bash
# 查看所有标签
git tag

# 查看标签详情
git show v0.1.0
```

## 分支管理

### 查看分支
```bash
# 查看本地分支
git branch

# 查看所有分支（包括远程）
git branch -a

# 查看当前分支
git branch --show-current
```

### 创建分支
```bash
# 创建并切换到新分支
git checkout -b develop

# 创建分支但不切换
git branch develop

# 从远程分支创建本地分支
git checkout -b develop origin/develop
```

### 切换分支
```bash
git checkout develop
# 或
git switch develop
```

### 合并分支
```bash
# 合并分支到当前分支
git merge feature/pdf-preview

# 合并时创建合并提交
git merge --no-ff feature/pdf-preview

# 合并时压缩提交
git merge --squash feature/pdf-preview
```

### 删除分支
```bash
# 删除本地分支
git branch -d feature/pdf-preview

# 强制删除本地分支
git branch -D feature/pdf-preview

# 删除远程分支
git push origin --delete feature/pdf-preview
```

## 常见问题排查

### SSH密钥问题

#### 1. 检查SSH密钥
```bash
ls -al ~/.ssh
# 查看是否有 id_rsa 和 id_rsa.pub 文件
```

#### 2. 生成SSH密钥（如果没有）
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
# 或使用 RSA 算法
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

#### 3. 测试SSH连接
```bash
ssh -T git@github.com
```

#### 4. 添加SSH密钥到GitHub
1. 复制公钥内容：
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```
2. 访问 GitHub SSH Key 设置：https://github.com/settings/keys
3. 点击 "New SSH key"，粘贴公钥内容

### 推送失败问题

#### 1. 远程仓库已有更新
```bash
# 先拉取远程更新
git pull origin main --rebase

# 再推送
git push origin main
```

#### 2. 权限不足
```bash
# 检查远程仓库URL
git remote -v

# 确认使用SSH协议（不是HTTPS）
git remote set-url origin git@github.com:goodjin/file-preview-js.git
```

#### 3. 网络连接问题
```bash
# 测试网络连接
ping github.com

# 检查代理设置
git config --global http.proxy
git config --global https.proxy

# 如果需要设置代理
git config --global http.proxy http://proxy.example.com:8080
```

### 合并冲突处理

#### 1. 查看冲突文件
```bash
git status
```

#### 2. 手动编辑冲突文件
冲突标记：
```
<<<<<<< HEAD
当前分支的代码
=======
其他分支的代码
>>>>>>> other-branch
```

选择需要保留的代码，删除冲突标记。

#### 3. 标记冲突已解决
```bash
git add <resolved-file>
```

#### 4. 完成合并
```bash
git commit
```

## 工作流程示例

### 功能开发流程

#### 1. 创建功能分支
```bash
git checkout develop
git pull origin develop
git checkout -b feature/pdf-preview
```

#### 2. 开发并提交
```bash
# 编写代码
# ...

# 添加文件
git add src/pdf-preview.js

# 提交
git commit -m "feat(pdf): 添加PDF预览功能"

# 推送到远程
git push -u origin feature/pdf-preview
```

#### 3. 合并到develop
```bash
git checkout develop
git pull origin develop
git merge --no-ff feature/pdf-preview
git push origin develop

# 删除功能分支
git branch -d feature/pdf-preview
git push origin --delete feature/pdf-preview
```

### 版本发布流程

#### 1. 创建发布分支
```bash
git checkout develop
git pull origin develop
git checkout -b release/v0.1.0
```

#### 2. 测试和准备
```bash
# 运行测试
# 更新版本号
# 更新CHANGELOG.md
```

#### 3. 合并到main并打标签
```bash
# 合并到main
git checkout main
git merge --no-ff release/v0.1.0
git tag -a v0.1.0 -m "发布版本 v0.1.0"

# 推送
git push origin main
git push origin v0.1.0
```

#### 4. 合并回develop
```bash
git checkout develop
git merge --no-ff release/v0.1.0
git push origin develop

# 删除发布分支
git branch -d release/v0.1.0
git push origin --delete release/v0.1.0
```

## 检查清单

### 首次提交前检查
- [ ] Git已安装并配置
- [ ] SSH密钥已添加到GitHub
- [ ] .gitignore配置正确
- [ ] README.md文档完整
- [ ] 没有敏感信息在代码中

### 日常提交前检查
- [ ] 代码已通过测试
- [ ] 提交信息格式正确（Conventional Commits）
- [ ] 添加了必要的注释
- [ ] 相关文档已更新
- [ ] 没有引入安全漏洞

### 版本发布前检查
- [ ] 所有测试通过
- [ ] CHANGELOG已更新
- [ ] 版本号已更新
- [ ] 标签已创建
- [ ] 文档已同步

## 附录

### 有用的Git命令

#### 查看提交历史
```bash
# 查看历史
git log

# 简洁显示
git log --oneline

# 图形化显示
git log --graph --oneline --all

# 查看特定文件的历史
git log --follow README.md
```

#### 查看文件变更
```bash
# 查看工作区变更
git diff

# 查看暂存区变更
git diff --cached

# 查看提交之间的差异
git diff v0.1.0 v0.2.0
```

#### 撤销操作
```bash
# 撤销工作区修改
git checkout -- <file>

# 撤销暂存区修改
git reset HEAD <file>

# 撤销上一次提交（保留修改）
git reset --soft HEAD~1

# 撤销上一次提交（丢弃修改）
git reset --hard HEAD~1
```

#### 清理操作
```bash
# 清理未跟踪文件
git clean -f

# 清理未跟踪文件和目录
git clean -fd

# 预览将要删除的文件
git clean -n -fd
```

### Git配置

#### 全局配置
```bash
# 设置用户名
git config --global user.name "Your Name"

# 设置邮箱
git config --global user.email "your_email@example.com"

# 设置默认分支名
git config --global init.defaultBranch main

# 设置编辑器
git config --global core.editor "vim"
```

#### 项目配置
```bash
# 仅对当前项目设置
git config user.name "Your Name"
git config user.email "your_email@example.com"

# 配置合并策略
git config merge.ff false
```

#### 查看配置
```bash
# 查看所有配置
git config --list

# 查看全局配置
git config --global --list

# 查看项目配置
git config --list
```

## 参考资料

- [Git官方文档](https://git-scm.com/doc)
- [Conventional Commits规范](https://www.conventionalcommits.org/)
- [GitHub文档](https://docs.github.com/)
- [语义化版本](https://semver.org/)

---

**文档版本**：v1.0
**创建日期**：2026-01-29
**最后更新**：2026-01-29
**维护人**：版本管理员
