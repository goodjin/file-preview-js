/**
 * 加载状态组件
 * 显示文件加载进度和状态
 * 
 * @description 加载状态组件，支持进度条和文本提示
 * @module LoadingState
 * @version 1.0.0
 */

/**
 * 加载状态类
 * @class LoadingState
 */
export class LoadingState {
  /**
   * 创建加载状态实例
   */
  constructor() {
    this.progress = 0;
    this.message = '';
    this.isVisible = false;
    
    this.element = this.render();
    this.hide();
  }

  /**
   * 渲染加载状态
   * @returns {HTMLElement} 加载状态元素
   */
  render() {
    const loadingState = document.createElement('div');
    loadingState.className = 'loading-state';
    
    // 加载动画
    const spinner = document.createElement('div');
    spinner.className = 'loading-state__spinner';
    
    const spinnerOuter = document.createElement('div');
    spinnerOuter.className = 'loading-state__spinner-outer';
    
    const spinnerInner = document.createElement('div');
    spinnerInner.className = 'loading-state__spinner-inner';
    
    spinnerOuter.appendChild(spinnerInner);
    spinner.appendChild(spinnerOuter);
    loadingState.appendChild(spinner);
    
    // 消息文本
    const message = document.createElement('div');
    message.className = 'loading-state__message';
    message.textContent = '正在加载...';
    this.messageElement = message;
    loadingState.appendChild(message);
    
    // 进度条
    const progressWrapper = document.createElement('div');
    progressWrapper.className = 'loading-state__progress-wrapper';
    
    const progressBar = document.createElement('div');
    progressBar.className = 'loading-state__progress-bar';
    this.progressBar = progressBar;
    
    const progressFill = document.createElement('div');
    progressFill.className = 'loading-state__progress-fill';
    progressFill.style.width = '0%';
    this.progressFill = progressFill;
    
    progressBar.appendChild(progressFill);
    progressWrapper.appendChild(progressBar);
    loadingState.appendChild(progressWrapper);
    
    // 进度信息
    const progressInfo = document.createElement('div');
    progressInfo.className = 'loading-state__progress-info';
    progressInfo.textContent = '0%';
    this.progressInfo = progressInfo;
    loadingState.appendChild(progressInfo);
    
    this.element = loadingState;
    return loadingState;
  }

  /**
   * 显示加载状态
   */
  show() {
    this.isVisible = true;
    this.element.style.display = 'flex';
  }

  /**
   * 隐藏加载状态
   */
  hide() {
    this.isVisible = false;
    this.element.style.display = 'none';
    this.reset();
  }

  /**
   * 设置进度
   * @param {number} progress - 进度（0-100）
   */
  setProgress(progress) {
    this.progress = Math.max(0, Math.min(100, progress));
    
    if (this.progressFill) {
      this.progressFill.style.width = `${this.progress}%`;
    }
    
    if (this.progressInfo) {
      this.progressInfo.textContent = `${Math.round(this.progress)}%`;
    }
  }

  /**
   * 设置消息
   * @param {string} message - 消息文本
   */
  setMessage(message) {
    this.message = message;
    if (this.messageElement) {
      this.messageElement.textContent = message;
    }
  }

  /**
   * 重置状态
   */
  reset() {
    this.progress = 0;
    this.message = '';
    
    if (this.progressFill) {
      this.progressFill.style.width = '0%';
    }
    
    if (this.progressInfo) {
      this.progressInfo.textContent = '0%';
    }
    
    if (this.messageElement) {
      this.messageElement.textContent = '正在加载...';
    }
  }

  /**
   * 销毁加载状态
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}