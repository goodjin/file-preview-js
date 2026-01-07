#!/bin/bash
# Agent Society 服务器启动脚本 (Unix/macOS)
#
# 用法:
#   ./start.sh [数据目录] [选项]
#
# 选项:
#   --port, -p <端口>  HTTP 服务器端口 (默认: 3000)
#   --no-browser       不自动打开浏览器
#
# 示例:
#   ./start.sh                           # 使用默认配置
#   ./start.sh ./my-data                 # 自定义数据目录
#   ./start.sh --port 3001               # 自定义端口
#   ./start.sh ./my-data -p 3001 --no-browser

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 检测运行时并执行 start.js
if command -v bun &> /dev/null; then
    bun run start.js "$@"
elif command -v node &> /dev/null; then
    node start.js "$@"
else
    echo "错误: 未找到 bun 或 node 运行时"
    echo "请安装 bun (https://bun.sh) 或 Node.js (https://nodejs.org)"
    exit 1
fi
