# Implementation Plan: Server Start Command

## Overview

实现跨平台服务器启动脚本，包含平台引导脚本和核心 JavaScript 逻辑。采用增量开发方式，先实现核心功能，再添加平台脚本和测试。

## Tasks

- [x] 1. 创建核心启动脚本 `start.js`
  - [x] 1.1 实现参数解析函数 `parseArgs`
    - 解析 `--port` / `-p` 端口参数
    - 解析 `--no-browser` 参数
    - 解析位置参数作为数据目录
    - 返回 `{dataDir, port, openBrowser}` 对象
    - _Requirements: 3.1, 3.2, 4.1, 4.2, 5.2_
  - [x] 1.2 实现浏览器打开函数
    - 实现 `getBrowserCommand(platform)` 函数
    - 实现 `openBrowser(url)` 异步函数
    - 支持 Windows、macOS、Linux
    - _Requirements: 5.1, 5.3_
  - [x] 1.3 实现主启动逻辑
    - 解析命令行参数
    - 初始化 AgentSociety（enableHttp: true）
    - 显示启动信息（数据目录、服务器 URL）
    - 自动打开浏览器（如果启用）
    - _Requirements: 2.2, 2.3, 2.4, 3.3, 3.4, 4.3, 4.4_

- [x] 2. 创建平台引导脚本
  - [x] 2.1 创建 Unix/macOS 脚本 `start.sh`
    - 检测 bun 或 node 运行时
    - 传递所有参数给 start.js
    - 设置可执行权限
    - _Requirements: 1.1, 1.3, 1.4_
  - [x] 2.2 创建 Windows 脚本 `start.cmd`
    - 检测 bun 或 node 运行时
    - 传递所有参数给 start.js
    - _Requirements: 1.2, 1.3_

- [x] 3. 更新 package.json
  - [x] 3.1 添加 `start` 脚本
    - 配置为 `bun run start.js` 或 `node start.js`
    - _Requirements: 6.1, 6.2_

- [x] 4. Checkpoint - 手动测试
  - 运行 `./start.sh` (Unix) 或 `start.cmd` (Windows)
  - 验证服务器启动并打开浏览器
  - 测试 `--port 3001` 参数
  - 测试 `--no-browser` 参数
  - 测试自定义数据目录

- [x] 5. 添加属性测试
  - [x] 5.1 编写参数解析属性测试
    - **Property 1: 参数解析正确性**
    - **Validates: Requirements 3.2**
  - [x] 5.2 编写端口参数属性测试
    - **Property 2: 端口参数解析正确性**
    - **Validates: Requirements 4.2**
  - [x] 5.3 编写 OS 检测属性测试
    - **Property 3: 操作系统检测正确性**
    - **Validates: Requirements 5.3**

- [x] 6. Final Checkpoint
  - 确保所有测试通过
  - 如有问题请询问用户

## Notes

- 所有任务均为必需，包括测试任务
- 脚本设计尽量简洁，避免过度工程化
