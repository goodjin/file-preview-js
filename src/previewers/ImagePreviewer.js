/**
 * 图片预览器
 * 支持jpg, png, gif, bmp, svg, tif, webp, psd等图片格式
 * 
 * @description 使用浏览器原生能力预览图片
 * @module ImagePreviewer
 * @version 1.0.0
 */

/**
 * 图片预览器类
 * @class ImagePreviewer
 */
export class ImagePreviewer {
  /**
   * 创建图片预览器实例
   * @param {Object} options - 预览器选项
   * @param {EventBus} options.eventBus - 事件总线实例
   * @param {StateManager} options.stateManager - 状态管理器实例
   */
  constructor(options = {}) {
    this.eventBus = options.eventBus;
    this.stateManager = options.stateManager;
    this.imageUrl = null;
    this.imageElement = null;
    this.imageData = null;
  }

  /**
   * 加载图片文件
   * @param {File} file - 文件对象
   * @returns {Promise<Object>} 加载结果
   */
  async load(file) {
    try {
      this.emitProgress(20);

      // 创建图片URL
      this.imageUrl = URL.createObjectURL(file);

      this.emitProgress(50);

      // 预加载图片
      await this.preloadImage(this.imageUrl);

      this.emitProgress(100);

      // 获取图片尺寸
      const { naturalWidth, naturalHeight } = this.imageElement;

      return {
        type: 'image',
        ext: file.name.split('.').pop().toLowerCase(),
        url: this.imageUrl,
        name: file.name,
        size: file.size,
        width: naturalWidth,
        height: naturalHeight,
        aspectRatio: naturalWidth / naturalHeight
      };
    } catch (error) {
      this.emitError(error, 'Failed to load image');
      throw error;
    }
  }

  /**
   * 预加载图片
   * @param {string} url - 图片URL
   * @returns {Promise<HTMLImageElement>}
   */
  preloadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.imageElement = img;
        resolve(img);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  }

  /**
   * 渲染图片预览
   * @param {HTMLElement} container - 容器元素
   * @param {Object} data - 加载的数据
   * @returns {Promise<void>}
   */
  async render(container, data) {
    if (!container) {
      throw new Error('Container is required');
    }

    try {
      container.innerHTML = '';

      const wrapper = document.createElement('div');
      wrapper.className = 'image-preview';

      const imageContainer = document.createElement('div');
      imageContainer.className = 'image-container';

      // 创建图片元素
      const img = document.createElement('img');
      img.className = 'image-content';
      img.src = data.url;
      img.alt = data.name;
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';
      img.style.margin = 'auto';

      imageContainer.appendChild(img);
      wrapper.appendChild(imageContainer);
      container.appendChild(wrapper);

      this.emitLoaded();
    } catch (error) {
      this.emitError(error, 'Failed to render image');
      throw error;
    }
  }

  /**
   * 获取总页数
   * @returns {number} 总页数（图片为1）
   */
  getTotalPages() {
    return 1;
  }

  /**
   * 获取当前页码
   * @returns {number} 当前页码（图片为1）
   */
  getCurrentPage() {
    return 1;
  }

  /**
   * 旋转图片
   * @param {number} angle - 旋转角度（90的倍数）
   */
  rotate(angle) {
    if (this.imageElement) {
      const currentRotation = (parseInt(this.imageElement.dataset.rotation) || 0);
      const newRotation = (currentRotation + angle) % 360;
      this.imageElement.dataset.rotation = newRotation;
      this.imageElement.style.transform = `rotate(${newRotation}deg)`;
    }
  }

  /**
   * 获取图片信息
   * @returns {Object} 图片信息
   */
  getImageInfo() {
    if (!this.imageElement) {
      return null;
    }

    return {
      width: this.imageElement.naturalWidth,
      height: this.imageElement.naturalHeight,
      aspectRatio: this.imageElement.naturalWidth / this.imageElement.naturalHeight,
      rotation: parseInt(this.imageElement.dataset.rotation) || 0
    };
  }

  /**
   * 触发加载进度事件
   * @param {number} progress - 进度（0-100）
   */
  emitProgress(progress) {
    if (this.eventBus) {
      this.eventBus.emit('file:load:progress', { progress });
    }
  }

  /**
   * 触发错误事件
   * @param {Error} error - 错误对象
   * @param {string} message - 错误消息
   */
  emitError(error, message) {
    if (this.eventBus) {
      this.eventBus.emit('file:load:error', { error, message });
    }
  }

  /**
   * 触发加载完成事件
   */
  emitLoaded() {
    if (this.eventBus) {
      this.eventBus.emit('file:loaded', {});
    }
  }

  /**
   * 销毁预览器
   */
  destroy() {
    // 清理URL
    if (this.imageUrl && this.imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.imageUrl);
      this.imageUrl = null;
    }

    // 清理元素
    if (this.imageElement) {
      this.imageElement = null;
    }
  }
}