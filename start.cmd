@echo off
REM Agent Society 服务器启动脚本 (Windows)
REM
REM 用法:
REM   start.cmd [数据目录] [选项]
REM
REM 选项:
REM   --port, -p <端口>  HTTP 服务器端口 (默认: 3000)
REM   --no-browser       不自动打开浏览器
REM
REM 示例:
REM   start.cmd                           # 使用默认配置
REM   start.cmd ./my-data                 # 自定义数据目录
REM   start.cmd --port 3001               # 自定义端口
REM   start.cmd ./my-data -p 3001 --no-browser

REM 切换到脚本所在目录
cd /d "%~dp0"

REM 检测 bun
where bun >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    bun run start.js %*
    goto :eof
)

REM 检测 node
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    node start.js %*
    goto :eof
)

REM 未找到运行时
echo 错误: 未找到 bun 或 node 运行时
echo 请安装 bun (https://bun.sh) 或 Node.js (https://nodejs.org)
exit /b 1
