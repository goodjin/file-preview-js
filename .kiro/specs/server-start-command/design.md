# Design Document: Server Start Command

## Overview

本设计实现一个简洁的跨平台服务器启动方案，包含平台特定的引导脚本和共享的 JavaScript 核心逻辑。设计目标是最小化复杂度，让用户能够一键启动服务器并访问 Web 界面。

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Entry Points                        │
├─────────────────┬─────────────────┬─────────────────────────┤
│   start.sh      │   start.cmd     │   bun start / npm start │
│   (Unix/macOS)  │   (Windows)     │   (package.json)        │
└────────┬────────┴────────┬────────┴────────────┬────────────┘
         │                 │                      │
         └─────────────────┼──────────────────────┘
                           ▼
              ┌────────────────────────┐
              │       start.js         │
              │   (Core JavaScript)    │
              └───────────┬────────────┘
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Parse Args  │  │ Init System │  │ Open Browser│
└─────────────┘  └──────┬──────┘  └─────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │  AgentSociety   │
              │  (HTTP Server)  │
              └─────────────────┘
```

## Components and Interfaces

### 1. Shell Script (`start.sh`)

Unix/macOS 引导脚本，负责：
- 检测可用的 JavaScript 运行时（优先 bun，回退 node）
- 传递命令行参数给 `start.js`

```bash
#!/bin/bash
# 检测运行时并执行 start.js
if command -v bun &> /dev/null; then
    bun run start.js "$@"
elif command -v node &> /dev/null; then
    node start.js "$@"
else
    echo "Error: Neither bun nor node found"
    exit 1
fi
```

### 2. CMD Script (`start.cmd`)

Windows 引导脚本，负责：
- 检测可用的 JavaScript 运行时
- 传递命令行参数给 `start.js`

```cmd
@echo off
where bun >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    bun run start.js %*
) else (
    where node >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        node start.js %*
    ) else (
        echo Error: Neither bun nor node found
        exit /b 1
    )
)
```

### 3. Core Script (`start.js`)

JavaScript 核心逻辑，负责：
- 解析命令行参数
- 初始化 AgentSociety（仅 HTTP 服务器模式）
- 打开浏览器

#### 参数解析接口

```javascript
/**
 * 解析命令行参数
 * @param {string[]} args - process.argv.slice(2)
 * @returns {{dataDir: string, port: number, openBrowser: boolean}}
 */
function parseArgs(args) {
  // 默认值
  let dataDir = "./agent-society-data";
  let port = 3000;
  let openBrowser = true;
  
  // 解析参数
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--port" || arg === "-p") {
      port = parseInt(args[++i], 10);
    } else if (arg === "--no-browser") {
      openBrowser = false;
    } else if (!arg.startsWith("-")) {
      dataDir = arg;
    }
  }
  
  return { dataDir, port, openBrowser };
}
```

#### 浏览器打开接口

```javascript
/**
 * 获取打开浏览器的命令
 * @param {string} platform - process.platform
 * @returns {string} 打开浏览器的命令
 */
function getBrowserCommand(platform) {
  switch (platform) {
    case "darwin": return "open";
    case "win32": return "start";
    default: return "xdg-open";
  }
}

/**
 * 打开浏览器
 * @param {string} url - 要打开的 URL
 */
async function openBrowser(url) {
  const { exec } = await import("node:child_process");
  const cmd = getBrowserCommand(process.platform);
  exec(`${cmd} ${url}`);
}
```

## Data Models

### 命令行参数模型

```typescript
interface StartOptions {
  dataDir: string;      // 数据目录路径
  port: number;         // HTTP 服务器端口
  openBrowser: boolean; // 是否自动打开浏览器
}
```

### 默认配置

| 参数 | 默认值 | 说明 |
|------|--------|------|
| dataDir | `./agent-society-data` | 持久化数据目录 |
| port | `3000` | HTTP 服务器端口 |
| openBrowser | `true` | 自动打开浏览器 |

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 参数解析正确性

*For any* valid command line arguments containing a data directory path, the `parseArgs` function should correctly extract and return that path as the `dataDir` field.

**Validates: Requirements 3.2**

### Property 2: 端口参数解析正确性

*For any* valid port number (1-65535) provided via `--port` or `-p` argument, the `parseArgs` function should correctly extract and return that port number.

**Validates: Requirements 4.2**

### Property 3: 操作系统检测正确性

*For any* supported platform identifier (`darwin`, `win32`, `linux`), the `getBrowserCommand` function should return the appropriate browser opening command.

**Validates: Requirements 5.3**

## Error Handling

| 错误场景 | 处理方式 |
|----------|----------|
| 端口被占用 | 显示错误信息并退出（exit code 1） |
| 无效端口号 | 使用默认端口 3000 |
| 数据目录创建失败 | 显示错误信息并退出 |
| 浏览器打开失败 | 仅打印警告，不影响服务器运行 |

## Testing Strategy

### 单元测试

由于本功能主要是启动脚本，复杂度较低，测试重点在于：

1. **参数解析测试**：验证各种参数组合的解析结果
2. **OS 检测测试**：验证不同平台返回正确的浏览器命令

### 属性测试

使用 `fast-check` 进行属性测试：

1. **Property 1**: 生成随机路径字符串，验证解析结果
2. **Property 2**: 生成 1-65535 范围内的随机端口，验证解析结果
3. **Property 3**: 测试所有支持的平台标识符

### 测试配置

- 属性测试最少运行 100 次迭代
- 测试文件位置：`test/start.test.js`
- 测试标签格式：`Feature: server-start-command, Property N: description`
