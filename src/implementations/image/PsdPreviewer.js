/**
 * PSD格式预览器
 * @description 负责PSD格式图片的预览（兼容模式，仅支持合成图预览）
 */

import {
  EVENT_TYPES,
  DEFAULT_OPTIONS,
  ERROR_MESSAGES
} from './ImageConstants.js';
import {
  calculateFitScale,
  clamp,
  debounce
} from './ImageUtils.js';

/**
 * PSD文件签名
 * @constant {string}
 */
const PSD_SIGNATURE = '8BPS';

/**
 * PSD资源ID：缩略图（预览图像）
 * @constant {number}
 */
const RESOURCE_THUMBNAIL = 1036;

/**
 * PSD颜色模式
 * @constant {Object}
 */
const COLOR_MODE = {
  BITMAP: 0,
  GRAYSCALE: 1,
  INDEXED: 2,
  RGB: 3,
  CMYK: 4,
  MULTICHANNEL: 7,
  DUOTONE: 8,
  LAB: 9
};

/**
 * PSD压缩方式
 * @constant {Object}
 */
const COMPRESSION = {
  RAW: 0,
  RLE: 1,
  ZIP: 2,
  ZIP_PREDICTION: 3
};

/**
 * PSD预览器类
 * @class PsdPreviewer
 */
class PsdPreviewer {
  /**
   * 构造函数
   * @param {HTMLImageElement} img - 图片元素（从PSD解析出的Canvas）
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
    this.wrapper.className = 'image-preview-wrapper';
    this.wrapper.style.cssText = `
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #f5f5f5;
      background-image: linear-gradient(45deg, #e0e0e0 25%, transparent 25%),
                        linear-gradient(-45deg, #e0e0e0 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, #e0e0e0 75%),
                        linear-gradient(-45deg, transparent 75%, #e0e0e0 75%);
      background-size: 20px 20px;
      background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
    `;

    // 创建图片元素（Canvas转换为img）
    this.imageElement = document.createElement('img');
    if (this.img instanceof HTMLCanvasElement) {
      this.imageElement.src = this.img.toDataURL('image/png');
    } else {
      this.imageElement.src = this.img.src;
    }

    this.imageElement.style.cssText = `
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      user-select: none;
      cursor: grab;
      transition: transform ${this.config.scaleDuration}ms ${this.config.scaleEasing};
    `;

    // 等待图片加载完成以获取尺寸
    await new Promise((resolve, reject) => {
      this.imageElement.onload = resolve;
      this.imageElement.onerror = reject;
    });

    // 计算初始缩放比例
    const dimensions = {
      width: this.imageElement.naturalWidth || this.img.width,
      height: this.imageElement.naturalHeight || this.img.height
    };
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
    container.appendChild(this.wrapper);

    // 绑定事件
    this._bindEvents();

    // 发送加载完成事件
    this._emit(EVENT_TYPES.LOAD_COMPLETE, {
      dimensions,
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
    newScale = clamp(newScale, this.config.minScale, this.config.maxScale);

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
    scale = clamp(scale, this.config.minScale, this.config.maxScale);
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
    const dimensions = {
      width: this.imageElement.naturalWidth || this.img.width,
      height: this.imageElement.naturalHeight || this.img.height
    };
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
   * @returns {PsdPreviewer}
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
   * @returns {PsdPreviewer}
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
    this.imageElement = null;
    this.container = null;
  }

  /**
   * 解析PSD文件并返回Canvas
   * @static
   * @param {ArrayBuffer} arrayBuffer - PSD文件数据
   * @returns {Promise<HTMLCanvasElement>} 渲染的Canvas元素
   */
  static async parsePSD(arrayBuffer) {
    const data = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);

    // 解析文件头部
    const header = PsdPreviewer._parseHeader(data, view);
    if (!header) {
      throw new Error(ERROR_MESSAGES.FILE_CORRUPTED);
    }

    // 尝试读取缩略图资源
    const thumbnailCanvas = PsdPreviewer._tryReadThumbnail(data, view, header);
    if (thumbnailCanvas) {
      return thumbnailCanvas;
    }

    // 如果没有缩略图，读取复合图像
    const compositeImage = PsdPreviewer._readCompositeImage(data, view, header);
    if (compositeImage) {
      return compositeImage;
    }

    throw new Error('Unable to parse PSD image');
  }

  /**
   * 解析PSD文件头部
   * @static
   * @private
   * @param {Uint8Array} data - 数据数组
   * @param {DataView} view - DataView对象
   * @returns {Object|null} 头部信息
   */
  static _parseHeader(data, view) {
    // 检查签名
    const signature = String.fromCharCode(...data.slice(0, 4));
    if (signature !== PSD_SIGNATURE) {
      return null;
    }

    const header = {
      signature,
      version: view.getUint16(4, false),
      channels: view.getUint16(6, false),
      height: view.getUint32(8, false),
      width: view.getUint32(12, false),
      depth: view.getUint16(16, false),
      colorMode: view.getUint16(18, false)
    };

    return header;
  }

  /**
   * 尝试读取缩略图资源
   * @static
   * @private
   * @param {Uint8Array} data - 数据数组
   * @param {DataView} view - DataView对象
   * @param {Object} header - 头部信息
   * @returns {HTMLCanvasElement|null}
   */
  static async _tryReadThumbnail(data, view, header) {
    let offset = 26;

    // 颜色模式数据长度（4字节）
    const colorModeLength = view.getUint32(offset, false);
    offset += 4 + colorModeLength;

    // 图像资源长度（4字节）
    const imageResourcesLength = view.getUint32(offset, false);
    offset += 4;

    const resourcesEnd = offset + imageResourcesLength;

    // 遍历图像资源，查找缩略图（ID 1036）
    while (offset < resourcesEnd - 12) {
      const signature = String.fromCharCode(...data.slice(offset, offset + 4));
      offset += 4;

      if (signature !== '8BIM') {
        break;
      }

      const resourceId = view.getUint16(offset, false);
      offset += 2;

      const nameLength = data[offset];
      offset += 1;

      // 名称（包括填充到偶数）
      offset += nameLength;
      if (offset % 2 !== 0) offset++;

      const resourceLength = view.getUint32(offset, false);
      offset += 4;

      // 找到缩略图资源
      if (resourceId === RESOURCE_THUMBNAIL) {
        // 跳过格式和宽度、高度
        const resourceStart = offset;
        const format = view.getUint32(offset, false);
        offset += 4;

        if (format === 1) { // JPEG格式
          const width = view.getUint32(offset, false);
          offset += 4;
          const height = view.getUint32(offset, false);
          offset += 4;
          const paddedBytes = view.getUint32(offset, false);
          offset += 4;
          const totalBytes = view.getUint32(offset, false);
          offset += 4;
          const compressedSize = view.getUint32(offset, false);
          offset += 4;
          const bitsPerPixel = view.getUint16(offset, false);
          offset += 2;
          const numChannels = view.getUint16(offset, false);
          offset += 2;

          // 读取JPEG数据
          const jpegData = data.slice(offset, offset + compressedSize);

          // 解码JPEG并绘制到Canvas
          return PsdPreviewer._decodeJPEGToCanvas(jpegData, width, height);
        }
      }

      offset += resourceLength;
      if (offset % 2 !== 0) offset++;
    }

    return null;
  }

  /**
   * 解码JPEG数据到Canvas
   * @static
   * @private
   * @param {Uint8Array} jpegData - JPEG数据
   * @param {number} width - 宽度
   * @param {number} height - 高度
   * @returns {Promise<HTMLCanvasElement>}
   */
  static _decodeJPEGToCanvas(jpegData, width, height) {
    return new Promise((resolve, reject) => {
      const blob = new Blob([jpegData], { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        resolve(canvas);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to decode JPEG thumbnail'));
      };

      img.src = url;
    });
  }

  /**
   * 读取复合图像
   * @static
   * @private
   * @param {Uint8Array} data - 数据数组
   * @param {DataView} view - DataView对象
   * @param {Object} header - 头部信息
   * @returns {HTMLCanvasElement|null}
   */
  static _readCompositeImage(data, view, header) {
    let offset = 26;

    const colorModeLength = view.getUint32(offset, false);
    offset += 4 + colorModeLength;

    const imageResourcesLength = view.getUint32(offset, false);
    offset += 4 + imageResourcesLength;

    const layerAndMaskLength = view.getUint32(offset, false);
    offset += 4 + layerAndMaskLength;

    // 压缩方式（2字节）
    const compression = view.getUint16(offset, false);
    offset += 2;

    // 只支持RAW和RLE压缩
    if (compression !== COMPRESSION.RAW && compression !== COMPRESSION.RLE) {
      console.warn('Unsupported compression:', compression);
      return null;
    }

    const { width, height, channels, depth, colorMode } = header;

    // 创建Canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(width, height);

    let channelData = [];

    if (compression === COMPRESSION.RAW) {
      channelData = PsdPreviewer._readRawData(data, offset, width, height, channels, depth);
    } else if (compression === COMPRESSION.RLE) {
      const { data: rleData, nextOffset } = PsdPreviewer._readRLEData(data, view, offset, width, height, channels, depth);
      channelData = rleData;
      offset = nextOffset;
    }

    // 根据颜色模式组合通道数据
    if (colorMode === COLOR_MODE.RGB && channels >= 3) {
      const r = channelData[0] || new Uint8Array(width * height * depth / 8);
      const g = channelData[1] || new Uint8Array(width * height * depth / 8);
      const b = channelData[2] || new Uint8Array(width * height * depth / 8);
      const a = channelData[3] || new Uint8Array(width * height * depth / 8);

      // 如果是16位深度，转换为8位
      if (depth === 16) {
        PsdPreviewer._combineChannels16To8(r, g, b, a, imageData.data, width, height);
      } else {
        PsdPreviewer._combineChannels8(r, g, b, a, imageData.data, width, height);
      }
    } else if (colorMode === COLOR_MODE.GRAYSCALE) {
      const gray = channelData[0] || new Uint8Array(width * height * depth / 8);
      const a = channelData[1] || new Uint8Array(width * height * depth / 8);

      if (depth === 16) {
        PsdPreviewer._combineGrayscale16To8(gray, a, imageData.data, width, height);
      } else {
        PsdPreviewer._combineGrayscale8(gray, a, imageData.data, width, height);
      }
    } else {
      console.warn('Unsupported color mode:', colorMode);
      return null;
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  /**
   * 读取RAW压缩数据
   * @static
   * @private
   * @param {Uint8Array} data - 数据数组
   * @param {number} offset - 偏移量
   * @param {number} width - 宽度
   * @param {number} height - 高度
   * @param {number} channels - 通道数
   * @param {number} depth - 位深
   * @returns {Array<Uint8Array>}
   */
  static _readRawData(data, offset, width, height, channels, depth) {
    const bytesPerChannel = width * height * (depth / 8);
    const channelData = [];

    for (let c = 0; c < channels; c++) {
      const channel = data.slice(offset, offset + bytesPerChannel);
      channelData.push(channel);
      offset += bytesPerChannel;
    }

    return channelData;
  }

  /**
   * 读取RLE压缩数据
   * @static
   * @private
   * @param {Uint8Array} data - 数据数组
   * @param {DataView} view - DataView对象
   * @param {number} offset - 偏移量
   * @param {number} width - 宽度
   * @param {number} height - 高度
   * @param {number} channels - 通道数
   * @param {number} depth - 位深
   * @returns {{data: Array<Uint8Array>, nextOffset: number}}
   */
  static _readRLEData(data, view, offset, width, height, channels, depth) {
    const bytesPerRow = width * (depth / 8);
    const totalBytes = bytesPerRow * height;

    // 读取每行的字节数（2字节 * 高度 * 通道数）
    const rowCounts = channels * height;
    const rowBytesStart = offset;
    const rowBytesEnd = offset + rowCounts * 2;
    offset = rowBytesEnd;

    const channelData = [];

    for (let c = 0; c < channels; c++) {
      const decoded = new Uint8Array(totalBytes);
      let decodedOffset = 0;

      for (let y = 0; y < height; y++) {
        const rowByteCount = view.getUint16(rowBytesStart + (c * height + y) * 2, false);
        const rowEnd = offset + rowByteCount;

        while (offset < rowEnd && decodedOffset < totalBytes) {
          const count = data[offset];

          if (count < 128) {
            const length = count + 1;
            for (let i = 0; i < length && decodedOffset < totalBytes; i++) {
              decoded[decodedOffset++] = data[offset + 1 + i];
            }
            offset += 1 + length;
          } else {
            const length = count - 127;
            const byte = data[offset + 1];
            for (let i = 0; i < length && decodedOffset < totalBytes; i++) {
              decoded[decodedOffset++] = byte;
            }
            offset += 2;
          }
        }
      }

      channelData.push(decoded);
    }

    return { data: channelData, nextOffset: offset };
  }

  /**
   * 组合8位RGB通道
   * @static
   * @private
   * @param {Uint8Array} r - 红色通道
   * @param {Uint8Array} g - 绿色通道
   * @param {Uint8Array} b - 蓝色通道
   * @param {Uint8Array} a - Alpha通道
   * @param {Uint8Array} output - 输出数组
   * @param {number} width - 宽度
   * @param {number} height - 高度
   */
  static _combineChannels8(r, g, b, a, output, width, height) {
    const pixelCount = width * height;

    for (let i = 0; i < pixelCount; i++) {
      const idx = i * 4;
      output[idx] = r[i];
      output[idx + 1] = g[i];
      output[idx + 2] = b[i];
      output[idx + 3] = a[i];
    }
  }

  /**
   * 组合16位RGB通道转换为8位
   * @static
   * @private
   * @param {Uint8Array} r - 红色通道
   * @param {Uint8Array} g - 绿色通道
   * @param {Uint8Array} b - 蓝色通道
   * @param {Uint8Array} a - Alpha通道
   * @param {Uint8Array} output - 输出数组
   * @param {number} width - 宽度
   * @param {number} height - 高度
   */
  static _combineChannels16To8(r, g, b, a, output, width, height) {
    const pixelCount = width * height;

    for (let i = 0; i < pixelCount; i++) {
      const idx = i * 4;
      const rView = new DataView(r.buffer, r.byteOffset);
      const gView = new DataView(g.buffer, g.byteOffset);
      const bView = new DataView(b.buffer, b.byteOffset);
      const aView = new DataView(a.buffer, a.byteOffset);

      output[idx] = (rView.getUint16(i * 2, false) >> 8) & 0xFF;
      output[idx + 1] = (gView.getUint16(i * 2, false) >> 8) & 0xFF;
      output[idx + 2] = (bView.getUint16(i * 2, false) >> 8) & 0xFF;
      output[idx + 3] = (aView.getUint16(i * 2, false) >> 8) & 0xFF;
    }
  }

  /**
   * 组合8位灰度通道
   * @static
   * @private
   * @param {Uint8Array} gray - 灰度通道
   * @param {Uint8Array} a - Alpha通道
   * @param {Uint8Array} output - 输出数组
   * @param {number} width - 宽度
   * @param {number} height - 高度
   */
  static _combineGrayscale8(gray, a, output, width, height) {
    const pixelCount = width * height;

    for (let i = 0; i < pixelCount; i++) {
      const idx = i * 4;
      output[idx] = gray[i];
      output[idx + 1] = gray[i];
      output[idx + 2] = gray[i];
      output[idx + 3] = a[i];
    }
  }

  /**
   * 组合16位灰度通道转换为8位
   * @static
   * @private
   * @param {Uint8Array} gray - 灰度通道
   * @param {Uint8Array} a - Alpha通道
   * @param {Uint8Array} output - 输出数组
   * @param {number} width - 宽度
   * @param {number} height - 高度
   */
  static _combineGrayscale16To8(gray, a, output, width, height) {
    const pixelCount = width * height;

    for (let i = 0; i < pixelCount; i++) {
      const idx = i * 4;
      const grayView = new DataView(gray.buffer, gray.byteOffset);
      const aValue = (new DataView(a.buffer, a.byteOffset).getUint16(i * 2, false) >> 8) & 0xFF;
      const grayValue = (grayView.getUint16(i * 2, false) >> 8) & 0xFF;

      output[idx] = grayValue;
      output[idx + 1] = grayValue;
      output[idx + 2] = grayValue;
      output[idx + 3] = aValue;
    }
  }
}

export default PsdPreviewer;
