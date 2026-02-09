/**
 * 预览容器组件
 * 承载具体预览器，处理缩放、拖拽等交互
 * 
 * @description 主预览区域，支持缩放和拖拽
 * @module PreviewContainer
 * @version 1.0.0
 */

/**
 * 预览容器类
 * @class PreviewContainer
 */
export class PreviewContainer {
  /**
   * 创建预览容器实例
   * @param {Object} options - 容器选项
   * @param {number} options.zoom - 初始缩放比例
   * @param {number} options.minZoom - 最小缩放比例
   * @param {number} options.maxZoom - 最大缩放比例
   * @param {boolean} options.enableZoom - 是否启用缩放
   * @param {boolean} options.enablePan - 是否启用拖拽
   */
  constructor(options = {}) {
    this.options = {
      zoom: options.zoom || 1,
      minZoom: options.minZoom || 0.1,
      maxZoom: options.maxZoom || 5,
      enableZoom: options.enableZoom !== false,
      enablePan: options.enablePan !== false,
      ...options
    };
    
    this.zoomLevel = this.options.zoom;
    this.isPanning = false;
    this.lastMousePosition = { x: 0, y: 0 };
    this.panOffset = { x: 0, y: 0 };
    
    this.callbacks = {};
    this.contentElement = null;
    
    this.element = this.render();
    this.bindEvents();
  }

  /**
   * 渲染容器
   * @returns {HTMLElement} 容器元素
   */
  render() {
    const container = document.createElement('div');
    container.className = 'preview-container';
    
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'preview-content-wrapper';
    
    container.appendChild(contentWrapper);
    
    this.element = container;
    this.contentWrapper = contentWrapper;
    
    return container;
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    if (this.options.enablePan) {
      this.bindPanEvents();
    }
  }

  /**
   * 绑定拖拽事件
   */
  bindPanEvents() {
    const container = this.contentWrapper;
    
    container.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isPanning = true;
        this.lastMousePosition = { x: e.clientX, y: e.clientY };
        container.style.cursor = 'grabbing';
      }
    });
    
    document.addEventListener('mousemove', (e) => {
      if (this.isPanning) {
        const deltaX = e.clientX - this.lastMousePosition.x;
        const deltaY = e.clientY - this.lastMousePosition.y;
        
        this.panOffset.x += deltaX;
        this.panOffset.y += deltaY;
        
        this.updateTransform();
        
        this.lastMousePosition = { x: e.clientX, y: e.clientY };
      }
    });
    
    document.addEventListener('mouseup', () => {
      if (this.isPanning) {
        this.isPanning = false;
        container.style.cursor = 'grab';
      }
    });
  }

  /**
   * 设置文件内容
   * @param {HTMLElement} content - 内容元素
   */
  setContent(content) {
    this.clearContent();
    this.contentElement = content;
    this.contentWrapper.appendChild(content);
  }

  /**
   * 清除内容
   */
  clearContent() {
    this.contentWrapper.innerHTML = '';
    this.contentElement = null;
  }

  /**
   * 获取内容元素
   * @returns {HTMLElement} 内容元素
   */
  getContentElement() {
    return this.contentWrapper;
  }

  /**
   * 设置缩放比例
   * @param {number} zoom - 缩放比例
   */
  setZoom(zoom) {
    this.zoomLevel = Math.max(this.options.minZoom, Math.min(this.options.maxZoom, zoom));
    this.updateTransform();
    
    // 触发缩放变化回调
    this.triggerCallback('zoom:change', this.zoomLevel);
  }

  /**
   * 放大
   */
  zoomIn() {
    this.setZoom(this.zoomLevel * 1.2);
  }

  /**
   * 缩小
   */
  zoomOut() {
    this.setZoom(this.zoomLevel / 1.2);
  }

  /**
   * 重置缩放
   */
  resetZoom() {
    this.setZoom(1);
    this.panOffset = { x: 0, y: 0 };
    this.updateTransform();
  }

  /**
   * 更新变换
   */
  updateTransform() {
    if (this.contentElement) {
      const transform = `translate(${this.panOffset.x}px, ${this.panOffset.y}px) scale(${this.zoomLevel})`;
      this.contentElement.style.transform = transform;
    }
  }

  /**
   * 注册回调
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  on(event, callback) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
  }

  /**
   * 触发回调
   * @param {string} event - 事件名称
   * @param {*} data - 事件数据
   */
  triggerCallback(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(callback => callback(data));
    }
  }

  /**
   * 销毁容器
   */
  destroy() {
    this.clearContent();
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.callbacks = {};
  }
}