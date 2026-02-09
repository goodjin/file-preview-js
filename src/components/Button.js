/**
 * 按钮组件
 * 
 * @description 通用的按钮组件，支持多种类型和大小
 * @module Button
 * @version 1.0.0
 */

/**
 * 按钮类
 * @class Button
 */
export class Button {
  /**
   * 创建按钮实例
   * @param {Object} options - 按钮选项
   * @param {string} options.type - 按钮类型 (primary|secondary|text|icon)
   * @param {string} options.size - 按钮大小 (small|medium|large)
   * @param {string} options.text - 按钮文字
   * @param {boolean} options.disabled - 是否禁用
   * @param {boolean} options.loading - 是否加载中
   * @param {Function} options.onClick - 点击回调
   */
  constructor(options = {}) {
    this.type = options.type || 'primary';
    this.size = options.size || 'medium';
    this.text = options.text || '';
    this.disabled = options.disabled || false;
    this.loading = options.loading || false;
    this.onClick = options.onClick || null;
    this.icon = options.icon || null;
    
    this.element = this.render();
    this.bindEvents();
  }

  /**
   * 渲染按钮
   * @returns {HTMLElement} 按钮元素
   */
  render() {
    const button = document.createElement('button');
    button.className = this.getClassName();
    
    // 添加图标
    if (this.icon) {
      const iconSpan = document.createElement('span');
      iconSpan.className = 'btn-icon';
      iconSpan.innerHTML = this.icon;
      button.appendChild(iconSpan);
    }
    
    // 添加文字
    if (this.text) {
      const textSpan = document.createElement('span');
      textSpan.className = 'btn-text';
      textSpan.textContent = this.text;
      button.appendChild(textSpan);
    }
    
    // 禁用状态
    if (this.disabled || this.loading) {
      button.disabled = true;
    }
    
    this.element = button;
    return button;
  }

  /**
   * 获取CSS类名
   * @returns {string} CSS类名
   */
  getClassName() {
    const classes = ['btn'];
    
    // 类型
    classes.push(`btn--${this.type}`);
    
    // 大小
    classes.push(`btn--${this.size}`);
    
    // 状态
    if (this.disabled) {
      classes.push('btn--disabled');
    }
    
    if (this.loading) {
      classes.push('btn--loading');
    }
    
    return classes.join(' ');
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    if (this.onClick) {
      this.element.addEventListener('click', (e) => {
        if (!this.disabled && !this.loading) {
          this.onClick(e);
        }
      });
    }
  }

  /**
   * 设置文字
   * @param {string} text - 按钮文字
   */
  setText(text) {
    this.text = text;
    const textSpan = this.element.querySelector('.btn-text');
    if (textSpan) {
      textSpan.textContent = text;
    }
  }

  /**
   * 设置禁用状态
   * @param {boolean} disabled - 是否禁用
   */
  setDisabled(disabled) {
    this.disabled = disabled;
    this.element.disabled = disabled;
    this.element.classList.toggle('btn--disabled', disabled);
  }

  /**
   * 设置加载状态
   * @param {boolean} loading - 是否加载中
   */
  setLoading(loading) {
    this.loading = loading;
    this.element.disabled = loading;
    this.element.classList.toggle('btn--loading', loading);
  }

  /**
   * 销毁按钮
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}