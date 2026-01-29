/**
 * StatusComponent - 状态组件
 * 显示预览状态和进度信息，包括加载进度、错误信息、文件信息等
 */
class StatusComponent {
  /**
   * 构造函数
   * @param {HTMLElement} container - 容器元素
   * @param {Object} options - 配置选项
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      showLoading: true,          // 显示加载状态
      showError: true,            // 显示错误状态
      showProgress: true,         // 显示进度条
      position: 'center',         // 位置: 'center' | 'top' | 'bottom'
      autoHide: false,            // 自动隐藏
      autoHideDelay: 3000,        // 自动隐藏延迟（毫秒）
      ...options
    };
    
    this.currentStatus = 'idle';  // idle, loading, success, error
    this.eventListeners = {};
    this.elements = {};
    this.autoHideTimer = null;
    
    this._init();
  }
  
  /**
   * 初始化组件
   * @private
   */
  _init() {
    this._render();
    this._bindEvents();
  }
  
  /**
   * 渲染组件DOM
   * @private
   */
  _render() {
    const status = document.createElement('div');
    status.className = `status status--${this.options.position}`;
    status.setAttribute('data-component', 'status');
    status.style.display = 'none';
    
    // 加载状态
    const loadingEl = this._createLoadingElement();
    status.appendChild(loadingEl);
    
    // 错误状态
    const errorEl = this._createErrorElement();
    status.appendChild(errorEl);
    
    // 成功状态
    const successEl = this._createSuccessElement();
    status.appendChild(successEl);
    
    // 进度条
    if (this.options.showProgress) {
      const progressEl = this._createProgressElement();
      status.appendChild(progressEl);
    }
    
    this.container.appendChild(status);
    this.elements.status = status;
  }
  
  /**
   * 创建加载状态元素
   * @private
   * @returns {HTMLElement}
   */
  _createLoadingElement() {
    const loading = document.createElement('div');
    loading.className = 'status__loading';
    loading.style.display = 'none';
    
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    loading.appendChild(spinner);
    
    const text = document.createElement('div');
    text.className = 'loading-text';
    text.textContent = '正在加载...';
    loading.appendChild(text);
    this.elements.loadingText = text;
    
    return loading;
  }
  
  /**
   * 创建错误状态元素
   * @private
   * @returns {HTMLElement}
   */
  _createErrorElement() {
    const error = document.createElement('div');
    error.className = 'status__error';
    error.style.display = 'none';
    
    const icon = document.createElement('div');
    icon.className = 'error-icon';
    icon.textContent = '❌';
    error.appendChild(icon);
    
    const message = document.createElement('div');
    message.className = 'error-message';
    error.appendChild(message);
    this.elements.errorMessage = message;
    
    const actions = document.createElement('div');
    actions.className = 'error-actions';
    
    const retryBtn = document.createElement('button');
    retryBtn.className = 'btn btn-primary btn-sm';
    retryBtn.textContent = '重新加载';
    retryBtn.setAttribute('data-action', 'retry');
    actions.appendChild(retryBtn);
    
    error.appendChild(actions);
    
    return error;
  }
  
  /**
   * 创建成功状态元素
   * @private
   * @returns {HTMLElement}
   */
  _createSuccessElement() {
    const success = document.createElement('div');
    success.className = 'status__success';
    success.style.display = 'none';
    
    const icon = document.createElement('div');
    icon.className = 'success-icon';
    icon.textContent = '✓';
    success.appendChild(icon);
    
    const message = document.createElement('div');
    message.className = 'success-message';
    success.appendChild(message);
    this.elements.successMessage = message;
    
    return success;
  }
  
  /**
   * 创建进度条元素
   * @private
   * @returns {HTMLElement}
   */
  _createProgressElement() {
    const progress = document.createElement('div');
    progress.className = 'status__progress';
    progress.style.display = 'none';
    
    const track = document.createElement('div');
    track.className = 'progress-track';
    
    const fill = document.createElement('div');
    fill.className = 'progress-fill';
    fill.style.width = '0%';
    track.appendChild(fill);
    
    progress.appendChild(track);
    this.elements.progressFill = fill;
    
    const info = document.createElement('div');
    info.className = 'progress-info';
    info.style.display = 'none';
    
    const text = document.createElement('span');
    text.className = 'progress-text';
    info.appendChild(text);
    this.elements.progressText = text;
    
    const percent = document.createElement('span');
    percent.className = 'progress-percent';
    percent.textContent = '0%';
    info.appendChild(percent);
    this.elements.progressPercent = percent;
    
    progress.appendChild(info);
    
    return progress;
  }
  
  /**
   * 绑定事件
   * @private
   */
  _bindEvents() {
    const status = this.elements.status;
    
    // 点击事件委托
    status.addEventListener('click', (e) => {
      const button = e.target.closest('[data-action]');
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
      case 'retry':
        this.emit('retry');
        break;
      case 'close':
        this.hide();
        break;
    }
  }
  
  /**
   * 显示加载状态
   * @param {string} text - 加载文字
   */
  showLoading(text = '正在加载...') {
    this._hideAll();
    this.currentStatus = 'loading';
    
    if (this.elements.loadingText) {
      this.elements.loadingText.textContent = text;
    }
    
    const loadingEl = this.elements.status.querySelector('.status__loading');
    if (loadingEl) {
      loadingEl.style.display = 'flex';
    }
    
    this._show();
    this.emit('loading', { text });
  }
  
  /**
   * 显示错误状态
   * @param {string} message - 错误消息
   */
  showError(message = '加载失败，请重试') {
    this._hideAll();
    this.currentStatus = 'error';
    
    if (this.elements.errorMessage) {
      this.elements.errorMessage.textContent = message;
    }
    
    const errorEl = this.elements.status.querySelector('.status__error');
    if (errorEl) {
      errorEl.style.display = 'flex';
    }
    
    this._hideProgress();
    this._show();
    this.emit('error', { message });
  }
  
  /**
   * 显示成功状态
   * @param {string} message - 成功消息
   */
  showSuccess(message = '加载成功') {
    this._hideAll();
    this.currentStatus = 'success';
    
    if (this.elements.successMessage) {
      this.elements.successMessage.textContent = message;
    }
    
    const successEl = this.elements.status.querySelector('.status__success');
    if (successEl) {
      successEl.style.display = 'flex';
    }
    
    this._hideProgress();
    this._show();
    this.emit('success', { message });
    
    // 自动隐藏
    if (this.options.autoHide) {
      this._scheduleAutoHide();
    }
  }
  
  /**
   * 更新进度
   * @param {number} progress - 进度（0-100）
   * @param {string} text - 进度文字
   */
  updateProgress(progress, text = '') {
    if (!this.options.showProgress) return;
    
    const progressEl = this.elements.status.querySelector('.status__progress');
    if (!progressEl) return;
    
    progressEl.style.display = 'block';
    
    if (this.elements.progressFill) {
      this.elements.progressFill.style.width = `${Math.max(0, Math.min(100, progress))}%`;
    }
    
    if (this.elements.progressPercent) {
      this.elements.progressPercent.textContent = `${Math.round(progress)}%`;
    }
    
    if (text && this.elements.progressText) {
      this.elements.progressText.textContent = text;
      
      const infoEl = this.elements.status.querySelector('.progress-info');
      if (infoEl) {
        infoEl.style.display = 'flex';
      }
    }
    
    this.emit('progress', { progress, text });
  }
  
  /**
   * 显示文件信息
   * @param {Object} fileInfo - 文件信息
   */
  showFileInfo(fileInfo) {
    const info = {
      name: fileInfo.name || '',
      size: fileInfo.size ? this._formatFileSize(fileInfo.size) : '',
      type: fileInfo.type || '',
      ...fileInfo
    };
    
    // 可以在加载状态中显示文件信息
    const text = `${info.name} (${info.size})`;
    this.showLoading(text);
  }
  
  /**
   * 隐藏进度
   * @private
   */
  _hideProgress() {
    const progressEl = this.elements.status.querySelector('.status__progress');
    if (progressEl) {
      progressEl.style.display = 'none';
    }
  }
  
  /**
   * 隐藏所有状态
   * @private
   */
  _hideAll() {
    const loadingEl = this.elements.status.querySelector('.status__loading');
    const errorEl = this.elements.status.querySelector('.status__error');
    const successEl = this.elements.status.querySelector('.status__success');
    
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'none';
    if (successEl) successEl.style.display = 'none';
    
    this._cancelAutoHide();
  }
  
  /**
   * 显示组件
   * @private
   */
  _show() {
    this.elements.status.style.display = 'flex';
  }
  
  /**
   * 隐藏组件
   */
  hide() {
    this.elements.status.style.display = 'none';
    this._hideAll();
    this._cancelAutoHide();
    this.currentStatus = 'idle';
  }
  
  /**
   * 获取当前状态
   * @returns {string}
   */
  getStatus() {
    return this.currentStatus;
  }
  
  /**
   * 是否正在加载
   * @returns {boolean}
   */
  isLoading() {
    return this.currentStatus === 'loading';
  }
  
  /**
   * 是否显示错误
   * @returns {boolean}
   */
  hasError() {
    return this.currentStatus === 'error';
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
   * 计划自动隐藏
   * @private
   */
  _scheduleAutoHide() {
    this._cancelAutoHide();
    this.autoHideTimer = setTimeout(() => {
      this.hide();
    }, this.options.autoHideDelay);
  }
  
  /**
   * 取消自动隐藏
   * @private
   */
  _cancelAutoHide() {
    if (this.autoHideTimer) {
      clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }
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
    this._cancelAutoHide();
    
    if (this.elements.status && this.elements.status.parentNode) {
      this.elements.status.parentNode.removeChild(this.elements.status);
    }
    
    this.eventListeners = {};
    this.elements = {};
    this.emit('destroy');
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StatusComponent;
}
