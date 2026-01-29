#!/bin/bash

# Git操作自动化脚本
# 用于文件预览系统代码提交和推送

# 配置变量
REPO_URL="git@github.com:goodjin/file-preview-js.git"
MAIN_BRANCH="main"  # 如果远程仓库使用master，请改为master

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# 检查是否安装了Git
check_git() {
    if ! command -v git &> /dev/null; then
        print_error "Git未安装，请先安装Git"
        exit 1
    fi
    print_success "Git已安装"
}

# 检查Git配置
check_git_config() {
    if [ -z "$(git config user.name)" ]; then
        print_error "Git用户名未配置"
        read -p "请输入Git用户名: " username
        git config user.name "$username"
    fi
    
    if [ -z "$(git config user.email)" ]; then
        print_error "Git用户邮箱未配置"
        read -p "请输入Git用户邮箱: " email
        git config user.email "$email"
    fi
    
    print_success "Git配置: $(git config user.name) <$(git config user.email)>"
}

# 初始化Git仓库
init_git() {
    print_info "正在初始化Git仓库..."
    if [ ! -d .git ]; then
        git init
        print_success "Git仓库初始化完成"
    else
        print_info "Git仓库已存在"
    fi
}

# 添加远程仓库
add_remote() {
    print_info "正在配置远程仓库..."
    
    # 检查远程仓库是否已存在
    if git remote get-url origin &> /dev/null; then
        current_url=$(git remote get-url origin)
        if [ "$current_url" != "$REPO_URL" ]; then
            print_info "远程仓库URL已存在: $current_url"
            read -p "是否要更新远程仓库URL? (y/n): " update
            if [ "$update" = "y" ]; then
                git remote remove origin
                git remote add origin "$REPO_URL"
                print_success "远程仓库URL已更新"
            fi
        else
            print_success "远程仓库已配置正确"
        fi
    else
        git remote add origin "$REPO_URL"
        print_success "远程仓库添加成功"
    fi
}

# 添加所有文件到暂存区
add_files() {
    print_info "正在添加文件到暂存区..."
    git add .
    print_success "文件已添加到暂存区"
    
    # 显示添加的文件统计
    file_count=$(git diff --cached --name-only | wc -l)
    print_info "共添加 $file_count 个文件"
}

# 提交代码
commit_code() {
    print_info "正在提交代码..."
    
    # 提交信息
    COMMIT_MESSAGE="feat: 初始化文件预览系统v0.1.0

- 完成核心框架层（PreviewerFactory、FileTypeDetector、EventBus、StateManager）
- 完成UI层和适配器层
- 完成Office预览模块（docx、xlsx、pptx）
- 完成文档预览模块（PDF、TXT、MD、XML、JSON）
- 完成图片预览模块（JPG、PNG、GIF、BMP、WebP、PSD、SVG开发中、TIFF开发中）
- 包含完整的单元测试和集成测试
- 符合Conventional Commits规范"

    git commit -m "$COMMIT_MESSAGE"
    print_success "代码提交完成"
}

# 推送到远程仓库
push_to_remote() {
    print_info "正在推送到远程仓库..."
    
    # 检查远程分支是否存在
    if git ls-remote --heads origin "$MAIN_BRANCH" | grep -q "$MAIN_BRANCH"; then
        print_info "远程分支 $MAIN_BRANCH 已存在，执行pull..."
        git pull origin "$MAIN_BRANCH" --allow-unrelated-histories || print_error "Pull失败，可能需要手动解决冲突"
    fi
    
    # 推送代码
    if git push -u origin "$MAIN_BRANCH"; then
        print_success "代码推送成功！"
        print_info "仓库地址: https://github.com/goodjin/file-preview-js"
    else
        print_error "代码推送失败，请检查网络连接和权限"
        print_info "可能需要配置SSH密钥"
    fi
}

# 主函数
main() {
    echo "=========================================="
    echo "  文件预览系统 - Git操作自动化脚本"
    echo "=========================================="
    echo ""
    
    # 检查是否在正确的目录
    if [ ! -f "README.md" ] && [ ! -d "src" ]; then
        print_error "未找到项目文件，请确保在项目根目录下执行此脚本"
        exit 1
    fi
    
    # 执行Git操作
    check_git
    check_git_config
    init_git
    add_remote
    add_files
    commit_code
    
    # 询问是否立即推送
    echo ""
    read -p "是否立即推送到远程仓库? (y/n): " push_now
    if [ "$push_now" = "y" ]; then
        push_to_remote
    else
        print_info "代码已提交到本地仓库，您可以稍后手动执行: git push -u origin $MAIN_BRANCH"
    fi
    
    echo ""
    echo "=========================================="
    echo "  操作完成！"
    echo "=========================================="
}

# 执行主函数
main
