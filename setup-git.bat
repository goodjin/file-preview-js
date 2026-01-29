@echo off
REM =============================================================================
REM Git操作脚本 - 文件预览系统 (Windows版本)
REM 用途：初始化Git仓库并推送到远程仓库
REM 使用环境：Windows系统，需要安装Git
REM 创建日期：2026-01-29
REM =============================================================================

setlocal enabledelayedexpansion

echo ======================================
echo   文件预览系统 - Git操作脚本
echo ======================================
echo.

REM 远程仓库地址
set REMOTE_REPO=git@github.com:goodjin/file-preview-js.git

REM 检查Git是否安装
where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未检测到Git，请先安装Git
    echo 下载地址：https://git-scm.com/download/win
    pause
    exit /b 1
)

echo [OK] Git已安装
for /f "tokens=*" %%i in ('git --version') do echo       版本: %%i
echo.

REM 检查是否在项目根目录
if not exist .gitignore (
    echo [警告] 未检测到项目配置文件
    echo 请确保在项目根目录下执行此脚本
    set /p CONTINUE="是否继续？(y/n): "
    if /i not "!CONTINUE!"=="y" exit /b 1
)

echo ======================================
echo 步骤 1/5: 初始化Git仓库
echo ======================================
if exist .git (
    echo [警告] Git仓库已存在，跳过初始化
) else (
    git init
    echo [OK] Git仓库初始化完成
)
echo.

echo ======================================
echo 步骤 2/5: 添加文件到暂存区
echo ======================================
git add .
echo [OK] 文件已添加到暂存区
echo.

echo ======================================
echo 步骤 3/5: 提交文件
echo ======================================
set COMMIT_MESSAGE=feat: 初始化文件预览系统 v0.1.0

git commit -m "%COMMIT_MESSAGE%"
echo [OK] 提交完成
echo.

echo ======================================
echo 步骤 4/5: 配置远程仓库
echo ======================================
git remote get-url origin >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('git remote get-url origin') do set EXISTING_REMOTE=%%i
    if "!EXISTING_REMOTE!"=="%REMOTE_REPO%" (
        echo [警告] 远程仓库已配置: %REMOTE_REPO%
    ) else (
        echo [警告] 更新远程仓库地址
        git remote set-url origin %REMOTE_REPO%
        echo [OK] 远程仓库已更新为: %REMOTE_REPO%
    )
) else (
    git remote add origin %REMOTE_REPO%
    echo [OK] 远程仓库已添加: %REMOTE_REPO%
)
echo.

echo ======================================
echo 步骤 5/5: 推送到远程仓库
echo ======================================
echo 推送到远程仓库...

REM 尝试推送到main分支，如果失败则尝试master，再失败则尝试当前分支
git push -u origin main
if %ERRORLEVEL% EQU 0 (
    echo [OK] 推送完成 (main分支)
) else (
    git push -u origin master
    if %ERRORLEVEL% EQU 0 (
        echo [OK] 推送完成 (master分支)
    ) else (
        for /f "tokens=*" %%i in ('git rev-parse --abbrev-ref HEAD') do set CURRENT_BRANCH=%%i
        git push -u origin !CURRENT_BRANCH!
        if %ERRORLEVEL% EQU 0 (
            echo [OK] 推送完成 (!CURRENT_BRANCH!分支)
        ) else (
            echo [错误] 推送失败，请检查网络连接和SSH密钥配置
            pause
            exit /b 1
        )
    )
)
echo.

echo ======================================
echo [OK] Git操作全部完成！
echo ======================================
echo.
echo 当前状态：
git status
echo.
echo 远程仓库地址：
git remote -v
echo.
echo [成功] 文件预览系统已成功推送到GitHub
echo 仓库地址：https://github.com/goodjin/file-preview-js
echo.

pause
