# 文件预览系统 UI 设计文档

## 1. 整体界面布局设计

### 1.1 布局结构

采用经典的三栏式布局（或两栏式，视屏幕尺寸调整）：

```
┌─────────────────────────────────────────────────────┐
│                    顶部导航栏                         │
│  Logo | 文件预览系统 | 模式切换（网格/列表）| 设置    │
├───────────────┬───────────────────────────────────────┤
│               │                                       │
│   文件列表区   │              预览区域                │
│               │                                       │
│  [文件1]      │        文件预览内容                   │
│  [文件2]      │                                       │
│  [文件3]      │                                       │
│  ...         │                                       │
│               │                                       │
└───────────────┴───────────────────────────────────────┘
```

### 1.2 布局响应式规则

| 屏幕尺寸 | 布局模式 | 文件列表宽度 | 预览区域行为 |
|---------|---------|------------|------------|
| ≥1200px | 三栏布局 | 300px（固定） | 占据剩余空间 |
| 768-1199px | 两栏布局 | 280px（固定） | 占据剩余空间 |
| <768px | 单栏布局 | 占据100% | 全屏模式，通过工具栏切换 |

### 1.3 顶部导航栏

**高度**：60px  
**背景色**：#ffffff  
**边框**：1px solid #e0e0e0

**左侧**：
- Logo图标 + 文字（16px，加粗）
- 主标题：文件预览系统

**右侧**：
- 视图切换：网格图标 / 列表图标
- 暗色模式切换：月亮/太阳图标
- 设置按钮：齿轮图标

### 1.4 文件列表区

**宽度**：300px（桌面）/ 280px（平板）  
**背景色**：#f8f9fa  
**边框**：1px solid #e0e0e0（右侧）

**顶部操作栏**（高度：50px）：
- 上传按钮（主按钮，蓝色）
- 批量删除按钮（次按钮，灰色）
- 搜索框（可展开）

**文件列表项**：
- 文件图标（根据文件类型显示不同图标）
- 文件名（单行省略）
- 文件大小
- 修改时间
- 选中状态：蓝色背景 + 左侧蓝条

### 1.5 预览区域

**背景色**：#ffffff  
**占据剩余空间**

**顶部工具栏**（高度：50px，仅在预览模式显示）：
- 返回按钮（单栏模式）
- 缩放控制：放大 / 缩小 / 适应屏幕 / 100%
- 旋转按钮（图片类）
- 全屏按钮
- 下载按钮
- 更多操作（三点菜单）

**内容区域**：
- 居中显示文件内容
- 支持滚动（文件内容超过视口）
- 自适应缩放

## 2. 组件设计规范

### 2.1 按钮组件

#### 主按钮
```css
background: #007bff;
color: #ffffff;
border-radius: 4px;
padding: 8px 16px;
font-size: 14px;
border: none;
cursor: pointer;
transition: all 0.2s;

&:hover {
  background: #0056b3;
}

&:active {
  transform: scale(0.98);
}
```

#### 次按钮
```css
background: #ffffff;
color: #333333;
border: 1px solid #d0d0d0;
border-radius: 4px;
padding: 8px 16px;
font-size: 14px;
cursor: pointer;
transition: all 0.2s;

&:hover {
  background: #f0f0f0;
}
```

#### 图标按钮
```css
background: transparent;
color: #666666;
border: none;
padding: 8px;
border-radius: 4px;
cursor: pointer;
font-size: 18px;
transition: all 0.2s;

&:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #333333;
}
```

### 2.2 加载状态组件

#### 线性进度条
```html
<div class="progress-container">
  <div class="progress-bar">
    <div class="progress-fill" style="width: 45%"></div>
  </div>
  <div class="progress-text">解析中... 45%</div>
</div>
```

```css
.progress-bar {
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #007bff, #00d4ff);
  transition: width 0.3s ease;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { opacity: 0.8; }
  50% { opacity: 1; }
  100% { opacity: 0.8; }
}
```

#### 圆形加载动画
```html
<div class="spinner">
  <div class="spinner-circle"></div>
</div>
<div class="loading-text">正在解析文件...</div>
```

```css
.spinner-circle {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

#### 骨架屏（用于大文件加载）
```html
<div class="skeleton-loader">
  <div class="skeleton-header"></div>
  <div class="skeleton-content">
    <div class="skeleton-line"></div>
    <div class="skeleton-line short"></div>
    <div class="skeleton-line"></div>
  </div>
</div>
```

### 2.3 错误提示组件

#### 错误提示卡片
```html
<div class="error-card">
  <div class="error-icon">⚠️</div>
  <div class="error-title">文件解析失败</div>
  <div class="error-message">
    该PDF文件使用了不支持的加密算法，无法解析。
  </div>
  <div class="error-suggestion">
    建议解决方案：
    <ul>
      <li>尝试移除文件密码后重新上传</li>
      <li>使用其他PDF阅读器打开并另存为无密码版本</li>
    </ul>
  </div>
  <button class="retry-btn">重试</button>
</div>
```

```css
.error-card {
  max-width: 400px;
  background: #fff5f5;
  border: 1px solid #fed7d7;
  border-radius: 8px;
  padding: 24px;
  text-align: center;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-title {
  font-size: 18px;
  font-weight: bold;
  color: #c53030;
  margin-bottom: 8px;
}

.error-message {
  color: #4a5568;
  margin-bottom: 16px;
}

.error-suggestion {
  text-align: left;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 16px;
}
```

#### Toast 轻提示
```html
<div class="toast toast-error">
  <span class="toast-icon">✕</span>
  <span class="toast-message">文件上传失败：文件大小超过50MB</span>
</div>
```

```css
.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 20px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.3s ease;
  z-index: 1000;
}

.toast-error {
  background: #c53030;
  color: #ffffff;
}

.toast-success {
  background: #38a169;
  color: #ffffff;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```

### 2.4 文件列表项组件

```html
<div class="file-item selected">
  <div class="file-icon">📄</div>
  <div class="file-info">
    <div class="file-name">报告.docx</div>
    <div class="file-meta">2.5 MB · 今天 14:30</div>
  </div>
  <div class="file-actions">
    <button class="icon-btn download">⬇️</button>
    <button class="icon-btn delete">🗑️</button>
  </div>
</div>
```

```css
.file-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #e0e0e0;
  cursor: pointer;
  transition: background 0.2s;
}

.file-item:hover {
  background: #f0f0f0;
}

.file-item.selected {
  background: #e3f2fd;
  border-left: 3px solid #007bff;
}

.file-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-right: 12px;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-meta {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}
```

### 2.5 上传区域组件

```html
<div class="upload-area">
  <div class="upload-icon">☁️</div>
  <div class="upload-title">拖拽文件到这里</div>
  <div class="upload-desc">或者点击上传文件</div>
  <div class="upload-formats">支持 45 种文件格式</div>
  <button class="upload-btn">选择文件</button>
  <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,...">
</div>
```

```css
.upload-area {
  border: 2px dashed #d0d0d0;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  transition: all 0.3s;
  cursor: pointer;
}

.upload-area:hover,
.upload-area.dragover {
  border-color: #007bff;
  background: #f0f8ff;
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.upload-title {
  font-size: 18px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.upload-desc {
  font-size: 14px;
  color: #999;
  margin-bottom: 12px;
}

.upload-formats {
  font-size: 12px;
  color: #666;
  background: #f5f5f5;
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  margin-bottom: 16px;
}
```

## 3. 交互流程设计

### 3.1 文件上传流程

```
用户操作                →  系统响应                →  UI反馈
─────────────────────────────────────────────────────
点击上传按钮            →  打开文件选择器           →  文件选择器弹出
选择文件（多选）        →  验证文件格式和大小       →  文件列表添加文件项
                        →  开始解析文件             →  显示加载进度
                        →  解析完成                 →  文件图标显示为实际类型
                                                  →  自动选中第一个文件

拖拽文件到上传区域      →  验证文件格式和大小       →  上传区域高亮
                        →  开始解析文件             →  文件列表添加文件项
                                                  →  显示加载进度
```

### 3.2 文件预览流程

```
用户操作                →  系统响应                →  UI反馈
─────────────────────────────────────────────────────
点击文件列表项          →  加载文件内容             →  显示加载动画
                        →  解析文件                 →  显示加载进度
                        →  渲染预览内容             →  显示文件内容
                                                  →  文件列表项选中
                                                  →  预览工具栏显示

切换到另一个文件        →  保存当前预览状态         →  -
                        →  加载新文件内容           →  显示加载动画
                        →  渲染新文件内容           →  显示新文件内容
                                                  →  文件列表项切换选中
```

### 3.3 文件操作流程

#### 缩放操作
```
点击放大按钮            →  缩放级别 +25%            →  文件内容放大，缩放值更新
点击缩小按钮            →  缩放级别 -25%            →  文件内容缩小，缩放值更新
点击适应屏幕            →  自动计算缩放比例         →  文件内容完整显示
点击100%                →  缩放级别设为100%         →  文件内容按原始尺寸显示
```

#### 旋转操作（图片类）
```
点击旋转按钮            →  文件旋转90°             →  文件内容旋转，显示当前角度
```

#### 全屏操作
```
点击全屏按钮            →  预览区域全屏            →  预览区域占满屏幕
按ESC键                →  退出全屏                →  预览区域恢复正常
```

#### 下载操作
```
点击下载按钮            →  生成文件Blob            →  浏览器下载文件
```

### 3.4 错误处理流程

```
场景                →  错误类型                →  UI处理
─────────────────────────────────────────────
文件格式不支持      →  格式错误               →  显示错误卡片
                                            →  提供支持的格式列表
                                            →  提供格式转换建议

文件过大（>50MB）    →  大小错误               →  显示Toast提示
                                            →  文件列表项显示警告图标
                                            →  禁用预览操作

文件解析失败        →  解析错误               →  显示错误卡片
                                            →  显示失败原因
                                            →  提供解决方案建议
                                            →  提供重试按钮

文件加载超时        →  超时错误               →  显示错误卡片
                                            →  提示网络或文件问题
                                            →  提供重试按钮
```

## 4. 加载状态设计

### 4.1 加载场景与动画

| 场景 | 加载类型 | 动画类型 | 提示文字 |
|-----|---------|---------|---------|
| 文件上传中 | 线性进度条 | 进度条动画 + 百分比 | 上传中... 45% |
| 文件解析中 | 线性进度条 | 进度条动画 + 百分比 | 解析中... 67% |
| 大文件解析（>10MB） | 骨架屏 | 骨架屏闪烁 + 进度条 | 正在解析大文件，请稍候... |
| 文件渲染中 | 圆形加载动画 | 旋转动画 | 正在渲染... |
| 文件切换中 | 淡入淡出 | 透明度过渡 | 加载中... |

### 4.2 加载进度反馈

#### 三级进度提示
```
阶段1：文件读取（0-30%）
  ├── 读取文件内容
  └── 验证文件格式

阶段2：文件解析（30-80%）
  ├── 解析文件结构
  ├── 提取文本/图片等元素
  └── 构建渲染树

阶段3：内容渲染（80-100%）
  ├── 渲染文件内容
  └── 优化显示效果
```

#### 进度提示文案
```javascript
const loadingMessages = {
  uploading: {
    0: '准备上传文件...',
    50: '上传中...',
    90: '即将完成...'
  },
  parsing: {
    0: '开始解析文件...',
    30: '正在解析文件结构...',
    60: '提取文件内容...',
    90: '准备渲染...'
  },
  rendering: {
    0: '开始渲染...',
    50: '渲染中...',
    90: '即将完成...'
  }
}
```

### 4.3 超时处理

**默认超时时间**：
- 小文件（<1MB）：30秒
- 中文件（1-10MB）：60秒
- 大文件（10-50MB）：120秒

**超时UI反馈**：
```html
<div class="timeout-card">
  <div class="timeout-icon">⏱️</div>
  <div class="timeout-title">加载超时</div>
  <div class="timeout-message">
    文件加载时间过长，可能是文件过大或包含复杂内容。
  </div>
  <div class="timeout-actions">
    <button class="retry-btn">重试</button>
    <button class="cancel-btn">取消</button>
  </div>
</div>
```

## 5. 错误状态设计

### 5.1 错误分类与处理

#### 类型1：格式不支持
```html
<div class="error-card">
  <div class="error-icon">📁</div>
  <div class="error-title">不支持的文件格式</div>
  <div class="error-message">
    文件 .psd 格式暂不支持预览。
  </div>
  <div class="error-suggestion">
    当前支持的格式：
    <div class="supported-formats">
      <span class="format-tag">PDF</span>
      <span class="format-tag">DOCX</span>
      <span class="format-tag">XLSX</span>
      <span class="format-tag">JPG</span>
      <span class="format-tag">PNG</span>
      ...
    </div>
  </div>
</div>
```

#### 类型2：文件过大
```html
<div class="error-card warning">
  <div class="error-icon">⚠️</div>
  <div class="error-title">文件过大</div>
  <div class="error-message">
    文件大小为 85.5 MB，超过 50 MB 限制。
  </div>
  <div class="error-suggestion">
    建议操作：
    <ul>
      <li>压缩文件后再上传</li>
      <li>分拆文件内容</li>
    </ul>
  </div>
</div>
```

#### 类型3：文件损坏
```html
<div class="error-card">
  <div class="error-icon">🔧</div>
  <div class="error-title">文件损坏</div>
  <div class="error-message">
    该文件可能已损坏，无法正常解析。
  </div>
  <div class="error-suggestion">
    建议操作：
    <ul>
      <li>检查文件是否完整</li>
      <li>尝试从备份恢复</li>
      <li>重新下载或转换格式</li>
    </ul>
  </div>
  <div class="error-actions">
    <button class="retry-btn">重新加载</button>
    <button class="delete-btn">删除文件</button>
  </div>
</div>
```

#### 类型4：加密文件
```html
<div class="error-card">
  <div class="error-icon">🔒</div>
  <div class="error-title">文件已加密</div>
  <div class="error-message">
    该文件使用了密码保护，无法预览。
  </div>
  <div class="password-input-area">
    <input type="password" placeholder="请输入密码" />
    <button class="unlock-btn">解锁</button>
  </div>
  <div class="error-suggestion">
    提示：密码错误超过3次将锁定尝试。
  </div>
</div>
```

### 5.2 错误状态视觉规范

| 错误级别 | 背景色 | 边框色 | 图标 | 主要文字颜色 |
|---------|-------|-------|------|------------|
| 严重错误 | #fff5f5 | #fed7d7 | 🔴 / ⚠️ | #c53030 |
| 警告 | #fffaf0 | #feebc8 | 🟡 | #dd6b20 |
| 提示 | #e6fffa | #b2f5ea | 🔵 | #319795 |
| 信息 | #ebf8ff | #bee3f8 | ℹ️ | #3182ce |

### 5.3 错误恢复机制

#### 自动重试机制
```javascript
const retryConfig = {
  maxRetries: 3,
  retryDelay: 1000, // 1秒
  backoffMultiplier: 2 // 指数退避
}

// 重试间隔：1秒 → 2秒 → 4秒
```

#### 重试UI反馈
```
第1次失败：显示错误卡片 + "重试"按钮
第2次失败：显示错误卡片 + "重试 (1/3)" + 提示"第2次尝试"
第3次失败：显示错误卡片 + "重试 (2/3)" + 提示"最后一次尝试"
第4次失败：显示错误卡片 + 禁用"重试"按钮 + 提示"请联系管理员"
```

## 6. 响应式设计方案

### 6.1 断点设计

| 断点名称 | 最小宽度 | 典型设备 | 布局策略 |
|---------|---------|---------|---------|
| 手机竖屏 | < 768px | iPhone SE, Android 手机 | 单栏，文件列表/预览切换 |
| 平板竖屏 | 768px - 1023px | iPad, Android 平板 | 两栏，文件列表窄（240px） |
| 平板横屏 | 1024px - 1199px | iPad Pro, Surface | 两栏，文件列表中（280px） |
| 桌面 | ≥ 1200px | 笔记本, 台式机 | 两栏，文件列表宽（300px） |
| 大屏 | ≥ 1600px | 高分辨率显示器 | 三栏，文件列表、预览、信息面板 |

### 6.2 移动端适配（< 768px）

#### 导航栏适配
```css
@media (max-width: 767px) {
  .navbar {
    height: 56px;
    padding: 0 16px;
  }
  
  .navbar-title {
    font-size: 14px;
  }
  
  .navbar-actions {
    gap: 8px;
  }
}
```

#### 单栏模式切换
```html
<!-- 文件列表模式 -->
<div class="mobile-view file-list-mode">
  <div class="mobile-header">
    <h1>文件列表</h1>
    <button class="mode-switch-btn">预览</button>
  </div>
  <div class="file-list">...</div>
</div>

<!-- 预览模式 -->
<div class="mobile-view preview-mode">
  <div class="mobile-header">
    <button class="back-btn">← 返回</button>
    <h1 class="file-name">报告.docx</h1>
  </div>
  <div class="preview-content">...</div>
  <div class="mobile-toolbar">...</div>
</div>
```

#### 触摸操作优化
```css
.file-item {
  min-height: 56px; /* 增加触摸区域 */
  padding: 12px 16px;
}

.icon-btn {
  min-width: 44px;
  min-height: 44px;
  padding: 10px;
}
```

### 6.3 平板适配（768px - 1199px）

```css
@media (min-width: 768px) and (max-width: 1199px) {
  .file-list {
    width: 280px;
    flex-shrink: 0;
  }
  
  .preview-area {
    flex: 1;
  }
  
  .preview-toolbar {
    padding: 8px 12px;
  }
  
  .toolbar-group {
    gap: 4px;
  }
}
```

### 6.4 桌面适配（≥ 1200px）

```css
@media (min-width: 1200px) {
  .file-list {
    width: 300px;
  }
  
  .preview-toolbar {
    padding: 12px 16px;
  }
  
  .toolbar-group {
    gap: 8px;
  }
}
```

### 6.5 横竖屏切换处理

```javascript
// 检测屏幕方向变化
window.addEventListener('orientationchange', () => {
  const isPortrait = window.innerHeight > window.innerWidth;
  
  if (isPortrait) {
    // 竖屏：切换到单栏模式
    document.body.classList.add('mobile-portrait');
  } else {
    // 横屏：切换到两栏模式
    document.body.classList.remove('mobile-portrait');
  }
});
```

### 6.6 字体和间距响应式

```css
:root {
  --font-size-base: 14px;
  --font-size-small: 12px;
  --font-size-large: 16px;
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
}

@media (max-width: 767px) {
  :root {
    --font-size-base: 13px;
    --font-size-small: 11px;
    --font-size-large: 15px;
    --spacing-xs: 3px;
    --spacing-sm: 6px;
    --spacing-md: 12px;
    --spacing-lg: 20px;
  }
}
```

## 7. 交互细节设计

### 7.1 快捷键支持

| 快捷键 | 功能 | 作用范围 |
|-------|------|---------|
| Ctrl/Cmd + O | 打开文件选择器 | 全局 |
| Ctrl/Cmd + F | 搜索文件 | 文件列表区 |
| ↑ / ↓ | 上下选择文件 | 文件列表区 |
| Enter | 打开选中文件 | 文件列表区 |
| Delete | 删除选中文件 | 文件列表区 |
| + / = | 放大 | 预览区 |
| - | 缩小 | 预览区 |
| 0 | 重置缩放 | 预览区 |
| F | 适应屏幕 | 预览区 |
| R | 旋转（图片） | 预览区 |
| F11 | 全屏切换 | 预览区 |
| Esc | 退出全屏 / 返回 | 预览区 |

### 7.2 拖拽上传

```javascript
// 拖拽进入
document.body.addEventListener('dragenter', (e) => {
  e.preventDefault();
  document.body.classList.add('dragging');
});

// 拖拽离开
document.body.addEventListener('dragleave', (e) => {
  e.preventDefault();
  document.body.classList.remove('dragging');
});

// 放置文件
document.body.addEventListener('drop', (e) => {
  e.preventDefault();
  document.body.classList.remove('dragging');
  
  const files = Array.from(e.dataTransfer.files);
  handleFiles(files);
});
```

### 7.3 滚动加载优化

```javascript
// 虚拟滚动（文件列表）
const virtualScroll = {
  itemHeight: 72,
  bufferSize: 5,
  render: (startIndex, endIndex) => {
    // 只渲染可视区域内的文件项
  }
};
```

### 7.4 文件预览缓存

```javascript
// 缓存已解析的文件
const fileCache = new Map();

async function loadFile(fileId) {
  // 检查缓存
  if (fileCache.has(fileId)) {
    return fileCache.get(fileId);
  }
  
  // 解析文件
  const content = await parseFile(fileId);
  fileCache.set(fileId, content);
  
  return content;
}
```

### 7.5 动画与过渡

```css
/* 页面切换动画 */
.page-transition {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.page-enter {
  opacity: 0;
  transform: translateX(20px);
}

.page-enter-active {
  opacity: 1;
  transform: translateX(0);
}

/* 文件列表项展开动画 */
.file-item-expand {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.file-item-expand.active {
  max-height: 200px;
}

/* 预览内容淡入动画 */
.preview-fade-in {
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

## 8. 无障碍设计

### 8.1 键盘导航

```html
<!-- 所有可交互元素支持键盘访问 -->
<button tabindex="0" aria-label="上传文件">上传</button>
<div class="file-item" tabindex="0" role="button" aria-label="文件名.pdf">...</div>
```

### 8.2 屏幕阅读器支持

```html
<!-- 添加 ARIA 标签 -->
<div role="main" aria-label="文件预览区域">
  <div role="application" aria-label="PDF预览器">
    <!-- 预览内容 -->
  </div>
</div>

<div role="navigation" aria-label="文件列表">
  <!-- 文件列表 -->
</div>
```

### 8.3 焦点管理

```css
/* 清晰的焦点样式 */
:focus-visible {
  outline: 2px solid #007bff;
  outline-offset: 2px;
}

/* 移除按钮默认焦点 */
button:focus:not(:focus-visible) {
  outline: none;
}
```

## 9. 性能优化建议

### 9.1 预加载策略

```javascript
// 预加载下一个文件
async function preloadNextFile(currentFileId) {
  const nextFileId = getNextFileId(currentFileId);
  if (nextFileId && !fileCache.has(nextFileId)) {
    parseFile(nextFileId).then(content => {
      fileCache.set(nextFileId, content);
    });
  }
}
```

### 9.2 懒加载

```javascript
// 图片懒加载
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      observer.unobserve(img);
    }
  });
});
```

### 9.3 防抖和节流

```javascript
// 防抖：搜索输入
const debouncedSearch = debounce((keyword) => {
  searchFiles(keyword);
}, 300);

// 节流：滚动事件
const throttledScroll = throttle(() => {
  handleScroll();
}, 100);
```

## 10. 设计系统

### 10.1 颜色规范

```css
:root {
  /* 主色 */
  --color-primary: #007bff;
  --color-primary-hover: #0056b3;
  --color-primary-light: #e3f2fd;
  
  /* 成功 */
  --color-success: #38a169;
  --color-success-light: #c6f6d5;
  
  /* 警告 */
  --color-warning: #dd6b20;
  --color-warning-light: #feebc8;
  
  /* 错误 */
  --color-error: #c53030;
  --color-error-light: #fed7d7;
  
  /* 中性色 */
  --color-text-primary: #1a202c;
  --color-text-secondary: #4a5568;
  --color-text-tertiary: #718096;
  --color-text-disabled: #a0aec0;
  
  /* 背景色 */
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f8f9fa;
  --color-bg-tertiary: #f0f0f0;
  
  /* 边框色 */
  --color-border-primary: #e0e0e0;
  --color-border-secondary: #d0d0d0;
}
```

### 10.2 字体规范

```css
:root {
  /* 字体族 */
  --font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --font-family-mono: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
  
  /* 字号 */
  --font-size-xs: 11px;
  --font-size-sm: 12px;
  --font-size-base: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 18px;
  --font-size-2xl: 24px;
  --font-size-3xl: 30px;
  
  /* 字重 */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  
  /* 行高 */
  --line-height-tight: 1.2;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.8;
}
```

### 10.3 间距规范

```css
:root {
  --spacing-0: 0;
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-5: 20px;
  --spacing-6: 24px;
  --spacing-8: 32px;
  --spacing-10: 40px;
  --spacing-12: 48px;
  --spacing-16: 64px;
}
```

### 10.4 圆角规范

```css
:root {
  --radius-sm: 2px;
  --radius-base: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-full: 9999px;
}
```

### 10.5 阴影规范

```css
:root {
  --shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  --shadow-base: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-lg: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  --shadow-xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}
```

## 11. 总结

本UI设计文档定义了文件预览系统的完整界面和交互方案，包括：

### 核心特性
✅ 响应式设计，支持手机到桌面的全平台适配  
✅ 友好的加载进度提示，实时反馈解析状态  
✅ 清晰的错误提示和解决建议，帮助用户快速解决问题  
✅ 流畅的文件切换和操作体验，支持快捷键和拖拽  
✅ 完善的无障碍设计，支持键盘导航和屏幕阅读器  

### 设计原则
- **简洁至上**：界面简洁，操作直观
- **即时反馈**：每个操作都有明确的反馈
- **容错性强**：友好的错误提示和恢复机制
- **性能优先**：流畅的动画和加载体验
- **用户中心**：以用户需求为导向的设计

### 后续工作
1. 根据架构师的技术方案调整UI实现细节
2. 与前端工程师沟通实现方案
3. 配合体验官进行用户体验测试
4. 根据测试反馈持续优化

---

**文档版本**: 1.0  
**创建日期**: 2024年  
**设计师**: 用户体验设计师  
**审核状态**: 待审核