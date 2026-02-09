/**
 * 顶部导航栏组件
 * 显示品牌标识、文件信息、全局操作按钮
 * 
 * @description 顶部导航栏，显示Logo、文件信息和操作按钮
 * @module NavBar
 * @version 1.0.0
 */

import { Button } from './Button.js';

/**
 * 顶部导航栏类
 * @class NavBar
 */
export class NavBar {
  /**
   * 创建导航栏实例
   * @param {Object} options - 导航栏选项
   * @param {string} options.title - 标题
   * @param {boolean} options.showBackButton - 是否显示返回按钮
   */
  constructor(options = {}) {
    this.title = options.title || '文件预览系统';
    this.showBackButton = options.showBackButton || false;
    this.fileName = options.fileName || '';
    this.fileSize = options.fileSize || '';
    
    this.callbacks = {};
    
    this.element = this.render();
  }

  /**
   * 渲染导航栏
   * @returns {HTMLElement} 导航栏元素
   */
  render() {
    const navBar = document.createElement('div');
    navBar.className = 'nav-bar';
    
    // Logo区域
    const logoArea = document.createElement('div');
    logoArea.className = 'nav-bar__logo';
    logoArea.innerHTML = `<span class="logo-icon">📄</span><span class="logo-text">FilePreview</span>`;
    navBar.appendChild(logoArea);
    
    // 文件信息区
    const fileInfoArea = document.createElement('div');
    fileInfoArea.className = 'nav-bar__title';
    
    const fileName = document.createElement('div');
    fileName.className = 'nav-bar__file-name';
    fileName.textContent = this.fileName;
    this.fileNameElement = fileName;
    
    const fileSize = document.createElement('div');
    fileSize.className = 'nav-bar__file-size';
    fileSize.textContent = this.fileSize;
    this.fileSizeElement = fileSize;
    
    fileInfoArea.appendChild(fileName);
    if (this.fileSize) {
      fileInfoArea.appendChild(fileSize);
    }
    
    navBar.appendChild(fileInfoArea);
    
    // 操作按钮区
    const actionsArea = document.createElement('div');
    actionsArea.className = 'nav-bar__actions';
    
    if (this.showBackButton) {
      const backButton = new Button({
        type: 'secondary',
        text: '返回',
        onClick: () => this.triggerCallback('back')
      });
      actionsArea.appendChild(backButton.element);
    }
    
    navBar.appendChild(actionsArea);
    
    this.element = navBar;
    return navBar;
  }

  /**
   * 设置文件名
   * @param {string} fileName - 文件名
   */
  setFileName(fileName) {
    this.fileName = fileName;
    if (this.fileNameElement) {
      this.fileNameElement.textContent = fileName;
    }
  }

  /**
   * 设置文件大小
   * @param {string} fileSize - 文件大小
   */
  setFileSize(fileSize) {
    this.fileSize = fileSize;
    if (this.fileSizeElement) {
      this.fileSizeElement.textContent = fileSize;
    }
  }

  /**
   * 注册事件回调
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
   * 销毁导航栏
   */
  destroy() {
    this.callbacks = {};
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}