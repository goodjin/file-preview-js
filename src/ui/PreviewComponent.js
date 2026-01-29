/**
 * PreviewComponent - 预览组件
 * 主预览容器组件，负责显示文件内容、处理加载状态和显示错误信息
 */
class PreviewComponent {
  /**
   * 构造函数
   * @param {HTMLElement} container - 容器元素
   * @param {Object} options - 配置选项
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      width: '100%',
      height: '100%',
      minZoom: 0.25,
      maxZoom: 4.0,
      defaultZoom: 1.0,
      zoomSteps: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4],
      showToolbar: true,
      showStatus: true,
      toolbarPosition: 'bottom',
      fullscreen: false,
      ...options
    };

    this.currentZoom = this.options.defaultZoom;
    this.currentFile = null;
    this.isFullscreen = false;
    this.eventListeners = {};
    this.elements = {};
    this.toolbar = null;
    this.status = null;

    this._init();
  }

  /**
   * 初始化组件
   * @private
   */
  _init() {
    this._render();
    this._initToolbar();
    this._initStatus();
    this._bindEvents();
    this._updateCanvasTransform();
  }

  /**
   * 渲染组件DOM
   * @private
   */
  _render() {
    // 主容器
    const previewContainer = document.createElement('div');
    previewContainer.className = 'preview-container';
    previewContainer.setAttribute('data-component', 'preview');
    previewContainer.style.width = this.options.width;
    previewContainer.style.height = this.options.height;

    // 顶部工具栏容器
    const toolbarTop = document.createElement('div');
    toolbarTop.className = 'preview-toolbar-top';
    previewContainer.appendChild(toolbarTop);
    this.elements.toolbarTop = toolbarTop;

    // 状态覆盖层
    const statusOverlay = document.createElement('div');
    statusOverlay.className = 'status-overlay';
    previewContainer.appendChild(statusOverlay);
    this.elements.statusOverlay = statusOverlay;

    // 预览内容区域
    const previewContent = document.createElement('div');
    previewContent.className = 'preview-content';

    const previewCanvas = document.createElement('div');
    previewCanvas.className = 'preview-canvas';
    previewContent.appendChild(previewCanvas);
    this.elements.previewCanvas = previewCanvas;

    previewContainer.appendChild(previewContent);
    this.elements.previewContent = previewContent;

    // 底部工具栏容器
    const toolbarBottom = document.createElement('div');
    toolbarBottom.className = 'preview-toolbar-bottom';
    previewContainer.appendChild(toolbarBottom);
    this.elements.toolbarBottom = toolbarBottom;

    this.container.appendChild(previewContainer);
    this.elements.previewContainer = previewContainer;
  }

  /**
   * 初始化工具栏
   * @private
   */
  _initToolbar() {
    if (!this.options.showToolbar) return;

    const ToolbarComponent = window.ToolbarComponent;
    if (!ToolbarComponent) {
      console.warn('ToolbarComponent not found, toolbar disabled');
      return;
    }

    const toolbarContainer = this.options.toolbarPosition === 'top'
      ? this.elements.toolbarTop
      : this.elements.toolbarBottom;

    this.toolbar = new ToolbarComponent(toolbarContainer, {
      position: this.options.toolbarPosition,
      showZoom: true,
      showPageNav: false,
      showFullscreen: true,
      zoom: this.currentZoom,
      zoomSteps: this.options.zoomSteps
    });

    // 监听工具栏事件
    this.toolbar.on('zoomChange', (zoom) => {
      this._onZoomChange(zoom);
    });

    this.toolbar.on('fullscreenToggle', () => {
      this.toggleFullscreen();
    });
  }

  /**
   * 初始化状态组件
   * @private
   */
  _initStatus() {
    if (!this.options.showStatus) return;

    const StatusComponent = window.StatusComponent;
    if (!StatusComponent) {
      console.warn('StatusComponent not found, status disabled');
      return;
    }

    this.status = new StatusComponent(this.elements.statusOverlay, {
      position: 'center',
      showProgress: true
    });

    // 监听状态组件事件
    this.status.on('retry', () => {
      this._onRetry();
    });
  }

  /**
   * 绑定事件
   * @private
   */
  _bindEvents() {
    // 监听键盘事件
    document.addEventListener('keydown', (e) => {
      if (!this.isFullscreen) return;

      if (e.key === 'Escape') {
        this.toggleFullscreen();
      }
    });

    // 监听全屏变化
    document.addEventListener('fullscreenchange', () => {
      this._onFullscreenChange();
    });
  }

  /**
   * 加载文件
   * @param {File} file - 文件对象
   */
  loadFile(file) {
    this.currentFile = file;
    this.emit('loadStart', { file });

    // 显示加载状态
    if (this.status) {
      this.status.showFileInfo({
        name: file.name,
        size: file.size,
        type: file.type
      });
    }

    this.showLoading('正在加载文件...');

    // 模拟文件加载（实际项目中这里应该是真正的文件解析逻辑）
    setTimeout(() => {
      this._onFileLoaded(file);
    }, 500);
  }

  /**
   * 文件加载完成
   * @private
   * @param {File} file - 文件对象
   */
  _onFileLoaded(file) {
    // 清空画布内容
    this.elements.previewCanvas.innerHTML = '';

    // 创建文件预览内容（根据文件类型）
    const previewContent = this._createPreviewContent(file);
    this.elements.previewCanvas.appendChild(previewContent);

    this.hideLoading();
    this.emit('load', { file });
  }

  /**
   * 创建预览内容
   * @private
   * @param {File} file - 文件对象
   * @returns {HTMLElement}
   */
  _createPreviewContent(file) {
    const container = document.createElement('div');
    container.className = 'preview-content-item';

    // 根据文件类型创建不同的预览元素
    if (file.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.style.maxWidth = '100%';
      img.style.maxHeight = '100%';
      img.style.display = 'block';
      container.appendChild(img);

      // 图片加载完成后释放对象URL
      img.onload = () => {
        URL.revokeObjectURL(img.src);
      };
    } else if (file.type === 'application/pdf') {
      const iframe = document.createElement('iframe');
      iframe.src = URL.createObjectURL(file);
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      container.appendChild(iframe);
    } else if (file.type.startsWith('text/')) {
      const pre = document.createElement('pre');
      pre.textContent = '文本文件预览';
      pre.style.whiteSpace = 'pre-wrap';
      pre.style.wordWrap = 'break-word';
      container.appendChild(pre);
    } else {
      const placeholder = document.createElement('div');
      placeholder.innerHTML = `
        <div style="text-align: center; padding: 40px;">
          <div style="font-size: 64px;">📄</div>
          <div style="margin-top: 16px; font-size: 16px;">${file.name}</div>
          <div style="margin-top: 8px; color: #6B7280;">${this._formatFileSize(file.size)}</div>
        </div>
      `;
      container.appendChild(placeholder);
    }

    return container;
  }

  /**
   * 设置缩放级别
   * @param {number} zoom - 缩放比例
   */
  setZoom(zoom) {
    const clampedZoom = Math.max(this.options.minZoom, Math.min(this.options.maxZoom, zoom));
    this.currentZoom = clampedZoom;

    // 同步到工具栏
    if (this.toolbar) {
      this.toolbar.setZoom(this.currentZoom);
    }

    this._updateCanvasTransform();
    this.emit('zoomChange', this.currentZoom);
  }

  /**
   * 更新画布变换
   * @private
   */
  _updateCanvasTransform() {
    if (this.elements.previewCanvas) {
      this.elements.previewCanvas.style.transform = `scale(${this.currentZoom})`;
    }
  }

  /**
   * 工具栏缩放变化处理
   * @private
   * @param {number} zoom - 缩放比例
   */
  _onZoomChange(zoom) {
    this.currentZoom = zoom;
    this._updateCanvasTransform();
    this.emit('zoomChange', zoom);
  }

  /**
   * 切换全屏
   */
  toggleFullscreen() {
    if (this.isFullscreen) {
      this._exitFullscreen();
    } else {
      this._enterFullscreen();
    }
  }

  /**
   * 进入全屏
   * @private
   */
  _enterFullscreen() {
    const element = this.elements.previewContainer;

    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
      element.msRequestFullscreen();
    }
  }

  /**
   * 退出全屏
   * @private
   */
  _exitFullscreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }

  /**
   * 全屏状态变化处理
   * @private
   */
  _onFullscreenChange() {
    const isFullscreen = document.fullscreenElement === this.elements.previewContainer;

    if (isFullscreen && !this.isFullscreen) {
      this.isFullscreen = true;
      this.elements.previewContainer.classList.add('preview-container--fullscreen');
      this.emit('fullscreenEnter');
    } else if (!isFullscreen && this.isFullscreen) {
      this.isFullscreen = false;
      this.elements.previewContainer.classList.remove('preview-container--fullscreen');
      this.emit('fullscreenExit');
    }
  }

  /**
   * 显示加载状态
   * @param {string} text - 加载文字
   */
  showLoading(text = '正在加载...') {
    if (this.status) {
      this.status.showLoading(text);
    }
    this.emit('loadStart', { text });
  }

  /**
   * 隐藏加载状态
   */
  hideLoading() {
    if (this.status) {
      this.status.hide();
    }
  }

  /**
   * 显示错误信息
   * @param {string} message - 错误消息
   */
  showError(message) {
    if (this.status) {
      this.status.showError(message);
    }
    this.emit('loadError', { message });
  }

  /**
   * 显示成功消息
   * @param {string} message - 成功消息
   */
  showSuccess(message) {
    if (this.status) {
      this.status.showSuccess(message);
    }
  }

  /**
   * 重试处理
   * @private
   */
  _onRetry() {
    if (this.currentFile) {
      this.loadFile(this.currentFile);
    }
  }

  /**
   * 格式化文件大小
   * @private
   * @param {number} bytes - 字节数
   * @returns {string}
   */
  _formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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
    // 销毁工具栏
    if (this.toolbar) {
      this.toolbar.destroy();
      this.toolbar = null;
    }

    // 销毁状态组件
    if (this.status) {
      this.status.destroy();
      this.status = null;
    }

    // 移除DOM元素
    if (this.elements.previewContainer && this.elements.previewContainer.parentNode) {
      this.elements.previewContainer.parentNode.removeChild(this.elements.previewContainer);
    }

    this.eventListeners = {};
    this.elements = {};
    this.currentFile = null;
    this.emit('destroy');
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PreviewComponent;
}
