# 文件预览系统

基于纯JavaScript的文件预览系统，支持30+种文件格式的预览功能，不依赖服务端解析。

## 项目概述

本系统是一个纯前端的文件预览解决方案，可以在浏览器中直接预览各种文件格式，无需后端服务器参与。

### 核心特性
- ✨ 支持30+种文件格式预览
- 🚀 纯JavaScript实现，无需服务端
- 📱 响应式设计，支持移动端
- 🔒 数据安全，文件不离开本地浏览器
- ⚡ 高性能渲染，流畅的预览体验

### 支持的文件格式
- **文档类**：PDF, DOCX, XLSX, PPTX, TXT, MD
- **图片类**：JPG, PNG, GIF, SVG, BMP, WEBP
- **代码类**：JS, TS, HTML, CSS, JSON, XML
- **音频视频**：MP3, MP4, WAV, OGG, WEBM
- **其他**：CSV, RTF, EPUB 等

## 项目信息

- **远程仓库**：git@github.com:goodjin/file-preview-js.git
- **技术栈**：纯JavaScript，不依赖服务端解析
- **工作空间**：文件预览系统开发环境
- **版本管理**：Git版本控制系统

## 版本控制策略

### 当前状态
- ✅ .gitignore 已配置（2026-01-29）
- ✅ README.md 文档已创建（2026-01-29）
- ✅ Git操作计划已制定（2026-01-29）
- ⏳ Git仓库初始化（待执行）
- ⏳ 远程仓库配置（待执行）

### 开发流程
1. 程序员完成代码开发并提交到工作空间
2. 版本管理员审核代码并记录变更
3. 版本管理员准备Git提交信息文档
4. 完整版本测试通过后，准备Git操作脚本
5. 在有Git环境的机器上统一执行Git操作
6. 推送到远程仓库并打版本标签

### 分支策略
- **main/master**：生产稳定版本
- **develop**：开发主分支，集成最新功能
- **feature/***：功能开发分支，从develop分出
- **bugfix/***：缺陷修复分支，从develop分出
- **release/***：发布准备分支，从develop分出，合并到main

### 提交规范
采用 Conventional Commits 规范：

- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 重构代码
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具链相关

提交格式：
```
<type>(<scope>): <subject>

<body>

<footer>
```

示例：
```
feat(pdf): 添加PDF文件预览功能

- 集成PDF.js库
- 实现PDF渲染引擎
- 支持页面缩放和滚动

Closes #123
```

### 版本命名
遵循语义化版本规范（Semantic Versioning）：`MAJOR.MINOR.PATCH`

- **MAJOR**：不兼容的API修改
- **MINOR**：向下兼容的新功能
- **PATCH**：向下兼容的bug修复

## 项目结构

```
file-preview-js/
├── docs/              # 项目文档
│   └── git操作计划.md # Git操作详细计划
├── src/               # 源代码目录
├── dist/              # 构建输出（.gitignore）
├── tests/             # 测试文件
├── .gitignore         # Git忽略配置
├── README.md          # 项目说明
└── package.json       # 项目配置
```

## 版本记录

### v0.1.0 - 初始版本（规划中）
- 项目初始化
- 基础架构搭建
- Git版本控制配置

## 贡献指南

### 开发流程
1. 从 `develop` 分支创建 `feature/xxx` 分支
2. 开发完成后提交代码到工作空间
3. 通知版本管理员进行代码审核
4. 通过审核后等待Git提交和推送
5. 合并到 `develop` 分支

### 代码规范
- 使用 ESLint 进行代码检查
- 遵循 JavaScript 代码规范
- 添加必要的注释和文档

## 联系方式

- **产品经理**：负责产品规划和需求管理
- **版本管理员**：负责Git版本控制和代码管理
- **程序员**：负责功能开发和代码实现

## 许可证

待确定

---

**最后更新**：2026-01-29
**维护者**：版本管理员
