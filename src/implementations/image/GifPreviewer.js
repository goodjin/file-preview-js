/**
 * GIF格式预览器
 * @description 负责GIF格式图片的预览、缩放、旋转和动画播放控制
 */

import {
  EVENT_TYPES,
  DEFAULT_OPTIONS,
  GIF_PLAY_INTERVAL
} from './ImageConstants.js';
import {
  calculateFitScale,
  getImageDimensions
} from './ImageUtils.js';

/**
 * GIF预览器类
 * @class GifPreviewer
 * @description 支持GIF动画播放/暂停控制
 */
class GifPreviewer {
  /**
   * 构造函数
   * @param {HTMLImageElement} img - 图片元素
   * @param {Object} [config={}] - 配置选项
   */
  constructor(img, config = {}) {
    this.img = img;
    this.config = { ...DEFAULT_OPTIONS, ...config };

    // 状态
    this.scale = this.config.scale;
    this.rotation = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.isPlaying = true;
    this.playInterval = null;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.lastOffsetX = 0;
    this.lastOffsetY = 0;

    // 容器
    this.container = null;
    this.wrapper = null;
    this.imageElement = null;

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
   * 渲染图片到容器
   * @param {HTMLElement} container - 容器元素
   * @returns {Promise<void>}
   */
  async render(container) {
    this.container = container;

    // 清空容器
    container.innerHTML = '';

    // 创建包装器
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'image-preview-wrapper gif-preview';
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

    // 创建图片元素
    this.imageElement = document.createElement('img');
    this.imageElement.src = this.img.src;
    this.imageElement.style.cssText = `
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      user-select: none;
      cursor: grab;
      transition: transform ${this.config.scaleDuration}ms ${this.config.scaleEasing};
      display: block;
    `;

    // 创建播放控制覆盖层（双击可以播放/暂停）
    const playOverlay = document.createElement('div');
    playOverlay.className = 'gif-play-overlay';
    playOverlay.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 60px;
      height: 60px;
      background-color: rgba(0, 0, 0, 0.6);
      border-radius: 50%;
      display: none;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      cursor: pointer;
      z-index: 10;
    `;
    playOverlay.innerHTML = '▶';
    playOverlay.title = '点击播放/暂停动画';

    this.playOverlay = playOverlay;
    playOverlay.addEventListener('click', (e) => {
      e.stopPropagation();
      this._togglePlay();
    });

    // 计算初始缩放比例
    const dimensions = getImageDimensions(this.img);
    const fitScale = calculateFitScale(
      dimensions.width,
      dimensions.height,
      container.clientWidth,
      container.clientHeight,
      { padding: 20 }
    );

    this.scale = Math.min(fitScale, 1.0);

    this._updateTransform();

    this.wrapper.appendChild(this.imageElement);
    this.wrapper.appendChild(playOverlay);
    container.appendChild(this.wrapper);

    // 绑定事件
    this._bindEvents();

    // GIF自动播放
    this._startAnimation();

    // 发送加载完成事件
    this._emit(EVENT_TYPES.LOAD_COMPLETE, {
      dimensions,
      scale: this.scale,
      isAnimated: true
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

    // GIF右键可以暂停/播放
    this.wrapper.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this._togglePlay();
    });
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

    this.imageElement.style.cursor = 'grabbing';
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
    this.imageElement.style.cursor = 'grab';
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
    // GIF双击切换播放/暂停
    this._togglePlay();
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
    if (!this.imageElement) return;

    const transform = `
      translate(${this.offsetX}px, ${this.offsetY}px)
      rotate(${this.rotation}deg)
      scale(${this.scale})
    `;

    this.imageElement.style.transform = transform;
  }

  /**
   * 开始GIF动画
   * @private
   */
  _startAnimation() {
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.imageElement.style.animationPlayState = 'running';

    if (this.playOverlay) {
      this.playOverlay.style.display = 'none';
    }

    this._emit(EVENT_TYPES.PLAY);
  }

  /**
   * 暂停GIF动画
   * @private
   */
  _pauseAnimation() {
    if (!this.isPlaying) return;

    this.isPlaying = false;
    this.imageElement.style.animationPlayState = 'paused';

    if (this.playOverlay) {
      this.playOverlay.style.display = 'flex';
      this.playOverlay.innerHTML = '▶';
    }

    this._emit(EVENT_TYPES.PAUSE);
  }

  /**
   * 切换播放/暂停
   * @private
   */
  _togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * 播放GIF动画
   */
  play() {
    if (this.imageElement) {
      this.imageElement.style.animationPlayState = 'running';
    }
    this.isPlaying = true;

    if (this.playOverlay) {
      this.playOverlay.style.display = 'none';
    }

    this._emit(EVENT_TYPES.PLAY);
  }

  /**
   * 暂停GIF动画
   */
  pause() {
    if (this.imageElement) {
      this.imageElement.style.animationPlayState = 'paused';
    }
    this.isPlaying = false;

    if (this.playOverlay) {
      this.playOverlay.style.display = 'flex';
      this.playOverlay.innerHTML = '▶';
    }

    this._emit(EVENT_TYPES.PAUSE);
  }

  /**
   * 获取播放状态
   * @returns {boolean}
   */
  getPlaying() {
    return this.isPlaying;
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
    const dimensions = getImageDimensions(this.img);
    const fitScale = calculateFitScale(
      dimensions.width,
      dimensions.height,
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

    // 重置时恢复播放
    this.play();
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
   * @returns {GifPreviewer}
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
   * @returns {GifPreviewer}
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
    this.pause();
    this._unbindEvents();
    this.eventListeners.clear();

    if (this.wrapper && this.wrapper.parentNode) {
      this.wrapper.parentNode.removeChild(this.wrapper);
    }

    this.wrapper = null;
    this.imageElement = null;
    this.playOverlay = null;
    this.container = null;
  }
}

export default GifPreviewer;
