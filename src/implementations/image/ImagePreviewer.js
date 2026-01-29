/**
 * 图片预览器主类
 * @description 图片预览模块的统一入口，负责管理不同格式的图片预览
 */

import JpgPreviewer from './JpgPreviewer.js';
import PngPreviewer from './PngPreviewer.js';
import GifPreviewer from './GifPreviewer.js';
import BmpPreviewer from './BmpPreviewer.js';
import SvgPreviewer from './SvgPreviewer.js';
import WebpPreviewer from './WebpPreviewer.js';
import PsdPreviewer from './PsdPreviewer.js';
import TifPreviewer from './TifPreviewer.js';
import { validateFileType, validateFileSize, loadImage } from './ImageUtils.js';
import {
  DEFAULT_OPTIONS,
  ERROR_MESSAGES,
  EVENT_TYPES
} from './ImageConstants.js';

/**
 * 图片预览器主类
 * @class ImagePreviewer
 */
class ImagePreviewer {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {HTMLElement} options.container - 预览容器
   * @param {Object} [options.eventBus] - 事件总线
   * @param {Object} [options.config] - 自定义配置
   */
  constructor(options = {}) {
    this.container = options.container;
    this.eventBus = options.eventBus;
    this.config = { ...DEFAULT_OPTIONS, ...options.config };

    // 状态
    this.currentPreviewer = null;
    this.currentFile = null;
    this.isLoaded = false;
    this.isDestroyed = false;

    // 事件监听器
    this.eventListeners = new Map();

    // 绑定方法
    this._handleEvent = this._handleEvent.bind(this);
  }

  /**
   * 预览图片主方法
   * @param {File} file - 图片文件
   * @param {HTMLElement} container - 预览容器（可选，默认使用构造时的容器）
   * @returns {Promise<void>}
   */
  async preview(file, container = this.container) {
    if (this.isDestroyed) {
      throw new Error('ImagePreviewer has been destroyed');
    }

    if (!file || !container) {
      throw new Error('Invalid file or container');
    }

    // 清理之前的预览器
    this._destroyCurrentPreviewer();

    // 验证文件类型
    const typeValidation = validateFileType(file);
    if (!typeValidation.valid) {
      this._emit(EVENT_TYPES.LOAD_ERROR, {
        error: typeValidation.error,
        file
      });
      throw new Error(typeValidation.error);
    }

    // 验证文件大小
    const sizeValidation = validateFileSize(file);
    if (!sizeValidation.valid) {
      this._emit(EVENT_TYPES.LOAD_ERROR, {
        error: sizeValidation.error,
        file
      });
      throw new Error(sizeValidation.error);
    }

    this.currentFile = file;
    this.isLoaded = false;

    // 发送加载开始事件
    this._emit(EVENT_TYPES.LOAD_START, { file });

    try {
      // 加载图片
      const img = await loadImage(file, (progress) => {
        this._emit(EVENT_TYPES.LOAD_PROGRESS, {
          progress,
          file
        });
      });

      // 获取文件类型
      const fileType = typeValidation.type;

      // 创建对应的预览器
      this.currentPreviewer = this._createPreviewer(fileType, img, this.config);

      // 渲染到容器
      await this.currentPreviewer.render(container);

      // 绑定事件
      this.currentPreviewer.on(EVENT_TYPES.SCALE_CHANGE, this._handleEvent);
      this.currentPreviewer.on(EVENT_TYPES.ROTATE_CHANGE, this._handleEvent);
      this.currentPreviewer.on(EVENT_TYPES.LOAD_COMPLETE, this._handleEvent);
      this.currentPreviewer.on(EVENT_TYPES.LOAD_ERROR, this._handleEvent);

      this.isLoaded = true;

      // 发送加载完成事件
      this._emit(EVENT_TYPES.LOAD_COMPLETE, {
        file,
        type: fileType,
        dimensions: {
          width: img.naturalWidth,
          height: img.naturalHeight
        }
      });

    } catch (error) {
      this.isLoaded = false;
      this._emit(EVENT_TYPES.LOAD_ERROR, {
        error: error.message || ERROR_MESSAGES.LOAD_FAILED,
        file
      });
      throw error;
    }
  }

  /**
   * 创建对应格式的预览器
   * @private
   * @param {string} type - 图片类型
   * @param {HTMLImageElement} img - 图片元素
   * @param {Object} config - 配置
   * @returns {JpgPreviewer|PngPreviewer|GifPreviewer|BmpPreviewer|SvgPreviewer|WebpPreviewer|PsdPreviewer|TifPreviewer}
   */
  _createPreviewer(type, img, config) {
    switch (type) {
      case 'jpg':
      case 'jpeg':
        return new JpgPreviewer(img, config);
      case 'png':
        return new PngPreviewer(img, config);
      case 'gif':
        return new GifPreviewer(img, config);
      case 'bmp':
        return new BmpPreviewer(img, config);
      case 'svg':
        return new SvgPreviewer(img, config);
      case 'webp':
        return new WebpPreviewer(img, config);
      case 'psd':
        return new PsdPreviewer(img, config);
      case 'tif':
      case 'tiff':
        return new TifPreviewer(img, config);
      default:
        throw new Error(`Unsupported image type: ${type}`);
    }
  }

  /**
   * 销毁当前预览器
   * @private
   */
  _destroyCurrentPreviewer() {
    if (this.currentPreviewer) {
      // 解绑事件
      this.currentPreviewer.off(EVENT_TYPES.SCALE_CHANGE, this._handleEvent);
      this.currentPreviewer.off(EVENT_TYPES.ROTATE_CHANGE, this._handleEvent);
      this.currentPreviewer.off(EVENT_TYPES.LOAD_COMPLETE, this._handleEvent);
      this.currentPreviewer.off(EVENT_TYPES.LOAD_ERROR, this._handleEvent);

      // 销毁预览器
      this.currentPreviewer.destroy();
      this.currentPreviewer = null;
    }
  }

  /**
   * 处理事件
   * @private
   * @param {Object} event - 事件对象
   */
  _handleEvent(event) {
    // 转发事件到外部
    this._emit(event.type, event.data);
  }

  /**
   * 发送事件
   * @private
   * @param {string} type - 事件类型
   * @param {Object} data - 事件数据
   */
  _emit(type, data = {}) {
    // 触发内部事件
    const handlers = this.eventListeners.get(type) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in ${type} handler:`, error);
      }
    });

    // 如果有事件总线，也发送到事件总线
    if (this.eventBus && typeof this.eventBus.emit === 'function') {
      this.eventBus.emit(type, data);
    }
  }

  /**
   * 注册事件监听器
   * @param {string} type - 事件类型
   * @param {Function} handler - 事件处理函数
   * @returns {ImagePreviewer}
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
   * @returns {ImagePreviewer}
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
   * 获取当前预览器
   * @returns {JpgPreviewer|PngPreviewer|GifPreviewer|BmpPreviewer|SvgPreviewer|WebpPreviewer|PsdPreviewer|TifPreviewer|null}
   */
  getCurrentPreviewer() {
    return this.currentPreviewer;
  }

  /**
   * 获取图片信息
   * @returns {Object|null}
   */
  getImageInfo() {
    if (!this.currentPreviewer || !this.currentFile) {
      return null;
    }

    return {
      name: this.currentFile.name,
      size: this.currentFile.size,
      type: this.currentFile.type,
      lastModified: this.currentFile.lastModified
    };
  }

  /**
   * 缩放图片
   * @param {number} factor - 缩放因子
   * @returns {ImagePreviewer}
   */
  scale(factor) {
    if (this.currentPreviewer) {
      this.currentPreviewer.scale(factor);
    }
    return this;
  }

  /**
   * 设置缩放比例
   * @param {number} scale - 缩放比例
   * @returns {ImagePreviewer}
   */
  setScale(scale) {
    if (this.currentPreviewer) {
      this.currentPreviewer.setScale(scale);
    }
    return this;
  }

  /**
   * 旋转图片
   * @param {number} angle - 旋转角度
   * @returns {ImagePreviewer}
   */
  rotate(angle) {
    if (this.currentPreviewer) {
      this.currentPreviewer.rotate(angle);
    }
    return this;
  }

  /**
   * 设置旋转角度
   * @param {number} rotation - 旋转角度
   * @returns {ImagePreviewer}
   */
  setRotation(rotation) {
    if (this.currentPreviewer) {
      this.currentPreviewer.setRotation(rotation);
    }
    return this;
  }

  /**
   * 重置视图
   * @returns {ImagePreviewer}
   */
  reset() {
    if (this.currentPreviewer) {
      this.currentPreviewer.reset();
    }
    this._emit(EVENT_TYPES.RESET);
    return this;
  }

  /**
   * 播放GIF动画（仅GIF有效）
   * @returns {ImagePreviewer}
   */
  play() {
    if (this.currentPreviewer && this.currentPreviewer.play) {
      this.currentPreviewer.play();
    }
    return this;
  }

  /**
   * 暂停GIF动画（仅GIF有效）
   * @returns {ImagePreviewer}
   */
  pause() {
    if (this.currentPreviewer && this.currentPreviewer.pause) {
      this.currentPreviewer.pause();
    }
    return this;
  }

  /**
   * 销毁预览器
   */
  destroy() {
    if (this.isDestroyed) {
      return;
    }

    this._destroyCurrentPreviewer();
    this.eventListeners.clear();
    this.currentFile = null;
    this.isLoaded = false;
    this.isDestroyed = true;

    // 清空容器
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  /**
   * 获取当前缩放比例
   * @returns {number}
   */
  getScale() {
    return this.currentPreviewer ? this.currentPreviewer.scale : 1;
  }

  /**
   * 获取当前旋转角度
   * @returns {number}
   */
  getRotation() {
    return this.currentPreviewer ? this.currentPreviewer.rotation : 0;
  }
}

export default ImagePreviewer;
