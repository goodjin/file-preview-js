# 工件管理器图片导航功能设计文档

## 1. 设计概述

本设计文档描述如何在工件管理器中实现图片导航功能，包括缩略图导航栏、左右箭头按钮和键盘导航。

### 1.1 核心目标
- 在图片查看器中添加缩略图导航栏
- 支持点击缩略图快速跳转
- 支持键盘左右方向键切换图片
- 支持左右箭头按钮切换图片
- 循环切换模式
- 保持良好的性能和用户体验

### 1.2 技术栈
- 原生 JavaScript（ES6+）
- CSS3（使用 CSS 变量）
- 现有的 `ArtifactManager` 和 `ImageViewer` 组件

## 2. 架构设计

### 2.1 组件职责划分

#### 2.1.1 ArtifactManager（主要修改）
**职责：**
- 管理图片列表和当前索引
- 处理图片切换逻辑
- 协调 ImageViewer 和缩略图导航栏
- 处理键盘事件

**新增属性：**
```javascript
// 图片导航相关状态
this.currentImageIndex = -1;        // 当前图片在列表中的索引
this.imageList = [];                 // 过滤后的图片列表
this.thumbnailNavigator = null;      // 缩略图导航器实例
```

**新增方法：**
```javascript
// 获取过滤后的图片列表
_getFilteredImages()

// 切换到指定索引的图片
_navigateToImage(index)

// 切换到下一张图片
_navigateToNextImage()

// 切换到上一张图片
_navigateToPreviousImage()

// 更新图片列表和导航器
_updateImageNavigation()

// 处理键盘导航事件
_handleImageNavigationKeys(event)
```

#### 2.1.2 ImageViewer（修改）
**职责：**
- 显示当前图片
- 提供缩放、拖拽等交互功能
- 接收导航回调函数

**修改点：**
```javascript
// 构造函数新增参数
constructor(options = {}) {
  // ... 现有代码
  this.onNavigate = options.onNavigate;  // 导航回调函数
  this.showNavigation = options.showNavigation !== false;  // 是否显示导航
}
```

#### 2.1.3 ThumbnailNavigator（新增组件）
**职责：**
- 渲染缩略图导航栏
- 处理缩略图点击事件
- 高亮当前图片
- 自动滚动到当前图片

**接口设计：**
```javascript
class ThumbnailNavigator {
  constructor(options = {}) {
    this.container = options.container;      // 容器元素
    this.images = options.images || [];      // 图片列表
    this.currentIndex = options.currentIndex || 0;  // 当前索引
    this.onSelect = options.onSelect;        // 选择回调
    this.thumbnailHeight = options.thumbnailHeight || 80;  // 缩略图高度
  }
  
  // 渲染缩略图导航栏
  render()
  
  // 更新当前索引
  setCurrentIndex(index)
  
  // 更新图片列表
  setImages(images)
  
  // 滚动到当前图片
  scrollToCurrent()
  
  // 销毁组件
  destroy()
}
```

### 2.2 数据流设计

```
用户操作（点击缩略图/按键/点击箭头）
    ↓
ArtifactManager 处理事件
    ↓
更新 currentImageIndex
    ↓
调用 _navigateToImage(index)
    ↓
├─→ 更新 ImageViewer 显示新图片
└─→ 更新 ThumbnailNavigator 高亮状态
```

## 3. 详细设计

### 3.1 缩略图导航栏设计

#### 3.1.1 HTML 结构
```html
<div class="thumbnail-navigator">
  <div class="thumbnail-list">
    <div class="thumbnail-item active" data-index="0">
      <img src="..." alt="...">
    </div>
    <div class="thumbnail-item" data-index="1">
      <img src="..." alt="...">
    </div>
    <!-- 更多缩略图 -->
  </div>
</div>
```

#### 3.1.2 CSS 样式设计
```css
/* 使用 CSS 变量定义可配置参数 */
:root {
  --thumbnail-height: 80px;
  --thumbnail-gap: 8px;
  --thumbnail-border-radius: 4px;
  --thumbnail-active-border-color: #007acc;
  --thumbnail-active-border-width: 3px;
}

.thumbnail-navigator {
  width: 100%;
  padding: 12px;
  background-color: rgba(30, 30, 30, 0.95);
  border-top: 1px solid #3e3e42;
  overflow-x: auto;
  overflow-y: hidden;
}

.thumbnail-list {
  display: flex;
  gap: var(--thumbnail-gap);
  min-height: var(--thumbnail-height);
}

.thumbnail-item {
  flex-shrink: 0;
  height: var(--thumbnail-height);
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: var(--thumbnail-border-radius);
  overflow: hidden;
  transition: border-color 0.2s, opacity 0.2s;
}

.thumbnail-item:hover {
  opacity: 0.8;
  border-color: #555;
}

.thumbnail-item.active {
  border-color: var(--thumbnail-active-border-color);
  border-width: var(--thumbnail-active-border-width);
}

.thumbnail-item img {
  height: 100%;
  width: auto;
  display: block;
  object-fit: cover;
}
```

### 3.2 左右箭头按钮设计

#### 3.2.1 HTML 结构
```html
<!-- 在 artifact-viewer-container 内部添加 -->
<div class="image-navigation-arrows">
  <button class="nav-arrow nav-arrow-left" title="上一张 (←)">
    <span>‹</span>
  </button>
  <button class="nav-arrow nav-arrow-right" title="下一张 (→)">
    <span>›</span>
  </button>
</div>
```

#### 3.2.2 CSS 样式设计
```css
.image-navigation-arrows {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
}

.nav-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 50px;
  height: 50px;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 30px;
  pointer-events: auto;
  transition: background-color 0.2s, opacity 0.2s;
  opacity: 0.7;
}

.nav-arrow:hover {
  background-color: rgba(0, 0, 0, 0.8);
  opacity: 1;
}

.nav-arrow-left {
  left: 20px;
}

.nav-arrow-right {
  right: 20px;
}

/* 只有一张图片时隐藏箭头 */
.single-image .nav-arrow {
  display: none;
}
```

### 3.3 键盘导航设计

#### 3.3.1 事件处理逻辑
```javascript
// 在 ArtifactManager._attachEventListeners 中添加
_handleImageNavigationKeys(e) {
  // 只在查看器打开且查看图片时响应
  if (!this.isViewerOpen || !this._isCurrentArtifactImage()) {
    return;
  }
  
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    this._navigateToPreviousImage();
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    this._navigateToNextImage();
  }
}

// 绑定事件
document.addEventListener("keydown", (e) => {
  this._handleImageNavigationKeys(e);
});
```

#### 3.3.2 循环切换逻辑
```javascript
_navigateToPreviousImage() {
  if (this.imageList.length === 0) return;
  
  // 循环：第一张 → 最后一张
  const newIndex = this.currentImageIndex === 0 
    ? this.imageList.length - 1 
    : this.currentImageIndex - 1;
  
  this._navigateToImage(newIndex);
}

_navigateToNextImage() {
  if (this.imageList.length === 0) return;
  
  // 循环：最后一张 → 第一张
  const newIndex = this.currentImageIndex === this.imageList.length - 1 
    ? 0 
    : this.currentImageIndex + 1;
  
  this._navigateToImage(newIndex);
}
```

### 3.4 图片列表管理

#### 3.4.1 获取过滤后的图片列表
```javascript
_getFilteredImages() {
  // 根据当前模式选择数据源
  const sourceData = this.sidebarMode === "workspace" 
    ? this.filteredWorkspaceFiles 
    : this.filteredArtifacts;
  
  // 只保留图片类型
  return sourceData.filter(item => {
    const type = (item.type || "").toLowerCase();
    return this._isImageType(type);
  });
}
```

#### 3.4.2 更新导航状态
```javascript
_updateImageNavigation() {
  // 获取最新的图片列表
  this.imageList = this._getFilteredImages();
  
  // 如果当前工件是图片，找到它的索引
  if (this.selectedArtifact && this._isImageType(this.selectedArtifact.type)) {
    this.currentImageIndex = this.imageList.findIndex(
      img => img.id === this.selectedArtifact.id
    );
  } else {
    this.currentImageIndex = -1;
  }
  
  // 更新缩略图导航器
  if (this.thumbnailNavigator && this.imageList.length > 0) {
    this.thumbnailNavigator.setImages(this.imageList);
    this.thumbnailNavigator.setCurrentIndex(this.currentImageIndex);
  }
}
```

### 3.5 图片切换流程

#### 3.5.1 核心切换方法
```javascript
async _navigateToImage(index) {
  // 边界检查
  if (index < 0 || index >= this.imageList.length) {
    return;
  }
  
  // 获取目标图片
  const targetImage = this.imageList[index];
  if (!targetImage) return;
  
  // 更新当前索引
  this.currentImageIndex = index;
  
  // 更新选中的工件
  this.selectedArtifact = targetImage;
  
  // 更新查看器标题
  const displayName = targetImage.actualFilename || targetImage.filename || targetImage.name;
  this.artifactNameSpan.textContent = displayName;
  
  // 加载并显示图片
  try {
    let fullArtifact;
    let metadata = {};
    
    if (targetImage.isWorkspaceFile) {
      // 工作空间文件
      const response = await this.api.get(
        `/workspaces/${targetImage.workspaceId}/file?path=${encodeURIComponent(targetImage.path)}`
      );
      fullArtifact = {
        id: targetImage.id,
        type: targetImage.type,
        content: response.content,
        meta: response.meta
      };
      metadata = {
        messageId: response.messageId,
        agentId: response.agentId
      };
    } else {
      // 普通工件
      fullArtifact = {
        id: targetImage.id,
        type: targetImage.type,
        content: targetImage.filename,
        extension: targetImage.extension
      };
      metadata = await this.api.get(`/artifacts/${targetImage.id}/metadata`);
    }
    
    // 更新元数据
    this.selectedArtifact.messageId = metadata.messageId;
    this.selectedArtifact.agentId = metadata.agentId;
    
    // 更新"查看来源"按钮
    if (metadata.messageId) {
      this.viewSourceBtn.style.display = "inline-block";
    } else {
      this.viewSourceBtn.style.display = "none";
    }
    
    // 重新渲染图片查看器
    this._displayArtifact(fullArtifact, "image");
    
    // 更新缩略图导航器
    if (this.thumbnailNavigator) {
      this.thumbnailNavigator.setCurrentIndex(index);
      this.thumbnailNavigator.scrollToCurrent();
    }
    
    // 更新箭头按钮状态（如果需要）
    this._updateNavigationButtons();
    
  } catch (err) {
    this.logger.error("切换图片失败", err);
    if (window.Toast) {
      window.Toast.error("切换图片失败");
    }
  }
}
```

#### 3.5.2 更新导航按钮状态
```javascript
_updateNavigationButtons() {
  const leftArrow = this.viewerPanel.querySelector(".nav-arrow-left");
  const rightArrow = this.viewerPanel.querySelector(".nav-arrow-right");
  
  if (!leftArrow || !rightArrow) return;
  
  // 循环模式下，所有按钮始终可用
  // 如果需要禁用边界按钮，可以添加以下逻辑：
  // leftArrow.disabled = this.currentImageIndex === 0;
  // rightArrow.disabled = this.currentImageIndex === this.imageList.length - 1;
}
```

### 3.6 集成到现有流程

#### 3.6.1 修改 openArtifact 方法
```javascript
async openArtifact(artifact) {
  // ... 现有代码 ...
  
  // 在打开工件后，更新图片导航
  this._updateImageNavigation();
  
  // 如果是图片类型，显示导航组件
  if (this._isImageType(artifact.type)) {
    this._showImageNavigation();
  } else {
    this._hideImageNavigation();
  }
}
```

#### 3.6.2 修改 _displayArtifact 方法
```javascript
_displayArtifact(artifact, viewerType) {
  this.viewerPanel.innerHTML = "";
  // ... 现有代码 ...
  
  if (viewerType === "image") {
    // 创建图片查看器容器
    const imageContainer = document.createElement("div");
    imageContainer.className = "image-viewer-container";
    imageContainer.style.position = "relative";
    imageContainer.style.flex = "1";
    imageContainer.style.overflow = "hidden";
    
    // 渲染图片
    const viewer = new ImageViewer({ 
      container: imageContainer,
      showNavigation: false  // 不使用 ImageViewer 自带的导航
    });
    viewer.render(artifact.content);
    this.currentViewer = viewer;
    
    // 添加左右箭头按钮
    if (this.imageList.length > 1) {
      const arrows = this._createNavigationArrows();
      imageContainer.appendChild(arrows);
    }
    
    this.viewerPanel.appendChild(imageContainer);
    
    // 添加缩略图导航栏
    if (this.imageList.length > 1) {
      const thumbnailContainer = document.createElement("div");
      thumbnailContainer.className = "thumbnail-navigator-container";
      this.viewerPanel.appendChild(thumbnailContainer);
      
      this.thumbnailNavigator = new ThumbnailNavigator({
        container: thumbnailContainer,
        images: this.imageList,
        currentIndex: this.currentImageIndex,
        thumbnailHeight: 80,
        onSelect: (index) => {
          this._navigateToImage(index);
        }
      });
      this.thumbnailNavigator.render();
    }
  }
  // ... 其他类型的处理 ...
}
```

#### 3.6.3 创建导航箭头
```javascript
_createNavigationArrows() {
  const arrows = document.createElement("div");
  arrows.className = "image-navigation-arrows";
  arrows.innerHTML = `
    <button class="nav-arrow nav-arrow-left" title="上一张 (←)">
      <span>‹</span>
    </button>
    <button class="nav-arrow nav-arrow-right" title="下一张 (→)">
      <span>›</span>
    </button>
  `;
  
  // 绑定事件
  const leftArrow = arrows.querySelector(".nav-arrow-left");
  const rightArrow = arrows.querySelector(".nav-arrow-right");
  
  leftArrow.addEventListener("click", () => {
    this._navigateToPreviousImage();
  });
  
  rightArrow.addEventListener("click", () => {
    this._navigateToNextImage();
  });
  
  return arrows;
}
```

## 4. ThumbnailNavigator 组件实现

### 4.1 完整实现代码框架
```javascript
/**
 * 缩略图导航器组件
 * 显示图片缩略图列表，支持点击跳转和自动滚动
 */
class ThumbnailNavigator {
  constructor(options = {}) {
    this.container = options.container;
    this.images = options.images || [];
    this.currentIndex = options.currentIndex || 0;
    this.onSelect = options.onSelect;
    this.thumbnailHeight = options.thumbnailHeight || 80;
    
    this.listElement = null;
    this.thumbnailElements = [];
  }
  
  /**
   * 渲染缩略图导航栏
   */
  render() {
    if (!this.container) return;
    
    this.container.innerHTML = "";
    this.container.className = "thumbnail-navigator";
    
    // 创建缩略图列表容器
    this.listElement = document.createElement("div");
    this.listElement.className = "thumbnail-list";
    
    // 渲染每个缩略图
    this.thumbnailElements = this.images.map((image, index) => {
      const item = this._createThumbnailItem(image, index);
      this.listElement.appendChild(item);
      return item;
    });
    
    this.container.appendChild(this.listElement);
    
    // 高亮当前图片
    this._updateActiveState();
    
    // 滚动到当前图片
    this.scrollToCurrent();
  }
  
  /**
   * 创建单个缩略图元素
   */
  _createThumbnailItem(image, index) {
    const item = document.createElement("div");
    item.className = "thumbnail-item";
    item.dataset.index = index;
    
    const img = document.createElement("img");
    img.src = this._getImageUrl(image);
    img.alt = image.actualFilename || image.filename || image.name;
    img.loading = "lazy";  // 懒加载优化
    
    // 错误处理
    img.onerror = () => {
      img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23333' width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='40'%3E?%3C/text%3E%3C/svg%3E";
    };
    
    item.appendChild(img);
    
    // 点击事件
    item.addEventListener("click", () => {
      if (this.onSelect) {
        this.onSelect(index);
      }
    });
    
    return item;
  }
  
  /**
   * 获取图片 URL
   */
  _getImageUrl(image) {
    if (image.isWorkspaceFile) {
      return `/workspace-files/${image.workspaceId}/${image.path}`;
    }
    
    const content = image.content || image.filename;
    if (!content) return "";
    
    if (content.startsWith("data:") || content.startsWith("http://") || content.startsWith("https://")) {
      return content;
    }
    
    return `/artifacts/${content}`;
  }
  
  /**
   * 更新当前索引
   */
  setCurrentIndex(index) {
    if (index < 0 || index >= this.images.length) return;
    this.currentIndex = index;
    this._updateActiveState();
  }
  
  /**
   * 更新图片列表
   */
  setImages(images) {
    this.images = images;
    this.render();
  }
  
  /**
   * 更新高亮状态
   */
  _updateActiveState() {
    this.thumbnailElements.forEach((item, index) => {
      if (index === this.currentIndex) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
  }
  
  /**
   * 滚动到当前图片
   */
  scrollToCurrent() {
    if (!this.listElement || this.currentIndex < 0) return;
    
    const currentItem = this.thumbnailElements[this.currentIndex];
    if (!currentItem) return;
    
    // 计算滚动位置，使当前缩略图居中
    const containerWidth = this.container.offsetWidth;
    const itemLeft = currentItem.offsetLeft;
    const itemWidth = currentItem.offsetWidth;
    const scrollLeft = itemLeft - (containerWidth / 2) + (itemWidth / 2);
    
    // 平滑滚动
    this.container.scrollTo({
      left: scrollLeft,
      behavior: "smooth"
    });
  }
  
  /**
   * 销毁组件
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = "";
    }
    this.thumbnailElements = [];
    this.listElement = null;
  }
}

// 导出
if (typeof module !== "undefined" && module.exports) {
  module.exports = ThumbnailNavigator;
}
```

## 5. 性能优化

### 5.1 缩略图懒加载
- 使用 `img` 标签的 `loading="lazy"` 属性
- 只加载可见区域的缩略图
- 预加载相邻的缩略图

### 5.2 图片预加载策略
```javascript
_preloadAdjacentImages() {
  // 预加载前一张和后一张图片
  const prevIndex = this.currentImageIndex - 1;
  const nextIndex = this.currentImageIndex + 1;
  
  [prevIndex, nextIndex].forEach(index => {
    if (index >= 0 && index < this.imageList.length) {
      const image = this.imageList[index];
      const img = new Image();
      img.src = this._getImageUrl(image);
    }
  });
}
```

### 5.3 虚拟滚动（可选，大量图片时）
如果图片数量超过 100 张，可以考虑实现虚拟滚动：
- 只渲染可见区域的缩略图
- 动态添加/移除 DOM 元素
- 使用 Intersection Observer API 监听可见性

## 6. 错误处理

### 6.1 图片加载失败
```javascript
// 在缩略图中显示占位符
img.onerror = () => {
  img.src = "data:image/svg+xml,...";  // SVG 占位符
};
```

### 6.2 API 请求失败
```javascript
try {
  // API 请求
} catch (err) {
  this.logger.error("加载图片失败", err);
  if (window.Toast) {
    window.Toast.error("加载图片失败");
  }
  // 保持在当前图片，不切换
}
```

### 6.3 边界情况处理
- 图片列表为空：不显示导航组件
- 只有一张图片：显示缩略图但不显示箭头按钮
- 过滤后没有图片：隐藏导航组件

## 7. 测试策略

### 7.1 单元测试
- ThumbnailNavigator 组件的渲染
- 索引更新逻辑
- 滚动逻辑
- 事件处理

### 7.2 集成测试
- 图片切换流程
- 键盘导航
- 缩略图点击
- 箭头按钮点击
- 过滤条件变化后的导航

### 7.3 性能测试
- 大量图片（50+）的加载性能
- 切换流畅度
- 内存占用

### 7.4 兼容性测试
- 不同浏览器
- 不同屏幕尺寸
- 触摸设备（如果支持）

## 8. 文件结构

```
web/js/components/
├── artifact-manager.js          # 修改：添加图片导航逻辑
├── image-viewer.js              # 修改：支持导航回调
└── thumbnail-navigator.js       # 新增：缩略图导航器组件

web/css/
└── artifact-manager.css         # 修改：添加导航相关样式
```

## 9. 实现步骤建议

1. **创建 ThumbnailNavigator 组件**
   - 实现基本的渲染和事件处理
   - 添加样式

2. **修改 ArtifactManager**
   - 添加图片列表管理逻辑
   - 实现切换方法
   - 集成 ThumbnailNavigator

3. **添加键盘导航**
   - 绑定键盘事件
   - 实现循环切换逻辑

4. **添加箭头按钮**
   - 创建按钮元素
   - 绑定点击事件
   - 添加样式

5. **性能优化**
   - 实现懒加载
   - 添加预加载
   - 优化滚动性能

6. **测试和调试**
   - 单元测试
   - 集成测试
   - 性能测试
   - 修复 bug

## 10. 注意事项

### 10.1 CSS 变量使用
所有可配置的样式参数都应该使用 CSS 变量定义，便于用户自定义：
```css
:root {
  --thumbnail-height: 80px;
  --thumbnail-gap: 8px;
  --thumbnail-border-radius: 4px;
  --thumbnail-active-border-color: #007acc;
  --thumbnail-active-border-width: 3px;
}
```

### 10.2 事件清理
在组件销毁时，必须清理所有事件监听器，避免内存泄漏：
```javascript
destroy() {
  // 移除事件监听器
  document.removeEventListener("keydown", this._handleImageNavigationKeys);
  
  // 销毁子组件
  if (this.thumbnailNavigator) {
    this.thumbnailNavigator.destroy();
    this.thumbnailNavigator = null;
  }
}
```

### 10.3 状态同步
确保以下状态始终保持同步：
- `currentImageIndex`
- `selectedArtifact`
- `thumbnailNavigator` 的高亮状态
- 箭头按钮的状态

### 10.4 可访问性
- 为按钮添加 `title` 属性
- 为图片添加 `alt` 属性
- 支持键盘导航
- 考虑屏幕阅读器的支持

## 11. 后续扩展

### 11.1 触摸支持
```javascript
// 添加触摸滑动支持
let touchStartX = 0;
let touchEndX = 0;

container.addEventListener("touchstart", (e) => {
  touchStartX = e.changedTouches[0].screenX;
});

container.addEventListener("touchend", (e) => {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
});

function handleSwipe() {
  if (touchEndX < touchStartX - 50) {
    // 向左滑动，下一张
    this._navigateToNextImage();
  }
  if (touchEndX > touchStartX + 50) {
    // 向右滑动，上一张
    this._navigateToPreviousImage();
  }
}
```

### 11.2 幻灯片模式
- 自动播放
- 可配置的播放间隔
- 播放/暂停控制

### 11.3 缩略图网格视图
- 提供网格布局选项
- 支持多行显示
- 更好的空间利用

## 12. 总结

本设计文档详细描述了图片导航功能的实现方案，包括：
- 缩略图导航栏（单行横向，80px 高度）
- 左右箭头按钮（悬浮在图片两侧）
- 键盘导航（左右方向键，循环切换）
- 完整的数据流和状态管理
- 性能优化策略
- 错误处理机制

所有设计都遵循模块化原则，使用 CSS 变量提供可配置性，确保代码的可维护性和可扩展性。
