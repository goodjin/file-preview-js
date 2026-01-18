/**
 * 缩略图导航器组件
 * 显示图片缩略图列表，支持点击跳转和自动滚动
 * 
 * 功能：
 * - 渲染图片缩略图列表（单行横向布局）
 * - 高亮当前选中的图片
 * - 点击缩略图跳转到对应图片
 * - 自动滚动以保持当前图片可见
 * - 支持懒加载优化
 * 
 * 使用示例：
 * const navigator = new ThumbnailNavigator({
 *   container: document.getElementById('thumbnail-container'),
 *   images: imageList,
 *   currentIndex: 0,
 *   thumbnailHeight: 80,
 *   onSelect: (index) => { console.log('Selected:', index); }
 * });
 * navigator.render();
 */
class ThumbnailNavigator {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {HTMLElement} options.container - 容器元素
   * @param {Array} options.images - 图片列表
   * @param {number} options.currentIndex - 当前图片索引
   * @param {Function} options.onSelect - 选择图片的回调函数
   * @param {number} options.thumbnailHeight - 缩略图高度（像素）
   */
  constructor(options = {}) {
    // 容器元素
    this.container = options.container;
    
    // 图片列表
    this.images = options.images || [];
    
    // 当前图片索引
    this.currentIndex = options.currentIndex || 0;
    
    // 选择回调函数
    this.onSelect = options.onSelect;
    
    // 缩略图高度（默认 80px）
    this.thumbnailHeight = options.thumbnailHeight || 80;
    
    // DOM 元素引用
    this.listElement = null;
    this.thumbnailElements = [];
  }
  
  /**
   * 渲染缩略图导航栏
   * 创建缩略图列表并添加到容器中
   */
  render() {
    if (!this.container) {
      console.error('ThumbnailNavigator: 容器元素不存在');
      return;
    }
    
    // 清空容器
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
   * @param {Object} image - 图片对象
   * @param {number} index - 图片索引
   * @returns {HTMLElement} 缩略图元素
   */
  _createThumbnailItem(image, index) {
    const item = document.createElement("div");
    item.className = "thumbnail-item";
    item.dataset.index = index;
    
    const img = document.createElement("img");
    img.src = this._getImageUrl(image);
    img.alt = image.actualFilename || image.filename || image.name || `图片 ${index + 1}`;
    img.loading = "lazy";  // 懒加载优化
    
    // 图片加载失败时显示占位符
    img.onerror = () => {
      // 使用 SVG 占位符（灰色背景 + 问号）
      img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23333' width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='40'%3E?%3C/text%3E%3C/svg%3E";
    };
    
    item.appendChild(img);
    
    // 点击事件：选择该图片
    item.addEventListener("click", () => {
      if (this.onSelect) {
        this.onSelect(index);
      }
    });
    
    return item;
  }
  
  /**
   * 获取图片 URL
   * 支持工作空间文件和普通工件
   * @param {Object} image - 图片对象
   * @returns {string} 图片 URL
   */
  _getImageUrl(image) {
    // 工作空间文件
    if (image.isWorkspaceFile) {
      return `/workspace-files/${image.workspaceId}/${image.path}`;
    }
    
    // 获取图片内容
    const content = image.content || image.filename;
    if (!content) return "";
    
    // 已经是完整 URL（data: 或 http(s):）
    if (content.startsWith("data:") || content.startsWith("http://") || content.startsWith("https://")) {
      return content;
    }
    
    // 文件名，构建 artifacts 路径
    return `/artifacts/${content}`;
  }
  
  /**
   * 更新当前索引
   * @param {number} index - 新的索引
   */
  setCurrentIndex(index) {
    if (index < 0 || index >= this.images.length) {
      console.warn('ThumbnailNavigator: 索引超出范围', index);
      return;
    }
    this.currentIndex = index;
    this._updateActiveState();
  }
  
  /**
   * 更新图片列表
   * @param {Array} images - 新的图片列表
   */
  setImages(images) {
    this.images = images;
    this.render();
  }
  
  /**
   * 更新高亮状态
   * 为当前图片的缩略图添加 active 类
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
   * 使当前缩略图在可见区域居中
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
   * 清理 DOM 元素和事件监听器
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
