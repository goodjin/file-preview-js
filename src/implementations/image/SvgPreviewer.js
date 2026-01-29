/**
 * SVG格式预览器
 * @description 负责SVG格式图片的预览、缩放、旋转等操作（矢量图，支持无损缩放）
 */

import {
  EVENT_TYPES,
  DEFAULT_OPTIONS
} from './ImageConstants.js';
import {
  calculateFitScale,
  debounce
} from './ImageUtils.js';

/**
 * SVG预览器类
 * @class SvgPreviewer
 */
class SvgPreviewer {
  /**
   * 构造函数
   * @param {string} svgContent - SVG文本内容
   * @param {Object} [config={}] - 配置选项
   */
  constructor(svgContent, config = {}) {
    this.svgContent = svgContent;
    this.config = { ...DEFAULT_OPTIONS, ...config };

    // 状态
    this.scale = this.config.scale;
    this.rotation = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.lastOffsetX = 0;
    this.lastOffsetY = 0;

    // SVG原始尺寸
    this.originalWidth = 0;
    this.originalHeight = 0;

    // 容器
    this.container = null;
    this.wrapper = null;
    this.svgContainer = null;

    // 事件监听器
    this.eventListeners = new Map();

    // 绑定方法
    this._handleMouseDown = this._handleMouseDown.bind(this);
    this._handleMouseMove = this._handleMouseMove.bind(this);
    this._handleMouseUp = this._handleMouseUp.bind(this);
    this._handleWheel = this._handleWheel.bind(this);
    this._handleTouchStart = this._handleTouchStart.bind(this);
    this._handleTouchMove = this._handleTouchMove.bind(this);
    this._handleTouchEnd = this._handleTouchEnd.bind(this);
    this._handleDoubleClick = this._handleDoubleClick.bind(this);
  }

  /**
   * 解析SVG内容并获取尺寸
   * @private
   * @returns {Object} 解析结果
   */
  _parseSvg() {
    try {
      // 创建DOM解析器
      const parser = new DOMParser();
      const doc = parser.parseFromString(this.svgContent, 'image/svg+xml');

      // 检查是否有解析错误
      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        throw new Error('Invalid SVG content');
      }

      // 获取SVG元素
      const svgElement = doc.querySelector('svg');
      if (!svgElement) {
        throw new Error('No SVG element found');
      }

      // 获取或计算尺寸
      let width = this._parseDimension(svgElement.getAttribute('width'));
      let height = this._parseDimension(svgElement.getAttribute('height'));
      const viewBox = svgElement.getAttribute('viewBox');

      // 如果没有明确的width/height，从viewBox获取
      if ((!width || !height) && viewBox) {
        const vb = viewBox.split(/\s+|,/).map(parseFloat);
        if (vb.length === 4) {
          width = width || vb[2];
          height = height || vb[3];
        }
      }

      // 如果还是没有尺寸，设置默认值
      width = width || 300;
      height = height || 150;

      this.originalWidth = width;
      this.originalHeight = height;

      return {
        svgElement: svgElement,
        width,
        height,
        isValid: true
      };
    } catch (error) {
      console.error('SVG parsing error:', error);
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * 解析尺寸值（处理单位）
   * @private
   * @param {string} value - 尺寸值
   * @returns {number|null} 像素值
   */
  _parseDimension(value) {
    if (!value) return null;
    
    // 移除单位，转换为数字
    const match = value.match(/^([\d.]+)(px|pt|pc|mm|cm|in|%)?$/);
    if (!match) return null;

    const num = parseFloat(match[1]);
    const unit = match[2];

    if (!unit || unit === 'px') return num;

    // 单位转换（假设96dpi）
    const conversions = {
      'pt': 96 / 72,
      'pc': 96 * 12 / 72,
      'mm': 96 / 25.4,
      'cm': 96 / 2.54,
      'in': 96,
      '%': 1 // 百分比需要参考尺寸，暂时按1处理
    };

    return num * (conversions[unit] || 1);
  }

  /**
   * 渲染SVG到容器
   * @param {HTMLElement} container - 容器元素
   * @returns {Promise<void>}
   */
  async render(container) {
    this.container = container;

    // 解析SVG
    const parseResult = this._parseSvg();
    
    if (!parseResult.isValid) {
      this._emit(EVENT_TYPES.LOAD_ERROR, {
        error: parseResult.error
      });
      throw new Error(`Failed to parse SVG: ${parseResult.error}`);
    }

    // 清空容器
    container.innerHTML = '';

    // 创建包装器
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'svg-preview-wrapper';
    this.wrapper.style.cssText = `
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #f5f5f5;
    `;

    // 创建SVG容器
    this.svgContainer = document.createElement('div');
    this.svgContainer.className = 'svg-container';
    this.svgContainer.style.cssText = `
      display: inline-block;
      user-select: none;
      cursor: grab;
      transition: transform ${this.config.scaleDuration}ms ${this.config.scaleEasing};
    `;

    // 克隆SVG元素并设置属性
    const svgClone = parseResult.svgElement.cloneNode(true);
    svgClone.setAttribute('width', `${this.originalWidth}px`);
    svgClone.setAttribute('height', `${this.originalHeight}px`);
    svgClone.style.display = 'block';

    this.svgContainer.appendChild(svgClone);
    this.wrapper.appendChild(this.svgContainer);
    container.appendChild(this.wrapper);

    // 计算初始缩放比例
    const fitScale = calculateFitScale(
      this.originalWidth,
      this.originalHeight,
      container.clientWidth,
      container.clientHeight,
      { padding: 20 }
    );

    this.scale = Math.min(fitScale, 1.0);

    this._updateTransform();

    // 绑定事件
    this._bindEvents();

    // 发送加载完成事件
    this._emit(EVENT_TYPES.LOAD_COMPLETE, {
      dimensions: {
        width: this.originalWidth,
        height: this.originalHeight
      },
      scale: this.scale
    });
  }

  /**
   * 绑定交互事件
   * @private
   */
  _bindEvents() {
    if (this.config.enableDrag) {
      this.wrapper.addEventListener('mousedown', this._handleMouseDown);
      this.wrapper.addEventListener('mousemove', this._handleMouseMove);
      this.wrapper.addEventListener('mouseup', this._handleMouseUp);
      this.wrapper.addEventListener('mouseleave', this._handleMouseUp);
    }

    if (this.config.enableZoom) {
      this.wrapper.addEventListener('wheel', this._handleWheel, { passive: false });
    }

    if (this.config.enableTouch) {
      this.wrapper.addEventListener('touchstart', this._handleTouchStart, { passive: false });
      this.wrapper.addEventListener('touchmove', this._handleTouchMove, { passive: false });
      this.wrapper.addEventListener('touchend', this._handleTouchEnd);
      this.wrapper.addEventListener('touchcancel', this._handleTouchEnd);
    }

    this.wrapper.addEventListener('dblclick', this._handleDoubleClick);
  }

  /**
   * 解绑交互事件
   * @private
   */
  _unbindEvents() {
    if (this.wrapper) {
      this.wrapper.removeEventListener('mousedown', this._handleMouseDown);
      this.wrapper.removeEventListener('mousemove', this._handleMouseMove);
      this.wrapper.removeEventListener('mouseup', this._handleMouseUp);
      this.wrapper.removeEventListener('mouseleave', this._handleMouseUp);
      this.wrapper.removeEventListener('wheel', this._handleWheel);
      this.wrapper.removeEventListener('touchstart', this._handleTouchStart);
      this.wrapper.removeEventListener('touchmove', this._handleTouchMove);
      this.wrapper.removeEventListener('touchend', this._handleTouchEnd);
      this.wrapper.removeEventListener('touchcancel', this._handleTouchEnd);
      this.wrapper.removeEventListener('dblclick', this._handleDoubleClick);
    }
  }

  /**
   * 处理鼠标按下
   * @private
   * @param {MouseEvent} event
   */
  _handleMouseDown(event) {
    if (event.button !== 0) return; // 只响应左键

    this.isDragging = true;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.lastOffsetX = this.offsetX;
    this.lastOffsetY = this.offsetY;

    this.svgContainer.style.cursor = 'grabbing';
    event.preventDefault();
  }

  /**
   * 处理鼠标移动
   * @private
   * @param {MouseEvent} event
   */
  _handleMouseMove(event) {
    if (!this.isDragging) return;

    const deltaX = event.clientX - this.dragStartX;
    const deltaY = event.clientY - this.dragStartY;

    this.offsetX = this.lastOffsetX + deltaX;
    this.offsetY = this.lastOffsetY + deltaY;

    this._updateTransform();
  }

  /**
   * 处理鼠标释放
   * @private
   */
  _handleMouseUp() {
    this.isDragging = false;
    this.svgContainer.style.cursor = 'grab';
  }

  /**
   * 处理滚轮缩放
   * @private
   * @param {WheelEvent} event
   */
  _handleWheel(event) {
    event.preventDefault();

    const delta = -event.deltaY * 0.001;
    const newScale = this.scale * (1 + delta);

    this._scaleAtPoint(newScale, event.clientX, event.clientY);
  }

  /**
   * 处理触摸开始
   * @private
   * @param {TouchEvent} event
   */
  _handleTouchStart(event) {
    event.preventDefault();

    if (event.touches.length === 1) {
      // 单指拖拽
      this.isDragging = true;
      this.dragStartX = event.touches[0].clientX;
      this.dragStartY = event.touches[0].clientY;
      this.lastOffsetX = this.offsetX;
      this.lastOffsetY = this.offsetY;
    } else if (event.touches.length === 2) {
      // 双指缩放
      this.isDragging = false;
      this._pinchStartDistance = this._getTouchDistance(event.touches);
      this._pinchStartScale = this.scale;
    }
  }

  /**
   * 处理触摸移动
   * @private
   * @param {TouchEvent} event
   */
  _handleTouchMove(event) {
    event.preventDefault();

    if (event.touches.length === 1 && this.isDragging) {
      // 单指拖拽
      const deltaX = event.touches[0].clientX - this.dragStartX;
      const deltaY = event.touches[0].clientY - this.dragStartY;

      this.offsetX = this.lastOffsetX + deltaX;
      this.offsetY = this.lastOffsetY + deltaY;

      this._updateTransform();
    } else if (event.touches.length === 2) {
      // 双指缩放
      const currentDistance = this._getTouchDistance(event.touches);
      const scaleRatio = currentDistance / this._pinchStartDistance;
      const newScale = this._pinchStartScale * scaleRatio;

      this._scaleAtPoint(
        newScale,
        (event.touches[0].clientX + event.touches[1].clientX) / 2,
        (event.touches[0].clientY + event.touches[1].clientY) / 2
      );
    }
  }

  /**
   * 处理触摸结束
   * @private
   */
  _handleTouchEnd() {
    this.isDragging = false;
  }

  /**
   * 处理双击
   * @private
   */
  _handleDoubleClick() {
    this.reset();
  }

  /**
   * 计算触摸点之间的距离
   * @private
   * @param {TouchList} touches
   * @returns {number}
   */
  _getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 在指定点进行缩放
   * @private
   * @param {number} newScale - 新缩放比例
   * @param {number} clientX - 客户端X坐标
   * @param {number} clientY - 客户端Y坐标
   */
  _scaleAtPoint(newScale, clientX, clientY) {
    // 限制缩放范围
    newScale = Math.max(this.config.minScale, Math.min(this.config.maxScale, newScale));

    if (newScale === this.scale) return;

    // 计算缩放中心偏移
    const rect = this.wrapper.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;

    const scaleRatio = newScale / this.scale;

    // 调整偏移量以保持点击点位置不变
    this.offsetX = this.offsetX * scaleRatio - deltaX * (scaleRatio - 1);
    this.offsetY = this.offsetY * scaleRatio - deltaY * (scaleRatio - 1);

    this.scale = newScale;

    this._updateTransform();
    this._emit(EVENT_TYPES.SCALE_CHANGE, { scale: this.scale });
  }

  /**
   * 更新变换
   * @private
   */
  _updateTransform() {
    if (!this.svgContainer) return;

    const transform = `
      translate(${this.offsetX}px, ${this.offsetY}px)
      rotate(${this.rotation}deg)
      scale(${this.scale})
    `;

    this.svgContainer.style.transform = transform;
  }

  /**
   * 缩放
   * @param {number} factor - 缩放因子
   */
  scale(factor) {
    const newScale = this.scale * factor;
    this.setScale(newScale);
  }

  /**
   * 设置缩放比例
   * @param {number} scale - 缩放比例
   */
  setScale(scale) {
    scale = Math.max(this.config.minScale, Math.min(this.config.maxScale, scale));
    this.scale = scale;
    this._updateTransform();
    this._emit(EVENT_TYPES.SCALE_CHANGE, { scale: this.scale });
  }

  /**
   * 旋转
   * @param {number} angle - 旋转角度
   */
  rotate(angle) {
    this.rotation += angle;
    this.rotation = this.rotation % 360;
    this._updateTransform();
    this._emit(EVENT_TYPES.ROTATE_CHANGE, { rotation: this.rotation });
  }

  /**
   * 设置旋转角度
   * @param {number} rotation - 旋转角度
   */
  setRotation(rotation) {
    this.rotation = rotation % 360;
    this._updateTransform();
    this._emit(EVENT_TYPES.ROTATE_CHANGE, { rotation: this.rotation });
  }

  /**
   * 重置视图
   */
  reset() {
    const fitScale = calculateFitScale(
      this.originalWidth,
      this.originalHeight,
      this.container.clientWidth,
      this.container.clientHeight,
      { padding: 20 }
    );

    this.scale = Math.min(fitScale, 1.0);
    this.rotation = 0;
    this.offsetX = 0;
    this.offsetY = 0;

    this._updateTransform();
    this._emit(EVENT_TYPES.RESET);
  }

  /**
   * 发送事件
   * @private
   * @param {string} type - 事件类型
   * @param {Object} data - 事件数据
   */
  _emit(type, data = {}) {
    const handlers = this.eventListeners.get(type) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in ${type} handler:`, error);
      }
    });
  }

  /**
   * 注册事件监听器
   * @param {string} type - 事件类型
   * @param {Function} handler - 事件处理函数
   * @returns {SvgPreviewer}
   */
  on(type, handler) {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    this.eventListeners.get(type).push(handler);
    return this;
  }

  /**
   * 移除事件监听器
   * @param {string} type - 事件类型
   * @param {Function} handler - 事件处理函数
   * @returns {SvgPreviewer}
   */
  off(type, handler) {
    const handlers = this.eventListeners.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
    return this;
  }

  /**
   * 销毁预览器
   */
  destroy() {
    this._unbindEvents();
    this.eventListeners.clear();

    if (this.wrapper && this.wrapper.parentNode) {
      this.wrapper.parentNode.removeChild(this.wrapper);
    }

    this.wrapper = null;
    this.svgContainer = null;
    this.container = null;
  }
}

export default SvgPreviewer;
