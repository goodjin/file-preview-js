#!/bin/bash

################################################################################
# Git操作脚本 - 文件预览系统
# 用途：初始化Git仓库并推送到远程仓库
# 使用环境：Linux/Mac系统，需要安装Git
# 创建日期：2026-01-29
################################################################################

set -e  # 遇到错误立即退出

echo "======================================"
echo "  文件预览系统 - Git操作脚本"
echo "======================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 远程仓库地址
REMOTE_REPO="git@github.com:goodjin/file-preview-js.git"

# 检查Git是否安装
if ! command -v git &> /dev/null; then
    echo -e "${RED}错误: 未检测到Git，请先安装Git${NC}"
    echo "安装命令："
    echo "  Ubuntu/Debian: sudo apt-get install git"
    echo "  CentOS/RHEL:   sudo yum install git"
    echo "  macOS:         brew install git"
    exit 1
fi

echo -e "${GREEN}✓ Git已安装${NC}"
echo "  版本: $(git --version)"
echo ""

# 检查是否在项目根目录
if [ ! -f ".gitignore" ] || [ ! -f "README.md" ]; then
    echo -e "${YELLOW}警告: 未检测到项目配置文件${NC}"
    echo "请确保在项目根目录下执行此脚本"
    read -p "是否继续？(y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "======================================"
echo "步骤 1/5: 初始化Git仓库"
echo "======================================"
if [ -d ".git" ]; then
    echo -e "${YELLOW}Git仓库已存在，跳过初始化${NC}"
else
    git init
    echo -e "${GREEN}✓ Git仓库初始化完成${NC}"
fi
echo ""

echo "======================================"
echo "步骤 2/5: 添加文件到暂存区"
echo "======================================"
git add .
echo -e "${GREEN}✓ 文件已添加到暂存区${NC}"
echo ""

# 显示将要提交的文件
echo "已暂存的文件："
git status --short
echo ""

echo "======================================"
echo "步骤 3/5: 提交文件"
echo "======================================"
COMMIT_MESSAGE="feat: 初始化文件预览系统 v0.1.0

- 配置 .gitignore 忽略规则
- 创建 README.md 项目文档
- 创建 docs/git操作计划.md 版本控制计划
- 创建 docs/git执行指南.md 执行说明
- 配置Git版本控制基础环境"

git commit -m "$COMMIT_MESSAGE"
echo -e "${GREEN}✓ 提交完成${NC}"
echo ""

echo "======================================"
echo "步骤 4/5: 配置远程仓库"
echo "======================================"
# 检查是否已配置远程仓库
if git remote get-url origin &> /dev/null; then
    EXISTING_REMOTE=$(git remote get-url origin)
    if [ "$EXISTING_REMOTE" = "$REMOTE_REPO" ]; then
        echo -e "${YELLOW}远程仓库已配置: $REMOTE_REPO${NC}"
    else
        echo -e "${YELLOW}更新远程仓库地址${NC}"
        git remote set-url origin "$REMOTE_REPO"
        echo -e "${GREEN}✓ 远程仓库已更新为: $REMOTE_REPO${NC}"
    fi
else
    git remote add origin "$REMOTE_REPO"
    echo -e "${GREEN}✓ 远程仓库已添加: $REMOTE_REPO${NC}"
fi
echo ""

echo "======================================"
echo "步骤 5/5: 推送到远程仓库"
echo "======================================"
echo "推送到远程仓库..."
git push -u origin main || git push -u origin master || git push -u origin $(git rev-parse --abbrev-ref HEAD)
echo -e "${GREEN}✓ 推送完成${NC}"
echo ""

echo "======================================"
echo "✅ Git操作全部完成！"
echo "======================================"
echo ""
echo "当前状态："
git status
echo ""
echo "远程仓库地址："
git remote -v
echo ""
echo -e "${GREEN}恭喜！文件预览系统已成功推送到GitHub${NC}"
echo "仓库地址：https://github.com/goodjin/file-preview-js"
echo ""
