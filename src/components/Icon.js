/**
 * 图标组件
 * 
 * @description SVG图标组件
 * @module Icon
 * @version 1.0.0
 */

/**
 * 图标名称到SVG路径的映射
 * @type {Object}
 */
const ICONS = {
  // 缩放控制
  'zoom-in': '<path d="M11 11V5h6M5 5H11M8 2V5M8 5L12 9M12 9L9 12M9 12L12 15M12 15L8 18M8 18V5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  'zoom-out': '<path d="M5 8H11M11 8V5M8 5L5 8M5 8L8 11M8 11L11 14M11 14V8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  'zoom-reset': '<path d="M8 2V14M2 8H14M12 12L14 14L14 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  
  // 页面导航
  'chevron-left': '<path d="M10 18L4 12L10 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'chevron-right': '<path d="M4 6L10 12L4 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  
  // 全屏
  'fullscreen': '<path d="M4 8V4M4 4H8M20 4H16M20 4V8M20 20V16M20 20H16M4 20H8M4 20V16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  'fullscreen-exit': '<path d="M8 8V4M8 4H12M16 4H12M16 4V8M16 16V20M16 20H12M8 20H12M8 20V16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  
  // 下载
  'download': '<path d="M12 16V4M12 4L8 8M12 4L16 8M4 18H20M20 18V16H18V16H4V18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  
  // 关闭
  'close': '<path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  
  // 加载中
  'loading': '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="4" stroke-linecap="round"/>',
  
  // 文件类型
  'file-word': '<path d="M14 2H6C5.44772 2 5 2.44772 5 3V21C5 21.5523 5.44772 22 6 22H18C18.5523 22 19 21.5523 19 21V7L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 2V7H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><text x="8" y="18" font-size="8" fill="currentColor">W</text>',
  'file-excel': '<path d="M14 2H6C5.44772 2 5 2.44772 5 3V21C5 21.5523 5.44772 22 6 22H18C18.5523 22 19 21.5523 19 21V7L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 2V7H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><text x="8" y="18" font-size="8" fill="currentColor">X</text>',
  'file-powerpoint': '<path d="M14 2H6C5.44772 2 5 2.44772 5 3V21C5 21.5523 5.44772 22 6 22H18C18.5523 22 19 21.5523 19 21V7L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 2V7H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><text x="8" y="18" font-size="6" fill="currentColor">PPT</text>',
  'file-pdf': '<path d="M14 2H6C5.44772 2 5 2.44772 5 3V21C5 21.5523 5.44772 22 6 22H18C18.5523 22 19 21.5523 19 21V7L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 2V7H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><text x="8" y="18" font-size="8" fill="currentColor">PDF</text>',
  'file-image': '<path d="M14 2H6C5.44772 2 5 2.44772 5 3V21C5 21.5523 5.44772 22 6 22H18C18.5523 22 19 21.5523 19 21V7L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 2V7H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="13" r="3" stroke="currentColor" stroke-width="2"/>',
  'file-default': '<path d="M14 2H6C5.44772 2 5 2.44772 5 3V21C5 21.5523 5.44772 22 6 22H18C18.5523 22 19 21.5523 19 21V7L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 2V7H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
};

/**
 * 图标类
 * @class Icon
 */
export class Icon {
  /**
   * 创建图标实例
   * @param {Object} options - 图标选项
   * @param {string} options.name - 图标名称
   * @param {number} options.size - 图标大小（像素）
   * @param {string} options.color - 图标颜色
   */
  constructor(options = {}) {
    this.name = options.name || 'file-default';
    this.size = options.size || 24;
    this.color = options.color || 'currentColor';
    
    this.element = this.render();
  }

  /**
   * 渲染图标
   * @returns {HTMLElement} 图标元素
   */
  render() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', this.size);
    svg.setAttribute('height', this.size);
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', this.color);
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.className = 'icon';
    
    // 获取图标路径
    const pathData = ICONS[this.name] || ICONS['file-default'];
    svg.innerHTML = pathData;
    
    this.element = svg;
    return svg;
  }

  /**
   * 设置图标颜色
   * @param {string} color - 颜色
   */
  setColor(color) {
    this.color = color;
    this.element.setAttribute('stroke', color);
  }

  /**
   * 设置图标大小
   * @param {number} size - 大小（像素）
   */
  setSize(size) {
    this.size = size;
    this.element.setAttribute('width', size);
    this.element.setAttribute('height', size);
  }
}