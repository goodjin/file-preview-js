# Requirements Document

## Introduction

本功能提供跨平台启动脚本，用于启动 Agent Society 服务器。包含 Shell 引导脚本（用于 Unix/macOS）和 CMD/PowerShell 脚本（用于 Windows），以及核心 JavaScript 启动逻辑。脚本只启动 HTTP 服务器和加载持久化状态，不创建任何智能体，完全以持久化目录中的当前状态为准。支持自动打开浏览器访问 Web 界面。

## Glossary

- **Shell_Script**: Unix/macOS 的 Shell 引导脚本 (`start.sh`)
- **Cmd_Script**: Windows 的 CMD 引导脚本 (`start.cmd`)
- **Core_Script**: 核心 JavaScript 启动逻辑 (`start.js`)
- **Data_Directory**: 数据目录，存储持久化状态的目录路径
- **HTTP_Server**: HTTP 服务器，提供 REST API 和 Web 界面
- **Browser**: 系统默认浏览器

## Requirements

### Requirement 1: 跨平台引导脚本

**User Story:** As a developer, I want platform-specific launcher scripts, so that I can start the server easily on any operating system.

#### Acceptance Criteria

1. THE Shell_Script SHALL be located at `start.sh` in the project root for Unix/macOS
2. THE Cmd_Script SHALL be located at `start.cmd` in the project root for Windows
3. WHEN the Shell_Script or Cmd_Script is executed, THE script SHALL invoke the Core_Script with appropriate runtime (bun or node)
4. THE Shell_Script SHALL be executable without additional configuration

### Requirement 2: 核心启动逻辑

**User Story:** As a developer, I want a core JavaScript entry point, so that the startup logic is shared across platforms.

#### Acceptance Criteria

1. THE Core_Script SHALL be located at `start.js` in the project root
2. THE Core_Script SHALL NOT create any agents automatically
3. THE Core_Script SHALL load existing state from the Data_Directory
4. THE Core_Script SHALL start the HTTP_Server

### Requirement 3: 数据目录配置

**User Story:** As a developer, I want to configure the data directory, so that I can manage different environments.

#### Acceptance Criteria

1. THE Core_Script SHALL use `./agent-society-data` as the default Data_Directory
2. WHEN a positional argument is provided, THE Core_Script SHALL use it as the Data_Directory
3. WHEN the Data_Directory does not exist, THE Core_Script SHALL create it automatically
4. THE Core_Script SHALL display the Data_Directory path on startup

### Requirement 4: HTTP 服务器启动

**User Story:** As a developer, I want the HTTP server to start automatically, so that I can access the web interface.

#### Acceptance Criteria

1. THE Core_Script SHALL start the HTTP_Server on port 3000 by default
2. WHEN the `--port` or `-p` argument is provided, THE Core_Script SHALL use the specified port
3. THE Core_Script SHALL display the server URL after successful startup
4. IF the port is already in use, THEN THE Core_Script SHALL display an error message and exit

### Requirement 5: 自动打开浏览器

**User Story:** As a developer, I want the browser to open automatically, so that I can quickly access the web interface.

#### Acceptance Criteria

1. THE Core_Script SHALL automatically open the Browser to the server URL after startup
2. WHEN the `--no-browser` argument is provided, THE Core_Script SHALL NOT open the Browser
3. THE Core_Script SHALL detect the operating system and use the appropriate command to open the Browser

### Requirement 6: NPM 脚本集成

**User Story:** As a developer, I want to use npm/bun scripts, so that I can start the server with a simple command.

#### Acceptance Criteria

1. THE package.json SHALL include a `start` script that runs the Core_Script
2. WHEN `bun start` or `npm start` is executed, THE Core_Script SHALL be invoked
