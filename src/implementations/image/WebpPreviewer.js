/**
 * WebP格式预览器
 * @description 负责WebP格式图片的预览、缩放、旋转等操作，支持静态和动画WebP
 */

import {
  EVENT_TYPES,
  DEFAULT_OPTIONS
} from './ImageConstants.js';
import {
  calculateFitScale,
  getImageDimensions
} from './ImageUtils.js';

/**
 * WebP支持检测
 * @private
 * @returns {boolean} 是否支持WebP
 */
function _checkWebPSupport() {
  try {
    const canvas = document.createElement('canvas');
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  } catch (e) {
    return false;
  }
}

/**
 * 动画WebP支持检测
 * @private
 * @returns {Promise<boolean>} 是否支持动画WebP
 */
async function _checkAnimatedWebPSupport() {
  try {
    // 创建一个测试用的动画WebP数据
    const animatedWebPData = atob(
      'RkGODlIAQA8AQMAAAA///wAAACwAAAAAIAA8AAAC74SPqcvtD6OctNqLs968+w+G4kiW5omm6sq27gvH8kzX9o3n+s73/g8MCofEovGITCqXzKbzCY1Kp9Sq9YrNarfcrvcLDovH5LL5fE/n67/v2w/8DAwP8A/wD///8='
    );
    
    const img = new Image();
    img.src = 'data:image/webp;base64,' + animatedWebPData;
    
    await new Promise((resolve, reject) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      setTimeout(() => resolve(false), 1000);
    });
    
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * WebP预览器类
 * @class WebpPreviewer
 * @description 支持静态和动画WebP，自动检测浏览器支持情况
 */
class WebpPreviewer {
  /**
   * 构造函数
   * @param {HTMLImageElement} img - 图片元素
   * @param {Object} [config={}] - 配置选项
   */
  constructor(img, config = {}) {
    this.img = img;
    this.config = { ...DEFAULT_OPTIONS, ...config };

    // 浏览器支持状态
    this.supportsWebP = _checkWebPSupport();
    this.supportsAnimatedWebP = false;
    this.isAnimated = false;

    // 状态
    this.scale = this.config.scale;
    this.rotation = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.isPlaying = true;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.lastOffsetX = 0;
    this.lastOffsetY = 0;

    // 容器
    this.container = null;
    this.wrapper = null;
    this.imageElement = null;
    this.playOverlay = null;

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

    // 检查浏览器支持
    if (!this.supportsWebP) {
      this._showError('您的浏览器不支持WebP格式，请升级浏览器或使用其他格式。');
      this._emit(EVENT_TYPES.LOAD_ERROR, {
        error: '浏览器不支持WebP格式'
      });
      return;
    }

    // 检测是否为动画WebP
    await this._detectAnimatedWebP();

    // 清空容器
    container.innerHTML = '';

    // 创建包装器
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'image-preview-wrapper webp-preview';
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

    // 如果是动画WebP，创建播放控制覆盖层
    if (this.isAnimated) {
      this.playOverlay = document.createElement('div');
      this.playOverlay.className = 'webp-play-overlay';
      this.playOverlay.style.cssText = `
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
      this.playOverlay.innerHTML = '▶';
      this.playOverlay.title = '点击播放/暂停动画';

      this.playOverlay.addEventListener('click', (e) => {
        e.stopPropagation();
        this._togglePlay();
      });
    }

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
    if (this.playOverlay) {
      this.wrapper.appendChild(this.playOverlay);
    }
    container.appendChild(this.wrapper);

    // 绑定事件
    this._bindEvents();

    // 如果是动画WebP，自动播放
    if (this.isAnimated) {
      this._startAnimation();
    }

    // 发送加载完成事件
    this._emit(EVENT_TYPES.LOAD_COMPLETE, {
      dimensions,
      scale: this.scale,
      isAnimated: this.isAnimated,
      supportsAnimatedWebP: this.supportsAnimatedWebP
    });
  }

  /**
   * 检测是否为动画WebP
   * @private
   * @returns {Promise<void>}
   */
  async _detectAnimatedWebP() {
    try {
      // 检测是否包含ANIM（动画）或ANMF（帧）标记
      const response = await fetch(this.img.src);
      const buffer = await response.arrayBuffer();
      const view = new Uint8Array(buffer, 0, Math.min(100, buffer.byteLength));
      
      // WebP文件头：RIFF + SIZE + WEBP
      const riffHeader = String.fromCharCode(...view.slice(0, 4));
      const webpHeader = String.fromCharCode(...view.slice(8, 12));
      
      if (riffHeader !== 'RIFF' || webpHeader !== 'WEBP') {
        this.isAnimated = false;
        this.supportsAnimatedWebP = false;
        return;
      }

      // 查找ANIM或ANMF标记
      for (let i = 12; i < view.length - 3; i++) {
        const chunk = String.fromCharCode(...view.slice(i, i + 4));
        if (chunk === 'ANIM' || chunk === 'ANMF') {
          this.isAnimated = true;
          this.supportsAnimatedWebP = await _checkAnimatedWebPSupport();
          return;
        }
      }

      this.isAnimated = false;
      this.supportsAnimatedWebP = false;
    } catch (e) {
      // 检测失败，假设为静态WebP
      this.isAnimated = false;
      this.supportsAnimatedWebP = false;
    }
  }

  /**
   * 显示错误信息
   * @private
   * @param {string} message - 错误信息
   */
  _showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'webp-error-message';
    errorDiv.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      color: #666;
      font-size: 14px;
      padding: 20px;
      background-color: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    `;
    errorDiv.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
      <div>${message}</div>
    `;
    this.container.appendChild(errorDiv);
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

    // 右键可以暂停/播放动画WebP
    if (this.isAnimated) {
      this.wrapper.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this._togglePlay();
      });
    }
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
    if (event.button !== 0) return;

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
      this.isDragging = true;
      this.dragStartX = event.touches[0].clientX;
      this.dragStartY = event.touches[0].clientY;
      this.lastOffsetX = this.offsetX;
      this.lastOffsetY = this.offsetY;
    } else if (event.touches.length === 2) {
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
      const deltaX = event.touches[0].clientX - this.dragStartX;
      const deltaY = event.touches[0].clientY - this.dragStartY;

      this.offsetX = this.lastOffsetX + deltaX;
      this.offsetY = this.lastOffsetY + deltaY;

      this._updateTransform();
    } else if (event.touches.length === 2) {
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
    if (this.isAnimated) {
      this._togglePlay();
    } else {
      this.reset();
    }
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
    newScale = Math.max(this.config.minScale, Math.min(this.config.maxScale, newScale));

    if (newScale === this.scale) return;

    const rect = this.wrapper.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;

    const scaleRatio = newScale / this.scale;

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
   * 开始动画
   * @private
   */
  _startAnimation() {
    if (!this.isAnimated || this.isPlaying) return;

    this.isPlaying = true;
    this.imageElement.style.animationPlayState = 'running';

    if (this.playOverlay) {
      this.playOverlay.style.display = 'none';
    }

    this._emit(EVENT_TYPES.PLAY);
  }

  /**
   * 暂停动画
   * @private
   */
  _pauseAnimation() {
    if (!this.isAnimated || !this.isPlaying) return;

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
   * 播放动画（仅动画WebP）
   */
  play() {
    if (!this.isAnimated) return;

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
   * 暂停动画（仅动画WebP）
   */
  pause() {
    if (!this.isAnimated) return;

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

    if (this.isAnimated) {
      this.play();
    }
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
   * @returns {WebpPreviewer}
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
   * @returns {WebpPreviewer}
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
    if (this.isAnimated) {
      this.pause();
    }
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

export default WebpPreviewer;
