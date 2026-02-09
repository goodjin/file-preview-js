/**
 * 提示框组件
 * 显示成功、警告、错误提示
 * 
 * @description 提示框组件，支持多种类型的提示
 * @module Alert
 * @version 1.0.0
 */

/**
 * 提示框类
 * @class Alert
 */
export class Alert {
  /**
   * 创建提示框实例
   */
  constructor() {
    this.element = this.render();
    this.hide();
  }

  /**
   * 渲染提示框
   * @returns {HTMLElement} 提示框元素
   */
  render() {
    const alert = document.createElement('div');
    alert.className = 'alert';
    
    // 图标
    const icon = document.createElement('div');
    icon.className = 'alert__icon';
    this.iconElement = icon;
    alert.appendChild(icon);
    
    // 内容
    const content = document.createElement('div');
    content.className = 'alert__content';
    
    const message = document.createElement('div');
    message.className = 'alert__message';
    message.textContent = '提示信息';
    this.messageElement = message;
    content.appendChild(message);
    
    alert.appendChild(content);
    
    // 关闭按钮
    const close = document.createElement('div');
    close.className = 'alert__close';
    close.textContent = '×';
    close.addEventListener('click', () => this.hide());
    alert.appendChild(close);
    
    this.element = alert;
    return alert;
  }

  /**
   * 显示提示
   * @param {string} type - 类型 (success|warning|error|info)
   * @param {string} message - 消息
   */
  show(type, message) {
    this.setType(type);
    this.setMessage(message);
    this.element.style.display = 'flex';
  }

  /**
   * 显示成功提示
   * @param {string} message - 消息
   */
  showSuccess(message) {
    this.show('success', message);
  }

  /**
   * 显示警告提示
   * @param {string} message - 消息
   */
  showWarning(message) {
    this.show('warning', message);
  }

  /**
   * 显示错误提示
   * @param {string} message - 消息
   */
  showError(message) {
    this.show('error', message);
  }

  /**
   * 显示信息提示
   * @param {string} message - 消息
   */
  showInfo(message) {
    this.show('info', message);
  }

  /**
   * 隐藏提示
   */
  hide() {
    this.element.style.display = 'none';
  }

  /**
   * 设置类型
   * @param {string} type - 类型
   */
  setType(type) {
    this.element.className = `alert alert--${type}`;
    
    // 设置图标
    const icons = {
      success: '✓',
      warning: '⚠',
      error: '✕',
      info: 'ℹ'
    };
    
    if (this.iconElement) {
      this.iconElement.textContent = icons[type] || '';
    }
  }

  /**
   * 设置消息
   * @param {string} message - 消息
   */
  setMessage(message) {
    if (this.messageElement) {
      this.messageElement.textContent = message;
    }
  }

  /**
   * 销毁提示框
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}