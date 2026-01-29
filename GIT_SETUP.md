# Git操作指南

## 说明

由于当前环境无法直接执行Git命令，请按照以下步骤在有Git环境的机器上执行代码提交和推送。

## 前置条件

- 已安装Git
- 有GitHub账号和访问权限
- 仓库地址：git@github.com:goodjin/file-preview-js.git

## 操作步骤

### 1. 克隆或初始化仓库

**如果仓库已存在（首次推送）：**

```bash
cd file-preview-js
git init
```

**如果仓库已在本地存在：**

```bash
cd file-preview-js
```

### 2. 配置Git用户信息（首次使用）

```bash
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

### 3. 添加所有文件到暂存区

```bash
git add .
```

### 4. 提交代码

使用Conventional Commits规范的提交信息：

```bash
git commit -m "feat: 初始化文件预览系统v0.1.0

- 完成核心框架层（PreviewerFactory、FileTypeDetector、EventBus、StateManager）
- 完成UI层和适配器层
- 完成Office预览模块（docx、xlsx、pptx）
- 完成文档预览模块（PDF、TXT、MD、XML、JSON）
- 完成图片预览模块（JPG、PNG、GIF、BMP、WebP、PSD、SVG开发中、TIFF开发中）
- 包含完整的单元测试和集成测试
- 符合Conventional Commits规范"
```

### 5. 添加远程仓库（首次推送）

```bash
git remote add origin git@github.com:goodjin/file-preview-js.git
```

**如果远程仓库已存在，先删除再添加：**

```bash
git remote remove origin
git remote add origin git@github.com:goodjin/file-preview-js.git
```

### 6. 推送到远程仓库

```bash
git push -u origin main
```

**如果远程仓库主分支是master而不是main：**

```bash
git push -u origin master
```

**如果遇到冲突（远程已有内容）：**

```bash
git pull origin main --allow-unrelated-histories
git push origin main
```

## 项目结构

提交的代码包含以下内容：

```
file-preview-js/
├── .gitignore                      # Git忽略文件配置
├── README.md                       # 项目说明文档
├── docs/                           # 项目文档
│   ├── 需求文档.md
│   ├── UI设计文档.md
│   ├── 组件规范文档.md
│   ├── 交互流程文档.md
│   └── git操作计划.md
├── src/                            # 源代码
│   ├── core/                       # 核心框架层
│   │   ├── EventBus.js
│   │   ├── EventBus.test.js
│   │   ├── FileTypeDetector.js
│   │   ├── FileTypeDetector.test.js
│   │   ├── PreviewerFactory.js
│   │   ├── PreviewerFactory.test.js
│   │   ├── StateManager.js
│   │   ├── StateManager.test.js
│   │   ├── IMPLEMENTATION_SUMMARY.md
│   │   └── README.md
│   ├── implementations/            # 实现层
│   │   ├── office/                 # Office模块
│   │   │   ├── docx/
│   │   │   │   ├── DocxParser.js
│   │   │   │   ├── DocxRenderer.js
│   │   │   │   ├── index.js
│   │   │   │   └── README.md
│   │   │   ├── xlsx/
│   │   │   ├── pptx/
│   │   │   ├── OfficeAdapter.js
│   │   │   ├── index.js
│   │   │   ├── test-integration.html
│   │   │   └── README.md
│   │   ├── document/               # 文档模块
│   │   │   ├── pdf/
│   │   │   ├── txt/
│   │   │   ├── md/
│   │   │   ├── xml/
│   │   │   ├── json/
│   │   │   │   ├── JSONPreviewer.js
│   │   │   │   └── index.js
│   │   │   ├── DocumentPreviewer.js
│   │   │   ├── index.js
│   │   │   ├── README.md
│   │   │   └── 文档模块设计文档.md
│   │   └── image/                  # 图片模块
│   │       ├── JpgPreviewer.js
│   │       ├── PngPreviewer.js
│   │       ├── GifPreviewer.js
│   │       ├── BmpPreviewer.js
│   │       ├── SvgPreviewer.js
│   │       ├── WebpPreviewer.js
│   │       ├── PsdPreviewer.js
│   │       ├── TifPreviewer.js
│   │       ├── ImagePreviewer.js
│   │       ├── ImageUtils.js
│   │       ├── ImageConstants.js
│   │       └── image-module-design.md
│   ├── ui/                         # UI层
│   ├── adapters/                   # 适配器层
│   └── index.js                    # 主入口
└── tests/                          # 测试文件
```

## 提交信息规范（Conventional Commits）

本项目使用Conventional Commits规范，格式如下：

```
<type>: <subject>

<body>

<footer>
```

### Type（类型）

- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式（不影响代码运行的变动）
- `refactor`: 重构
- `test`: 增加测试
- `chore`: 构建过程或辅助工具的变动

### 示例

```bash
# 新功能
git commit -m "feat: 添加docx文件预览功能"

# 修复bug
git commit -m "fix: 修复GIF动画控制问题"

# 文档更新
git commit -m "docs: 更新API文档"

# 重构
git commit -m "refactor: 优化文件类型检测性能"
```

## 常见问题

### Q1: 提示remote already exists

```bash
git remote remove origin
git remote add origin git@github.com:goodjin/file-preview-js.git
```

### Q2: 推送失败，提示需要身份验证

```bash
# 检查SSH密钥配置
ssh -T git@github.com

# 如果没有SSH密钥，生成一个
ssh-keygen -t rsa -b 4096 -C "your.email@example.com"

# 将SSH公钥添加到GitHub账户
cat ~/.ssh/id_rsa.pub
```

### Q3: 提示fatal: not a git repository

```bash
cd file-preview-js
git init
```

### Q4: 提示分支冲突

```bash
git pull origin main --allow-unrelated-histories
# 解决冲突后
git add .
git commit -m "merge: 合并远程分支"
git push origin main
```

### Q5: 查看提交历史

```bash
git log --oneline
```

### Q6: 查看远程仓库信息

```bash
git remote -v
```

## 验证推送成功

推送成功后，访问以下地址查看代码：

https://github.com/goodjin/file-preview-js

## 下一步

1. 验证代码是否正确推送
2. 检查文件完整性
3. 如有遗漏的文件，再次提交推送
4. 继续开发SVG和TIFF预览功能

## 联系信息

如有问题，请联系项目负责人。

---

**文档版本**: 1.0  
**创建日期**: 2026-01-29  
**适用项目**: file-preview-js
