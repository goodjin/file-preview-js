/**
 * 工具栏组件
 * 显示缩放控制、页面导航、下载、全屏等功能按钮
 * 
 * @description 底部工具栏，支持多种功能按钮
 * @module Toolbar
 * @version 1.0.0
 */

import { Button } from './Button.js';
import { Icon } from './Icon.js';

/**
 * 工具栏类
 * @class Toolbar
 */
export class Toolbar {
  /**
   * 创建工具栏实例
   * @param {Object} options - 工具栏选项
   * @param {boolean} options.showZoom - 是否显示缩放控制
   * @param {boolean} options.showPageNav - 是否显示页面导航
   * @param {boolean} options.showFullscreen - 是否显示全屏按钮
   * @param {boolean} options.showDownload - 是否显示下载按钮
   */
  constructor(options = {}) {
    this.options = {
      showZoom: options.showZoom !== false,
      showPageNav: options.showPageNav || false,
      showFullscreen: options.showFullscreen !== false,
      showDownload: options.showDownload !== false,
      ...options
    };
    
    this.zoom = options.zoom || 1;
    this.currentPage = options.currentPage || 1;
    this.totalPages = options.totalPages || 1;
    this.isFullscreen = false;
    
    this.callbacks = {};
    this.buttons = {};
    
    this.element = this.render();
  }

  /**
   * 渲染工具栏
   * @returns {HTMLElement} 工具栏元素
   */
  render() {
    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar';
    
    // 左侧：缩放控制
    const leftGroup = document.createElement('div');
    leftGroup.className = 'toolbar__group';
    
    if (this.options.showZoom) {
      this.buttons.zoomOut = new Button({
        type: 'icon',
        icon: this.renderIcon('zoom-out'),
        onClick: () => this.triggerCallback('zoom:out')
      });
      leftGroup.appendChild(this.buttons.zoomOut.element);
      
      const zoomDisplay = document.createElement('span');
      zoomDisplay.className = 'toolbar__zoom-display';
      zoomDisplay.textContent = `${Math.round(this.zoom * 100)}%`;
      this.zoomDisplay = zoomDisplay;
      leftGroup.appendChild(zoomDisplay);
      
      this.buttons.zoomIn = new Button({
        type: 'icon',
        icon: this.renderIcon('zoom-in'),
        onClick: () => this.triggerCallback('zoom:in')
      });
      leftGroup.appendChild(this.buttons.zoomIn.element);
    }
    
    toolbar.appendChild(leftGroup);
    
    // 中间：页面导航
    if (this.options.showPageNav) {
      const centerGroup = document.createElement('div');
      centerGroup.className = 'toolbar__group';
      
      this.buttons.prevPage = new Button({
        type: 'icon',
        icon: this.renderIcon('chevron-left'),
        disabled: this.currentPage <= 1,
        onClick: () => this.triggerCallback('page:prev')
      });
      centerGroup.appendChild(this.buttons.prevPage.element);
      
      const pageDisplay = document.createElement('span');
      pageDisplay.className = 'toolbar__page-display';
      pageDisplay.innerHTML = `<span class="toolbar__page-display__current">${this.currentPage}</span> / ${this.totalPages}`;
      this.pageDisplay = pageDisplay;
      centerGroup.appendChild(pageDisplay);
      
      this.buttons.nextPage = new Button({
        type: 'icon',
        icon: this.renderIcon('chevron-right'),
        disabled: this.currentPage >= this.totalPages,
        onClick: () => this.triggerCallback('page:next')
      });
      centerGroup.appendChild(this.buttons.nextPage.element);
      
      toolbar.appendChild(centerGroup);
    }
    
    // 右侧：功能按钮
    const rightGroup = document.createElement('div');
    rightGroup.className = 'toolbar__group';
    
    if (this.options.showDownload) {
      this.buttons.download = new Button({
        type: 'icon',
        icon: this.renderIcon('download'),
        onClick: () => this.triggerCallback('download')
      });
      rightGroup.appendChild(this.buttons.download.element);
    }
    
    if (this.options.showFullscreen) {
      this.buttons.fullscreen = new Button({
        type: 'icon',
        icon: this.renderIcon('fullscreen'),
        onClick: () => this.toggleFullscreen()
      });
      rightGroup.appendChild(this.buttons.fullscreen.element);
    }
    
    toolbar.appendChild(rightGroup);
    
    this.element = toolbar;
    return toolbar;
  }

  /**
   * 渲染图标
   * @param {string} name - 图标名称
   * @returns {string} 图标HTML
   */
  renderIcon(name) {
    const icon = new Icon({ name, size: 20 });
    return icon.element.outerHTML;
  }

  /**
   * 设置总页数
   * @param {number} totalPages - 总页数
   */
  setTotalPages(totalPages) {
    this.totalPages = totalPages;
    this.updatePageDisplay();
  }

  /**
   * 设置当前页码
   * @param {number} currentPage - 当前页码
   */
  setCurrentPage(currentPage) {
    this.currentPage = currentPage;
    this.updatePageDisplay();
    
    // 更新按钮状态
    if (this.buttons.prevPage) {
      this.buttons.prevPage.setDisabled(currentPage <= 1);
    }
    if (this.buttons.nextPage) {
      this.buttons.nextPage.setDisabled(currentPage >= this.totalPages);
    }
  }

  /**
   * 更新页码显示
   */
  updatePageDisplay() {
    if (this.pageDisplay) {
      this.pageDisplay.innerHTML = `<span class="toolbar__page-display__current">${this.currentPage}</span> / ${this.totalPages}`;
    }
  }

  /**
   * 设置缩放比例
   * @param {number} zoom - 缩放比例
   */
  setZoom(zoom) {
    this.zoom = zoom;
    if (this.zoomDisplay) {
      this.zoomDisplay.textContent = `${Math.round(zoom * 100)}%`;
    }
  }

  /**
   * 显示页面导航
   */
  showPageNavigation() {
    this.options.showPageNav = true;
    // 重新渲染工具栏
  }

  /**
   * 隐藏页面导航
   */
  hidePageNavigation() {
    this.options.showPageNav = false;
    // 重新渲染工具栏
  }

  /**
   * 切换全屏
   */
  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
    
    if (this.buttons.fullscreen) {
      this.buttons.fullscreen.icon = this.renderIcon(
        this.isFullscreen ? 'fullscreen-exit' : 'fullscreen'
      );
    }
    
    this.triggerCallback('fullscreen:toggle', this.isFullscreen);
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
   * 销毁工具栏
   */
  destroy() {
    Object.values(this.buttons).forEach(button => {
      if (button && button.destroy) {
        button.destroy();
      }
    });
    this.callbacks = {};
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}