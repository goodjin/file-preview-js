# 文件预览系统 - UI层设计文档

## 1. UI层概述

### 1.1 设计目标
UI层负责文件预览系统的用户界面展示和交互，提供统一的用户体验。

### 1.2 设计原则
- **纯JavaScript实现**：不依赖React/Vue等框架，使用原生JS
- **响应式设计**：支持桌面端和移动端
- **模块化**：每个组件独立开发，便于维护
- **性能优先**：代码简洁高效，支持大文件预览
- **可扩展性**：易于添加新功能和新组件

### 1.3 技术栈
- **HTML5**：页面结构
- **CSS3**：样式和动画
- **ES6+ JavaScript**：组件逻辑
- **DOM API**：页面交互

### 1.4 组件架构
```
src/ui/
├── components/
│   ├── PreviewComponent.js       # 预览组件（待实现）
│   ├── PreviewComponent.css       # 预览组件样式（待实现）
│   ├── FileUploadComponent.js    # 文件上传组件（待实现）
│   ├── FileUploadComponent.css    # 文件上传组件样式（待实现）
│   ├── ToolbarComponent.js       # 工具栏组件（已完成）
│   ├── ToolbarComponent.css       # 工具栏组件样式（已完成）
│   ├── StatusComponent.js        # 状态组件（已完成）
│   └── StatusComponent.css        # 状态组件样式（已完成）
├── utils/
│   ├── DOMHelper.js            # DOM操作辅助
│   ├── EventHelper.js          # 事件处理辅助
│   └── CSSHelper.js            # 样式处理辅助
├── templates/
│   ├── preview.html            # 预览模板
│   └── upload.html             # 上传模板
└── styles/
    ├── variables.css           # CSS变量
    ├── common.css              # 通用样式
    └── responsive.css          # 响应式样式
```

## 2. PreviewComponent设计（P0 优先级）

### 2.1 组件概述
PreviewComponent是主预览容器组件，负责显示文件内容、处理加载状态和显示错误信息。

### 2.2 组件职责
1. 创建预览容器DOM结构
2. 显示文件预览内容
3. 显示加载状态（可使用StatusComponent）
4. 显示错误信息（可使用StatusComponent）
5. 处理缩放操作
6. 处理全屏切换
7. 集成ToolbarComponent和StatusComponent

### 2.3 组件接口

#### 2.3.1 类定义
```javascript
class PreviewComponent {
  constructor(container, options = {}) {
    // container: DOM容器元素
    // options: 配置选项
  }
  
  // 公共方法
  loadFile(file)                    // 加载文件
  setZoom(zoom)                     // 设置缩放级别
  toggleFullscreen()                // 切换全屏
  showLoading(text)                // 显示加载状态
  hideLoading()                    // 隐藏加载状态
  showError(message)               // 显示错误信息
  showSuccess(message)             // 显示成功消息
  destroy()                        // 销毁组件
}
```

#### 2.3.2 配置选项
```javascript
const defaultOptions = {
  width: '100%',                    // 容器宽度
  height: '100%',                   // 容器高度
  minZoom: 0.25,                    // 最小缩放比例
  maxZoom: 4.0,                     // 最大缩放比例
  defaultZoom: 1.0,                 // 默认缩放比例
  zoomSteps: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4],  // 缩放级别
  showToolbar: true,                // 显示工具栏
  showStatus: true,                 // 显示状态组件
  toolbarPosition: 'bottom',        // 工具栏位置
  fullscreen: false                 // 是否全屏
};
```

### 2.4 DOM结构
```html
<div class="preview-container" data-component="preview">
  <!-- 顶部工具栏（可选） -->
  <div class="preview-toolbar-top"></div>
  
  <!-- 状态覆盖层（加载、错误、成功） -->
  <div class="status-overlay"></div>
  
  <!-- 预览内容区域 -->
  <div class="preview-content">
    <div class="preview-canvas">
      <!-- 动态插入预览内容 -->
    </div>
  </div>
  
  <!-- 底部工具栏（可选） -->
  <div class="preview-toolbar-bottom"></div>
</div>
```

### 2.5 样式规范

#### 2.5.1 主容器样式
```css
.preview-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: #FFFFFF;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.preview-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  padding: 20px;
  position: relative;
}

.preview-canvas {
  transition: transform 0.3s ease-in-out;
  transform-origin: center center;
  max-width: 100%;
  max-height: 100%;
}

.preview-container--fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  border-radius: 0;
  background-color: #FFFFFF;
}
```

### 2.6 事件处理

#### 2.6.1 自定义事件
```javascript
// 组件支持的事件
const events = {
  'load': '文件加载完成',
  'loadStart': '文件开始加载',
  'loadProgress': '文件加载进度',
  'loadError': '文件加载错误',
  'zoomChange': '缩放级别变化',
  'fullscreenEnter': '进入全屏',
  'fullscreenExit': '退出全屏',
  'destroy': '组件销毁'
};
```

### 2.7 使用示例
```javascript
// 创建预览容器
const container = document.getElementById('preview-container');
const preview = new PreviewComponent(container, {
  width: '100%',
  height: '600px',
  showToolbar: true,
  toolbarPosition: 'bottom'
});

// 监听事件
preview.on('load', (file) => {
  console.log('文件加载完成:', file);
});

preview.on('zoomChange', (zoom) => {
  console.log('当前缩放级别:', zoom);
});

// 加载文件
preview.loadFile(file);
```

## 3. FileUploadComponent设计（P0 优先级）

### 3.1 组件概述
FileUploadComponent负责文件上传界面，提供文件选择和拖拽上传功能。

### 3.2 组件职责
1. 创建文件上传界面
2. 处理文件选择
3. 处理拖拽上传
4. 显示上传进度
5. 验证文件类型和大小
6. 支持的文件类型提示
7. 支持多文件上传

### 3.3 组件接口

#### 3.3.1 类定义
```javascript
class FileUploadComponent {
  constructor(container, options = {}) {
    // container: DOM容器元素
    // options: 配置选项
  }
  
  // 公共方法
  setAccept(accept)                 // 设置接受文件类型
  setMaxSize(maxSize)                // 设置最大文件大小
  clear()                            // 清空文件列表
  getFiles()                         // 获取已选文件
  destroy()                          // 销毁组件
}
```

#### 3.3.2 配置选项
```javascript
const defaultOptions = {
  accept: [],                        // 接受的文件类型，空数组表示全部接受
  maxSize: 100 * 1024 * 1024,       // 最大文件大小，默认100MB
  multiple: false,                   // 是否支持多文件上传
  dragable: true,                    // 是否支持拖拽上传
  showProgress: true,                // 显示上传进度
  autoUpload: false,                 // 自动上传
  acceptText: '支持 45 种文件格式',  // 文件类型提示文字
  maxSizeText: '最大 100MB'           // 文件大小提示文字
};
```

### 3.4 DOM结构
```html
<div class="file-upload-container" data-component="file-upload">
  <!-- 文件输入框（隐藏） -->
  <input type="file" class="file-input" style="display: none;" />
  
  <!-- 拖拽上传区域 -->
  <div class="file-upload-zone">
    <div class="upload-icon">📁</div>
    <div class="upload-text">点击或拖拽上传文件</div>
    <div class="upload-hint">支持 45 种文件格式，最大 100MB</div>
  </div>
  
  <!-- 文件列表区域 -->
  <div class="file-list" style="display: none;">
    <!-- 动态插入文件项 -->
  </div>
</div>
```

### 3.5 样式规范

#### 3.5.1 主容器样式
```css
.file-upload-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.file-upload-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 32px;
  border: 2px dashed #E5E7EB;
  border-radius: 8px;
  background-color: #F9FAFB;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.file-upload-zone:hover {
  border-color: #3B82F6;
  background-color: #EFF6FF;
}

.file-upload-zone--dragging {
  border-color: #3B82F6;
  background-color: #DBEAFE;
}
```

### 3.6 事件处理

#### 3.6.1 自定义事件
```javascript
// 组件支持的事件
const events = {
  'fileSelect': '文件选择',
  'fileRemove': '文件移除',
  'uploadStart': '上传开始',
  'uploadProgress': '上传进度',
  'uploadSuccess': '上传成功',
  'uploadError': '上传错误',
  'dragEnter': '拖拽进入',
  'dragLeave': '拖拽离开',
  'dragDrop': '拖拽释放',
  'destroy': '组件销毁'
};
```

### 3.7 使用示例
```javascript
// 创建上传组件
const container = document.getElementById('upload-container');
const upload = new FileUploadComponent(container, {
  accept: ['pdf', 'docx', 'xlsx', 'jpg', 'png'],
  maxSize: 50 * 1024 * 1024,
  multiple: true,
  dragable: true
});

// 监听事件
upload.on('fileSelect', (files) => {
  console.log('选择的文件:', files);
});

upload.on('uploadSuccess', (file) => {
  console.log('上传成功:', file.name);
});
```

## 4. ToolbarComponent设计（已完成）

### 4.1 组件概述
ToolbarComponent提供预览操作工具栏，包括缩放控制、页面导航、全屏切换等功能。

### 4.2 组件职责
1. 创建工具栏DOM结构
2. 显示缩放控制按钮
3. 显示页面导航按钮
4. 显示功能按钮（全屏、下载、打印等）
5. 处理按钮点击事件
6. 更新工具栏状态

### 4.3 组件接口

#### 4.3.1 类定义
```javascript
class ToolbarComponent {
  constructor(container, options = {}) {
    // container: DOM容器元素
    // options: 配置选项
  }
  
  // 公共方法
  setZoom(zoom)                     // 设置缩放级别
  setPage(page)                     // 设置当前页码
  setTotalPages(total)              // 设置总页数
  show()                            // 显示工具栏
  hide()                            // 隐藏工具栏
  destroy()                         // 销毁组件
}
```

#### 4.3.2 配置选项
```javascript
const defaultOptions = {
  position: 'bottom',               // 工具栏位置: 'top' | 'bottom'
  showZoom: true,                   // 显示缩放控制
  showPageNav: false,               // 显示页面导航
  showFullscreen: true,            // 显示全屏按钮
  showDownload: false,              // 显示下载按钮
  showPrint: false,                 // 显示打印按钮
  zoom: 1.0,                        // 当前缩放比例
  currentPage: 0,                   // 当前页码
  totalPages: 0,                    // 总页数
  zoomSteps: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4]  // 缩放级别
};
```

### 4.4 DOM结构
```html
<div class="toolbar toolbar--bottom" data-component="toolbar">
  <!-- 左侧：缩放控制 -->
  <div class="toolbar__group">
    <button class="toolbar__button" data-action="zoom-out">-</button>
    <span class="toolbar__zoom-display">100%</span>
    <button class="toolbar__button" data-action="zoom-in">+</button>
  </div>
  
  <!-- 中间：页面导航 -->
  <div class="toolbar__group">
    <button class="toolbar__button" data-action="prev-page">‹</button>
    <span class="toolbar__page-display">
      <span class="toolbar__page-display__current">0</span>
      <span> / </span>
      <span class="toolbar__page-display__total">0</span>
    </span>
    <button class="toolbar__button" data-action="next-page">›</button>
  </div>
  
  <!-- 右侧：功能按钮 -->
  <div class="toolbar__group">
    <button class="toolbar__button" data-action="fullscreen">⛶</button>
  </div>
</div>
```

### 4.5 事件处理

#### 4.5.1 自定义事件
```javascript
// 组件支持的事件
const events = {
  'zoomChange': '缩放级别变化',
  'pageChange': '页码变化',
  'fullscreenToggle': '全屏切换',
  'download': '下载',
  'print': '打印',
  'destroy': '组件销毁'
};
```

### 4.6 使用示例
```javascript
// 创建工具栏
const container = document.getElementById('toolbar-container');
const toolbar = new ToolbarComponent(container, {
  position: 'bottom',
  showZoom: true,
  showPageNav: true,
  showFullscreen: true
});

// 监听事件
toolbar.on('zoomChange', (zoom) => {
  console.log('缩放级别:', zoom);
});

toolbar.on('pageChange', (page) => {
  console.log('当前页码:', page);
});

// 更新状态
toolbar.setZoom(1.5);
toolbar.setPage(5);
toolbar.setTotalPages(20);
```

### 4.7 实现状态
- ✅ ToolbarComponent.js 已完成
- ✅ ToolbarComponent.css 已完成
- ⏳ 集成测试待进行

## 5. StatusComponent设计（已完成）

### 5.1 组件概述
StatusComponent显示预览状态和进度信息，包括加载进度、错误信息、文件信息等。

### 5.2 组件职责
1. 创建状态显示DOM结构
2. 显示加载状态
3. 显示错误状态
4. 显示成功状态
5. 显示进度条
6. 显示文件信息
7. 处理状态切换

### 5.3 组件接口

#### 5.3.1 类定义
```javascript
class StatusComponent {
  constructor(container, options = {}) {
    // container: DOM容器元素
    // options: 配置选项
  }
  
  // 公共方法
  showLoading(text)                // 显示加载状态
  showError(message)                // 显示错误状态
  showSuccess(message)              // 显示成功状态
  updateProgress(progress, text)    // 更新进度
  showFileInfo(fileInfo)            // 显示文件信息
  hide()                            // 隐藏状态
  getStatus()                       // 获取当前状态
  destroy()                         // 销毁组件
}
```

#### 5.3.2 配置选项
```javascript
const defaultOptions = {
  showLoading: true,                // 显示加载状态
  showError: true,                  // 显示错误状态
  showProgress: true,               // 显示进度条
  position: 'center',               // 位置: 'center' | 'top' | 'bottom'
  autoHide: false,                  // 自动隐藏
  autoHideDelay: 3000               // 自动隐藏延迟（毫秒）
};
```

### 5.4 DOM结构
```html
<div class="status status--center" data-component="status" style="display: none;">
  <!-- 加载状态 -->
  <div class="status__loading" style="display: none;">
    <div class="loading-spinner"></div>
    <div class="loading-text">正在加载...</div>
  </div>
  
  <!-- 错误状态 -->
  <div class="status__error" style="display: none;">
    <div class="error-icon">❌</div>
    <div class="error-message"></div>
    <div class="error-actions">
      <button class="btn btn-primary btn-sm" data-action="retry">重新加载</button>
    </div>
  </div>
  
  <!-- 成功状态 -->
  <div class="status__success" style="display: none;">
    <div class="success-icon">✓</div>
    <div class="success-message"></div>
  </div>
  
  <!-- 进度条 -->
  <div class="status__progress" style="display: none;">
    <div class="progress-track">
      <div class="progress-fill" style="width: 0%;"></div>
    </div>
    <div class="progress-info">
      <span class="progress-text"></span>
      <span class="progress-percent">0%</span>
    </div>
  </div>
</div>
```

### 5.5 事件处理

#### 5.5.1 自定义事件
```javascript
// 组件支持的事件
const events = {
  'loading': '加载开始',
  'error': '错误发生',
  'success': '成功完成',
  'progress': '进度更新',
  'retry': '重试',
  'destroy': '组件销毁'
};
```

### 5.6 使用示例
```javascript
// 创建状态组件
const container = document.getElementById('status-container');
const status = new StatusComponent(container, {
  position: 'center',
  showProgress: true
});

// 显示加载状态
status.showLoading('正在加载文件...');

// 更新进度
status.updateProgress(50, '已加载 10.5MB / 21.0MB');

// 显示错误
status.showError('文件加载失败，请重试');

// 显示成功
status.showSuccess('加载成功');

// 监听事件
status.on('retry', () => {
  console.log('用户点击重新加载');
  status.showLoading('正在重试...');
});

status.on('error', ({ message }) => {
  console.error('错误:', message);
});
```

### 5.7 实现状态
- ✅ StatusComponent.js 已完成
- ✅ StatusComponent.css 已完成
- ⏳ 集成测试待进行

## 6. 工具函数设计

### 6.1 DOMHelper.js
```javascript
const DOMHelper = {
  createElement(tag, className = '', content = ''),
  query(selector, parent = document),
  queryAll(selector, parent = document),
  addClass(element, className),
  removeClass(element, className),
  toggleClass(element, className),
  show(element),
  hide(element)
};
```

### 6.2 EventHelper.js
```javascript
const EventHelper = {
  on(element, event, handler),
  off(element, event, handler),
  emit(element, event, detail = {}),
  stop(event),
  prevent(event)
};
```

### 6.3 常用工具函数
```javascript
// 节流函数
function throttle(fn, delay) { }

// 防抖函数
function debounce(fn, delay) { }

// 格式化文件大小
function formatFileSize(bytes) { }

// 获取文件扩展名
function getFileExtension(filename) { }
```

## 7. CSS变量系统

### 7.1 颜色变量
```css
:root {
  /* 品牌色 */
  --color-primary: #3B82F6;
  --color-primary-hover: #2563EB;
  --color-primary-active: #1D4ED8;
  
  /* 中性色 */
  --color-text-primary: #1F2937;
  --color-text-secondary: #6B7280;
  --color-text-hint: #9CA3AF;
  --color-border: #E5E7EB;
  --color-bg: #FFFFFF;
  --color-bg-secondary: #F9FAFB;
  
  /* 功能色 */
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-error: #EF4444;
  --color-info: #3B82F6;
}
```

### 7.2 间距变量
```css
:root {
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
}
```

### 7.3 字体变量
```css
:root {
  --font-family-primary: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --font-family-mono: Monaco, Consolas, 'Courier New', monospace;
  
  --font-size-xs: 12px;
  --font-size-sm: 13px;
  --font-size-md: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 20px;
  --font-size-2xl: 24px;
  
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
}
```

### 7.4 圆角变量
```css
:root {
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
}
```

## 8. 组件协作关系

### 8.1 PreviewComponent作为容器
```javascript
class PreviewComponent {
  constructor(container, options = {}) {
    this.toolbar = null;
    this.status = null;
    
    // 初始化工具栏
    if (options.showToolbar) {
      const toolbarContainer = this._createToolbarContainer();
      this.toolbar = new ToolbarComponent(toolbarContainer, {
        position: options.toolbarPosition
      });
      
      // 监听工具栏事件
      this.toolbar.on('zoomChange', (zoom) => this._onZoomChange(zoom));
      this.toolbar.on('fullscreenToggle', () => this.toggleFullscreen());
    }
    
    // 初始化状态组件
    if (options.showStatus) {
      const statusContainer = this._createStatusContainer();
      this.status = new StatusComponent(statusContainer, {
        position: 'center'
      });
      
      // 监听状态组件事件
      this.status.on('retry', () => this._onRetry());
    }
  }
  
  loadFile(file) {
    // 显示加载状态
    if (this.status) {
      this.status.showFileInfo({ name: file.name, size: file.size });
      this.status.showLoading();
    }
    
    // 加载文件逻辑...
  }
  
  _onZoomChange(zoom) {
    this.currentZoom = zoom;
    this._updateCanvasTransform();
    this.emit('zoomChange', zoom);
  }
  
  _onRetry() {
    // 重新加载文件
    if (this.currentFile) {
      this.loadFile(this.currentFile);
    }
  }
}
```

### 8.2 事件流向
```
用户操作 → ToolbarComponent → 触发事件 → PreviewComponent
用户操作 → StatusComponent → 触发事件 → PreviewComponent
PreviewComponent → 更新内部状态 → 通知ToolbarComponent/StatusComponent
```

## 9. 开发规范

### 9.1 代码规范
1. 使用ES6+语法
2. 类名使用PascalCase
3. 私有方法使用下划线开头
4. 每个类文件不超过500行
5. 添加详细的JSDoc注释

### 9.2 样式规范
1. 使用BEM命名规范
2. 使用CSS变量
3. 响应式设计使用媒体查询
4. 使用flexbox和grid布局
5. 动画使用transition或animation

### 9.3 文件组织
1. 每个组件包含.js、.css、README.md三个文件
2. README.md包含使用示例
3. 工具函数统一放在utils目录
4. 模板文件放在templates目录

## 10. 测试要求

### 10.1 单元测试
- 测试每个公共方法
- 测试事件触发
- 测试边界条件
- 测试错误处理

### 10.2 集成测试
- 测试组件交互
- 测试组件协作
- 测试文件上传流程
- 测试文件预览流程

### 10.3 性能测试
- 测试大文件处理
- 测试多文件上传
- 测试内存占用
- 测试渲染性能

## 11. 开发计划

### 11.1 第一阶段（Week 2）- P0组件
- [x] ToolbarComponent 设计与实现
- [x] StatusComponent 设计与实现
- [ ] PreviewComponent 设计与实现（核心容器）
- [ ] FileUploadComponent 设计与实现
- [ ] 组件集成测试

### 11.2 第二阶段（Week 3-4）- 完善UI
- [ ] PreviewComponent 完整实现
- [ ] FileUploadComponent 完整实现
- [ ] 响应式适配
- [ ] 动画优化
- [ ] 用户体验优化

### 11.3 第三阶段（Week 5-6）- 测试与优化
- [ ] 单元测试完善
- [ ] 集成测试
- [ ] 性能测试
- [ ] 兼容性测试
- [ ] Bug修复

## 12. 完成标准

### 12.1 设计完成标准
- ✅ UI层设计文档完成
- ✅ 所有组件接口定义清晰
- ✅ 所有组件DOM结构设计完成
- ✅ 所有组件样式规范定义完成
- ✅ 组件协作关系明确

### 12.2 实现完成标准
- [ ] PreviewComponent 实现完成（<500行代码）
- [ ] FileUploadComponent 实现完成（<500行代码）
- [x] ToolbarComponent 实现完成（<500行代码）
- [x] StatusComponent 实现完成（<500行代码）
- [ ] 所有组件通过单元测试
- [ ] 组件集成测试通过

### 12.3 质量标准
- 每个组件代码量不超过500行
- 充分的注释和文档
- 统一的视觉风格
- 良好的用户体验
- 响应式设计支持

---

**文档版本**: 1.1
**编写日期**: 2024
**编写人**: UI层设计师
**更新记录**:
- v1.0 (2024): 初始版本
- v1.1 (2024): 添加ToolbarComponent和StatusComponent详细设计
