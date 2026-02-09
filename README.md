# 文件预览系统

> 支持45种文件格式的纯前端文件预览工具

## 项目简介

文件预览系统是一个纯前端的文件预览解决方案，支持45种常见文件格式的在线预览，无需依赖服务端解析。

## 支持的文件格式

### Office文档类（10种）
- doc, docx, xls, xlsx, ppt, pptx, csv, wps, et, dps

### 文档类（8种）
- pdf, ofd, rtf, txt, md, xml, json, epub

### 图片类（8种）
- jpg, png, gif, bmp, svg, tif, webp, psd

### 音视频类（7种）
- mp3, wav, mp4, flv, avi, mkv, webm

### 压缩包类（6种）
- zip, rar, 7z, tar, gzip, jar

### 其他格式（6种）
- xmind, bpmn, drawio, eml, dcm

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 运行测试

```bash
npm test
```

## 技术栈

- **语言**: JavaScript (ES6+)
- **构建工具**: Vite
- **测试框架**: Vitest
- **代码规范**: ESLint + Prettier

## 项目结构

```
file-preview-js/
├── docs/              # 文档目录
├── public/            # 静态资源
├── src/               # 源代码
│   ├── core/          # 核心框架层
│   ├── adapters/      # 适配器层
│   ├── previewers/    # 预览器实现
│   ├── components/    # UI组件
│   ├── utils/         # 工具函数
│   ├── constants/     # 常量定义
│   └── styles/        # 样式文件
├── tests/             # 测试目录
└── examples/          # 示例目录
```

## 开发计划

### v0.1.0 - 核心框架 + P0格式
- 核心框架层搭建
- Office文档预览（docx, xlsx, pptx）
- PDF预览
- 图片预览（jpg, png, gif）
- 基础UI界面

### v0.2.0 - P1格式支持
- 其他Office格式（doc, xls, ppt, csv）
- 文档预览（txt, md, xml, json）
- 音视频预览（mp3, mp4）
- 压缩包预览（zip, 7z, tar）

### v0.3.0 - P2格式支持
- 国产格式（wps, et, dps, ofd）
- 更多图片格式（bmp, svg, webp, psd, tif）
- 更多音视频格式（wav, flv, avi, mkv, webm）
- 其他压缩格式（rar, gzip, jar）

### v1.0.0 - 正式发布
- 特殊格式（xmind, bpmn, drawio, eml, dcm）
- 其他格式（rtf, epub）
- 完善所有功能
- 正式发布

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT