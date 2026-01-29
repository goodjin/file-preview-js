/**
 * ToolbarComponent - 工具栏组件
 * 提供预览操作工具栏，包括缩放控制、页面导航、全屏切换等功能
 */
class ToolbarComponent {
  /**
   * 构造函数
   * @param {HTMLElement} container - 容器元素
   * @param {Object} options - 配置选项
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      position: 'bottom',           // 工具栏位置: 'top' | 'bottom'
      showZoom: true,                // 显示缩放控制
      showPageNav: false,            // 显示页面导航
      showFullscreen: true,          // 显示全屏按钮
      showDownload: false,           // 显示下载按钮
      showPrint: false,              // 显示打印按钮
      zoom: 1.0,                     // 当前缩放比例
      currentPage: 0,                // 当前页码
      totalPages: 0,                 // 总页数
      zoomSteps: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4],  // 缩放级别
      ...options
    };
    
    this.currentZoom = this.options.zoom;
    this.eventListeners = {};
    this.elements = {};
    
    this._init();
  }
  
  /**
   * 初始化组件
   * @private
   */
  _init() {
    this._render();
    this._bindEvents();
    this._updateZoomDisplay();
    this._updatePageDisplay();
  }
  
  /**
   * 渲染组件DOM
   * @private
   */
  _render() {
    const toolbar = document.createElement('div');
    toolbar.className = `toolbar toolbar--${this.options.position}`;
    toolbar.setAttribute('data-component', 'toolbar');
    
    // 左侧：缩放控制
    const leftGroup = this._createZoomGroup();
    toolbar.appendChild(leftGroup);
    
    // 中间：页面导航
    if (this.options.showPageNav) {
      const centerGroup = this._createPageNavGroup();
      toolbar.appendChild(centerGroup);
    }
    
    // 右侧：功能按钮
    const rightGroup = this._createActionGroup();
    toolbar.appendChild(rightGroup);
    
    this.container.appendChild(toolbar);
    this.elements.toolbar = toolbar;
  }
  
  /**
   * 创建缩放控制组
   * @private
   * @returns {HTMLElement}
   */
  _createZoomGroup() {
    const group = document.createElement('div');
    group.className = 'toolbar__group';
    
    // 缩小按钮
    const zoomOutBtn = this._createButton('-', 'toolbar__button', 'zoom-out');
    group.appendChild(zoomOutBtn);
    
    // 缩放比例显示
    const zoomDisplay = document.createElement('span');
    zoomDisplay.className = 'toolbar__zoom-display';
    zoomDisplay.textContent = `${Math.round(this.currentZoom * 100)}%`;
    group.appendChild(zoomDisplay);
    this.elements.zoomDisplay = zoomDisplay;
    
    // 放大按钮
    const zoomInBtn = this._createButton('+', 'toolbar__button', 'zoom-in');
    group.appendChild(zoomInBtn);
    
    return group;
  }
  
  /**
   * 创建页面导航组
   * @private
   * @returns {HTMLElement}
   */
  _createPageNavGroup() {
    const group = document.createElement('div');
    group.className = 'toolbar__group';
    
    // 上一页按钮
    const prevBtn = this._createButton('‹', 'toolbar__button', 'prev-page');
    group.appendChild(prevBtn);
    
    // 页码显示
    const pageDisplay = document.createElement('span');
    pageDisplay.className = 'toolbar__page-display';
    pageDisplay.innerHTML = `
      <span class="toolbar__page-display__current">0</span>
      <span> / </span>
      <span class="toolbar__page-display__total">0</span>
    `;
    group.appendChild(pageDisplay);
    this.elements.pageDisplay = pageDisplay;
    
    // 下一页按钮
    const nextBtn = this._createButton('›', 'toolbar__button', 'next-page');
    group.appendChild(nextBtn);
    
    return group;
  }
  
  /**
   * 创建功能按钮组
   * @private
   * @returns {HTMLElement}
   */
  _createActionGroup() {
    const group = document.createElement('div');
    group.className = 'toolbar__group';
    
    // 全屏按钮
    if (this.options.showFullscreen) {
      const fullscreenBtn = this._createButton('⛶', 'toolbar__button', 'fullscreen');
      group.appendChild(fullscreenBtn);
    }
    
    // 下载按钮
    if (this.options.showDownload) {
      const downloadBtn = this._createButton('↓', 'toolbar__button', 'download');
      group.appendChild(downloadBtn);
    }
    
    // 打印按钮
    if (this.options.showPrint) {
      const printBtn = this._createButton('⎙', 'toolbar__button', 'print');
      group.appendChild(printBtn);
    }
    
    return group;
  }
  
  /**
   * 创建按钮
   * @private
   * @param {string} text - 按钮文字/图标
   * @param {string} className - 类名
   * @param {string} action - 操作类型
   * @returns {HTMLButtonElement}
   */
  _createButton(text, className, action) {
    const button = document.createElement('button');
    button.className = className;
    button.textContent = text;
    button.setAttribute('data-action', action);
    button.type = 'button';
    return button;
  }
  
  /**
   * 绑定事件
   * @private
   */
  _bindEvents() {
    const toolbar = this.elements.toolbar;
    
    // 点击事件委托
    toolbar.addEventListener('click', (e) => {
      const button = e.target.closest('.toolbar__button');
      if (!button) return;
      
      const action = button.getAttribute('data-action');
      this._handleAction(action);
    });
  }
  
  /**
   * 处理按钮操作
   * @private
   * @param {string} action - 操作类型
   */
  _handleAction(action) {
    switch (action) {
      case 'zoom-in':
        this.zoomIn();
        break;
      case 'zoom-out':
        this.zoomOut();
        break;
      case 'prev-page':
        this.prevPage();
        break;
      case 'next-page':
        this.nextPage();
        break;
      case 'fullscreen':
        this.toggleFullscreen();
        break;
      case 'download':
        this.emit('download');
        break;
      case 'print':
        this.emit('print');
        break;
    }
  }
  
  /**
   * 放大
   */
  zoomIn() {
    const currentIndex = this.options.zoomSteps.indexOf(this.currentZoom);
    if (currentIndex < this.options.zoomSteps.length - 1) {
      this.setZoom(this.options.zoomSteps[currentIndex + 1]);
    }
  }
  
  /**
   * 缩小
   */
  zoomOut() {
    const currentIndex = this.options.zoomSteps.indexOf(this.currentZoom);
    if (currentIndex > 0) {
      this.setZoom(this.options.zoomSteps[currentIndex - 1]);
    }
  }
  
  /**
   * 设置缩放级别
   * @param {number} zoom - 缩放比例
   */
  setZoom(zoom) {
    this.currentZoom = zoom;
    this._updateZoomDisplay();
    this.emit('zoomChange', this.currentZoom);
  }
  
  /**
   * 更新缩放显示
   * @private
   */
  _updateZoomDisplay() {
    if (this.elements.zoomDisplay) {
      this.elements.zoomDisplay.textContent = `${Math.round(this.currentZoom * 100)}%`;
    }
    
    // 更新按钮状态
    const zoomButtons = this.elements.toolbar.querySelectorAll('[data-action="zoom-in"], [data-action="zoom-out"]');
    zoomButtons.forEach(btn => {
      const action = btn.getAttribute('data-action');
      const currentIndex = this.options.zoomSteps.indexOf(this.currentZoom);
      
      if (action === 'zoom-in') {
        btn.classList.toggle('toolbar__button--disabled', currentIndex >= this.options.zoomSteps.length - 1);
      } else if (action === 'zoom-out') {
        btn.classList.toggle('toolbar__button--disabled', currentIndex <= 0);
      }
    });
  }
  
  /**
   * 上一页
   */
  prevPage() {
    if (this.options.currentPage > 0) {
      this.setPage(this.options.currentPage - 1);
    }
  }
  
  /**
   * 下一页
   */
  nextPage() {
    if (this.options.currentPage < this.options.totalPages - 1) {
      this.setPage(this.options.currentPage + 1);
    }
  }
  
  /**
   * 设置页码
   * @param {number} page - 页码（从0开始）
   */
  setPage(page) {
    this.options.currentPage = Math.max(0, Math.min(page, this.options.totalPages - 1));
    this._updatePageDisplay();
    this.emit('pageChange', this.options.currentPage);
  }
  
  /**
   * 设置总页数
   * @param {number} total - 总页数
   */
  setTotalPages(total) {
    this.options.totalPages = Math.max(0, total);
    this._updatePageDisplay();
  }
  
  /**
   * 更新页码显示
   * @private
   */
  _updatePageDisplay() {
    if (this.elements.pageDisplay) {
      const current = this.elements.pageDisplay.querySelector('.toolbar__page-display__current');
      const total = this.elements.pageDisplay.querySelector('.toolbar__page-display__total');
      
      if (current) {
        current.textContent = this.options.totalPages > 0 ? this.options.currentPage + 1 : 0;
      }
      
      if (total) {
        total.textContent = this.options.totalPages;
      }
    }
    
    // 更新按钮状态
    const prevBtn = this.elements.toolbar.querySelector('[data-action="prev-page"]');
    const nextBtn = this.elements.toolbar.querySelector('[data-action="next-page"]');
    
    if (prevBtn) {
      prevBtn.classList.toggle('toolbar__button--disabled', this.options.currentPage <= 0);
    }
    
    if (nextBtn) {
      nextBtn.classList.toggle(
        'toolbar__button--disabled',
        this.options.currentPage >= this.options.totalPages - 1
      );
    }
  }
  
  /**
   * 切换全屏
   */
  toggleFullscreen() {
    this.emit('fullscreenToggle');
  }
  
  /**
   * 显示工具栏
   */
  show() {
    this.elements.toolbar.style.display = 'flex';
  }
  
  /**
   * 隐藏工具栏
   */
  hide() {
    this.elements.toolbar.style.display = 'none';
  }
  
  /**
   * 事件监听
   * @param {string} event - 事件名称
   * @param {Function} handler - 事件处理函数
   */
  on(event, handler) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(handler);
  }
  
  /**
   * 移除事件监听
   * @param {string} event - 事件名称
   * @param {Function} handler - 事件处理函数
   */
  off(event, handler) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(h => h !== handler);
    }
  }
  
  /**
   * 触发事件
   * @private
   * @param {string} event - 事件名称
   * @param {*} data - 事件数据
   */
  emit(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(handler => handler(data));
    }
  }
  
  /**
   * 销毁组件
   */
  destroy() {
    if (this.elements.toolbar && this.elements.toolbar.parentNode) {
      this.elements.toolbar.parentNode.removeChild(this.elements.toolbar);
    }
    this.eventListeners = {};
    this.elements = {};
    this.emit('destroy');
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ToolbarComponent;
}
