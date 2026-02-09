# Git推送准备文档

**准备时间**: 2024  
**推送目标**: v0.3.0版本

---

## 1. Git状态检查

### 1.1 检查命令

```bash
# 检查当前状态
git status

# 检查远程仓库
git remote -v

# 检查当前分支
git branch

# 查看最近提交
git log --oneline -10
```

### 1.2 预期状态

- **未提交的文件**: 所有新创建的文件（src/previewers/*.js, tests/*.test.js等）
- **远程仓库**: git@github.com:goodjin/file-preview-js.git
- **当前分支**: main 或 master

---

## 2. 提交准备

### 2.1 添加所有更改

```bash
# 添加所有文件
git add .

# 或者添加特定目录
git add src/previewers/
git add tests/
```

### 2.2 创建提交

```bash
# 创建提交
git commit -m "完成v0.3.0版本 - 添加P2格式支持（17种新格式）\\n\\n主要更新：\\n- 新增17个P2格式预览器（WPS, ET, DPS, OFD, BMP, SVG, WebP, PSD, TIF, WAV, FLV, AVI, MKV, WebM, RAR, GZIP, JAR）\\n- 更新应用入口，注册所有新预览器\\n- 新增P2格式预览器测试\\n- 总计支持62种文件格式\\n- 项目总进度达到95%\\n\\n格式统计：\\n- Office文档类：13种（P0: 7, P1: 3, P2: 3）\\n- 文档类：9种（P0: 1, P1: 7, P2: 1）\\n- 图片类：14种（P0: 4, P2: 5, P3: 5）\\n- 音视频类：14种（P0: 4, P1: 5, P2: 5）\\n- 压缩包类：9种（P0: 3, P1: 3, P2: 3）\\n- 其他格式：3种（P3: 3）"
```

---

## 3. 推送到远程

### 3.1 推送命令

```bash
# 推送到远程仓库的main分支
git push origin main

# 或者推送到master分支
git push origin master
```

### 3.2 处理可能的SSH问题

#### 问题：SSH连接失败

**解决方案1：使用HTTPS**
```bash
# 更改远程仓库URL为HTTPS
git remote set-url origin https://github.com/goodjin/file-preview-js.git

# 再次尝试推送
git push origin main
```

**解决方案2：使用Personal Access Token**
```bash
# 使用token推送
git push https://<token>@github.com/goodjin/file-preview-js.git main
```

---

## 4. 常见问题处理

### 4.1 远程仓库不存在

**问题**：fatal: remote origin already exists

**解决方案**：
```bash
# 查看现有远程仓库
git remote -v

# 如果地址不正确，删除后重新添加
git remote remove origin
git remote add origin git@github.com:goodjin/file-preview-js.git

# 或者使用HTTPS
git remote add origin https://github.com/goodjin/file-preview-js.git
```

### 4.2 身份验证失败

**问题**：fatal: Authentication failed

**解决方案**：
1. 检查GitHub凭据
2. 使用Personal Access Token
3. 更新SSH密钥

### 4.3 推送冲突

**问题**：Updates were rejected because the tip of your current branch is behind

**解决方案**：
```bash
# 先拉取远程更新
git pull origin main --rebase

# 解决冲突后再推送
git push origin main
```

---

## 5. 推送后验证

### 5.1 检查推送状态

```bash
# 检查远程状态
git status

# 查看远程提交
git log --oneline -5
```

### 5.2 在GitHub上验证

1. 访问GitHub仓库页面
2. 查看最新提交
3. 检查文件是否都已推送
4. 检查提交信息是否正确

---

## 6. 推送记录

**推送时间**: 2024  
**推送版本**: v0.3.0  
**推送内容**: 
- 17个新增P2格式预览器
- 3个新增P2格式预览器测试
- 更新的应用入口文件
- 完整的v0.3.0版本功能

**预计完成时间**: 2024  
**验证方式**: GitHub仓库页面

---

**文档维护**: 项目经理  
**最后更新**: 2024