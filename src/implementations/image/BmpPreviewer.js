/**
 * BMP格式预览器
 * @description 负责BMP格式图片的预览，支持1/4/8/24/32位色彩深度
 * @see https://en.wikipedia.org/wiki/BMP_file_format
 */

import {
  EVENT_TYPES,
  DEFAULT_OPTIONS
} from './ImageConstants.js';
import {
  calculateFitScale,
  createCanvas,
  getImageDimensions
} from './ImageUtils.js';

/**
 * BMP文件签名
 * @constant {string}
 */
const BMP_SIGNATURE = 'BM';

/**
 * BMP信息头大小（Windows BITMAPINFOHEADER）
 * @constant {number}
 */
const BMP_INFO_HEADER_SIZE = 40;

/**
 * BMP压缩类型
 * @constant {Object}
 */
const BMP_COMPRESSION = {
  NONE: 0,
  RLE8: 1,
  RLE4: 2,
  BITFIELDS: 3
};

/**
 * BMP预览器类
 * @class BmpPreviewer
 */
class BmpPreviewer {
  /**
   * 构造函数
   * @param {File} file - BMP文件对象
   * @param {Object} [config={}] - 配置选项
   */
  constructor(file, config = {}) {
    this.file = file;
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

    // BMP解析结果
    this.bmpInfo = null;
    this.imageElement = null;

    // 容器
    this.container = null;
    this.wrapper = null;

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
   * 加载BMP文件
   * @returns {Promise<void>}
   */
  async load() {
    try {
      // 读取文件为ArrayBuffer
      const arrayBuffer = await this._readFileAsArrayBuffer(this.file);

      // 解析BMP文件
      this.bmpInfo = this._parseBMP(arrayBuffer);

      // 创建图片元素
      await this._createImageElement();

      this._emit(EVENT_TYPES.LOAD_COMPLETE, {
        dimensions: {
          width: this.bmpInfo.width,
          height: this.bmpInfo.height
        }
      });
    } catch (error) {
      this._emit(EVENT_TYPES.LOAD_ERROR, { error: error.message });
      throw error;
    }
  }

  /**
   * 读取文件为ArrayBuffer
   * @private
   * @param {File} file - 文件对象
   * @returns {Promise<ArrayBuffer>}
   */
  _readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * 解析BMP文件
   * @private
   * @param {ArrayBuffer} arrayBuffer - BMP文件数据
   * @returns {Object} BMP信息
   */
  _parseBMP(arrayBuffer) {
    const dataView = new DataView(arrayBuffer);
    let offset = 0;

    // 读取文件头（14字节）
    const signature = String.fromCharCode(
      dataView.getUint8(offset),
      dataView.getUint8(offset + 1)
    );
    offset += 2;

    if (signature !== BMP_SIGNATURE) {
      throw new Error('不是有效的BMP文件');
    }

    const fileSize = dataView.getUint32(offset, true);
    offset += 4;

    offset += 4; // Reserved

    const dataOffset = dataView.getUint32(offset, true);
    offset += 4;

    // 读取信息头
    const infoHeaderSize = dataView.getUint32(offset, true);
    offset += 4;

    if (infoHeaderSize !== BMP_INFO_HEADER_SIZE) {
      throw new Error('不支持的BMP格式（仅支持Windows BITMAPINFOHEADER）');
    }

    const width = dataView.getInt32(offset, true);
    offset += 4;

    const height = dataView.getInt32(offset, true);
    offset += 4;

    const planes = dataView.getUint16(offset, true);
    offset += 2;

    if (planes !== 1) {
      throw new Error('不支持的BMP格式（planes必须为1）');
    }

    const bitCount = dataView.getUint16(offset, true);
    offset += 2;

    // 支持的色彩深度
    if (![1, 4, 8, 24, 32].includes(bitCount)) {
      throw new Error(`不支持的色彩深度：${bitCount}位`);
    }

    const compression = dataView.getUint32(offset, true);
    offset += 4;

    if (compression !== BMP_COMPRESSION.NONE) {
      throw new Error('不支持的压缩格式（仅支持未压缩格式）');
    }

    offset += 4; // ImageSize

    offset += 8; // XPixelsPerMeter, YPixelsPerMeter

    const colorsUsed = dataView.getUint32(offset, true);
    offset += 4;

    offset += 4; // ColorsImportant

    // 读取调色板（对于1/4/8位颜色）
    let palette = null;
    if (bitCount <= 8) {
      const paletteSize = bitCount === 1 ? 2 : bitCount === 4 ? 16 : 256;
      const actualColorsUsed = colorsUsed > 0 ? colorsUsed : paletteSize;
      palette = [];

      for (let i = 0; i < actualColorsUsed; i++) {
        const blue = dataView.getUint8(offset);
        const green = dataView.getUint8(offset + 1);
        const red = dataView.getUint8(offset + 2);
        const alpha = 255;
        offset += 4; // BGR + reserved

        palette.push({ red, green, blue, alpha });
      }
    }

    return {
      signature,
      fileSize,
      dataOffset,
      width,
      height,
      bitCount,
      compression,
      palette,
      data: new Uint8Array(arrayBuffer, dataOffset)
    };
  }

  /**
   * 创建图片元素
   * @private
   * @returns {Promise<void>}
   */
  async _createImageElement() {
    const canvas = createCanvas(this.bmpInfo.width, this.bmpInfo.height);
    const ctx = canvas.getContext('2d');

    // 解码并绘制BMP数据
    this._decodeBMPData(ctx);

    // 转换为Image对象
    this.imageElement = new Image();
    this.imageElement.src = canvas.toDataURL('image/png');

    await new Promise((resolve, reject) => {
      this.imageElement.onload = resolve;
      this.imageElement.onerror = () => reject(new Error('图片创建失败'));
    });
  }

  /**
   * 解码BMP数据并绘制到Canvas
   * @private
   * @param {CanvasRenderingContext2D} ctx - Canvas上下文
   */
  _decodeBMPData(ctx) {
    const { width, height, bitCount, palette, data } = this.bmpInfo;
    const imageData = ctx.createImageData(width, height);
    const pixels = imageData.data;

    // 计算每行字节数（4字节对齐）
    const bytesPerRow = Math.ceil((width * bitCount) / 8);
    const rowSize = Math.ceil(bytesPerRow / 4) * 4;

    // BMP数据是从底部到顶部存储的
    for (let y = 0; y < height; y++) {
      const rowOffset = (height - 1 - y) * rowSize;
      const pixelOffset = y * width * 4;

      for (let x = 0; x < width; x++) {
        let color;

        switch (bitCount) {
          case 1:
            color = this._decode1Bit(data, rowOffset, x, palette);
            break;
          case 4:
            color = this._decode4Bit(data, rowOffset, x, palette);
            break;
          case 8:
            color = this._decode8Bit(data, rowOffset, x, palette);
            break;
          case 24:
            color = this._decode24Bit(data, rowOffset, x);
            break;
          case 32:
            color = this._decode32Bit(data, rowOffset, x);
            break;
        }

        const idx = pixelOffset + x * 4;
        pixels[idx] = color.red;
        pixels[idx + 1] = color.green;
        pixels[idx + 2] = color.blue;
        pixels[idx + 3] = color.alpha || 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * 解码1位颜色
   * @private
   * @param {Uint8Array} data - BMP数据
   * @param {number} rowOffset - 行偏移
   * @param {number} x - x坐标
   * @param {Array} palette - 调色板
   * @returns {Object} RGBA颜色
   */
  _decode1Bit(data, rowOffset, x, palette) {
    const byteIndex = Math.floor(x / 8);
    const bitIndex = 7 - (x % 8);
    const colorIndex = (data[rowOffset + byteIndex] >> bitIndex) & 0x01;
    return palette[colorIndex];
  }

  /**
   * 解码4位颜色
   * @private
   * @param {Uint8Array} data - BMP数据
   * @param {number} rowOffset - 行偏移
   * @param {number} x - x坐标
   * @param {Array} palette - 调色板
   * @returns {Object} RGBA颜色
   */
  _decode4Bit(data, rowOffset, x, palette) {
    const byteIndex = Math.floor(x / 2);
    const colorIndex = (x % 2 === 0)
      ? (data[rowOffset + byteIndex] >> 4) & 0x0F
      : data[rowOffset + byteIndex] & 0x0F;
    return palette[colorIndex];
  }

  /**
   * 解码8位颜色
   * @private
   * @param {Uint8Array} data - BMP数据
   * @param {number} rowOffset - 行偏移
   * @param {number} x - x坐标
   * @param {Array} palette - 调色板
   * @returns {Object} RGBA颜色
   */
  _decode8Bit(data, rowOffset, x, palette) {
    const colorIndex = data[rowOffset + x];
    return palette[colorIndex];
  }

  /**
   * 解码24位颜色
   * @private
   * @param {Uint8Array} data - BMP数据
   * @param {number} rowOffset - 行偏移
   * @param {number} x - x坐标
   * @returns {Object} RGBA颜色
   */
  _decode24Bit(data, rowOffset, x) {
    const offset = rowOffset + x * 3;
    return {
      red: data[offset + 2],
      green: data[offset + 1],
      blue: data[offset],
      alpha: 255
    };
  }

  /**
   * 解码32位颜色
   * @private
   * @param {Uint8Array} data - BMP数据
   * @param {number} rowOffset - 行偏移
   * @param {number} x - x坐标
   * @returns {Object} RGBA颜色
   */
  _decode32Bit(data, rowOffset, x) {
    const offset = rowOffset + x * 4;
    return {
      red: data[offset + 2],
      green: data[offset + 1],
      blue: data[offset],
      alpha: data[offset + 3]
    };
  }

  /**
   * 渲染图片到容器
   * @param {HTMLElement} container - 容器元素
   * @returns {Promise<void>}
   */
  async render(container) {
    if (!this.imageElement) {
      await this.load();
    }

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
    `;

    // 创建图片元素
    const imgElement = document.createElement('img');
    imgElement.src = this.imageElement.src;
    imgElement.style.cssText = `
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      user-select: none;
      cursor: grab;
      transition: transform ${this.config.scaleDuration}ms ${this.config.scaleEasing};
    `;

    this.imageElement = imgElement;

    // 计算初始缩放比例
    const dimensions = getImageDimensions(this.imageElement);
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
    if (!this.imageElement || !this.container) return;

    const dimensions = getImageDimensions(this.imageElement);
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
   * @returns {BmpPreviewer}
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
   * @returns {BmpPreviewer}
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
    this.bmpInfo = null;
  }
}

export default BmpPreviewer;
