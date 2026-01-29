/**
 * ImageAdapter - 图片适配器
 * 
 * 统一图片的预览接口，处理图片的通用逻辑（缩放、旋转等）
 * 支持格式：jpg, png, gif, bmp, svg, tif, webp, psd
 */

import BaseAdapter from './BaseAdapter.js';

class ImageAdapter extends BaseAdapter {
  constructor() {
    super();
    this._supportedTypes = new Set([
      'jpg',
      'jpeg',
      'png',
      'gif',
      'bmp',
      'svg',
      'tif',
      'tiff',
      'webp',
      'psd'
    ]);
    this._imageData = null;
  }

  /**
   * 判断是否能处理该文件类型
   * @param {string} fileType - 文件类型
   * @returns {boolean} 是否支持
   */
  canHandle(fileType) {
    const type = fileType.toLowerCase();
    return this._supportedTypes.has(type);
  }

  /**
   * 解析图片文件
   * @param {File} file - 文件对象
   * @returns {Promise<Object>} 解析后的数据
   */
  async parse(file) {
    this.validateFile(file);

    const fileType = this.getFileExtension(file.name);
    
    if (!this.canHandle(fileType)) {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        this._imageData = {
          fileType,
          fileName: file.name,
          fileSize: file.size,
          lastModified: file.lastModified,
          dataUrl: e.target.result,
          width: 0,
          height: 0,
          naturalWidth: 0,
          naturalHeight: 0
        };

        // 加载图片获取尺寸
        const img = new Image();
        img.onload = () => {
          this._imageData.naturalWidth = img.naturalWidth;
          this._imageData.naturalHeight = img.naturalHeight;
          this._imageData.width = img.naturalWidth;
          this._imageData.height = img.naturalHeight;
          resolve(this._imageData);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result;
      };
      
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * 渲染数据
   * @param {Object} data - 解析后的数据
   * @param {Object} options - 渲染选项
   * @param {number} options.zoom - 缩放比例 (默认1.0)
   * @param {number} options.rotation - 旋转角度 (默认0)
   * @returns {HTMLElement} 渲染结果
   */
  render(data, options = {}) {
    const {
      zoom = 1.0,
      rotation = 0
    } = options;

    const container = document.createElement('div');
    container.className = 'image-preview';

    // 创建图片容器
    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'image-wrapper';
    imageWrapper.style.transform = `scale(${zoom}) rotate(${rotation}deg)`;
    imageWrapper.style.transformOrigin = 'center center';

    // 创建图片元素
    const img = document.createElement('img');
    img.src = data.dataUrl;
    img.alt = data.fileName;
    img.className = 'preview-image';
    img.draggable = false;

    // 添加加载状态
    img.onload = () => {
      imageWrapper.classList.add('loaded');
    };

    imageWrapper.appendChild(img);
    container.appendChild(imageWrapper);

    // 添加图片信息
    const info = this._createImageInfo(data, zoom, rotation);
    container.appendChild(info);

    return container;
  }

  /**
   * 获取支持的文件类型列表
   * @returns {string[]} 支持的文件类型数组
   */
  getSupportedTypes() {
    return Array.from(this._supportedTypes);
  }

  /**
   * 创建图片信息面板
   * @private
   * @param {Object} data - 图片数据
   * @param {number} zoom - 缩放比例
   * @param {number} rotation - 旋转角度
   * @returns {HTMLElement} 信息面板元素
   */
  _createImageInfo(data, zoom, rotation) {
    const infoPanel = document.createElement('div');
    infoPanel.className = 'image-info';

    const info = [
      `文件名: ${data.fileName}`,
      `原始尺寸: ${data.naturalWidth} x ${data.naturalHeight} px`,
      `文件大小: ${this._formatFileSize(data.fileSize)}`,
      `缩放: ${(zoom * 100).toFixed(0)}%`,
      `旋转: ${rotation}°`
    ];

    infoPanel.innerHTML = info.map(item => `<div class="info-item">${item}</div>`).join('');

    return infoPanel;
  }

  /**
   * 格式化文件大小
   * @private
   * @param {number} bytes - 文件大小（字节）
   * @returns {string} 格式化后的文件大小
   */
  _formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }

  /**
   * 计算适应容器的缩放比例
   * @param {Object} data - 图片数据
   * @param {number} containerWidth - 容器宽度
   * @param {number} containerHeight - 容器高度
   * @returns {number} 缩放比例
   */
  fitToContainer(data, containerWidth, containerHeight) {
    const scaleX = containerWidth / data.naturalWidth;
    const scaleY = containerHeight / data.naturalHeight;
    return Math.min(scaleX, scaleY, 1.0);
  }

  /**
   * 计算适应宽度的缩放比例
   * @param {Object} data - 图片数据
   * @param {number} containerWidth - 容器宽度
   * @returns {number} 缩放比例
   */
  fitToWidth(data, containerWidth) {
    return Math.min(containerWidth / data.naturalWidth, 1.0);
  }

  /**
   * 计算适应高度的缩放比例
   * @param {Object} data - 图片数据
   * @param {number} containerHeight - 容器高度
   * @returns {number} 缩放比例
   */
  fitToHeight(data, containerHeight) {
    return Math.min(containerHeight / data.naturalHeight, 1.0);
  }

  /**
   * 获取图片元数据
   * @param {Object} data - 图片数据
   * @returns {Object} 元数据
   */
  getMetadata(data) {
    return {
      fileName: data.fileName,
      fileSize: data.fileSize,
      fileType: data.fileType,
      width: data.naturalWidth,
      height: data.naturalHeight,
      aspectRatio: data.naturalWidth / data.naturalHeight,
      lastModified: data.lastModified
    };
  }
}

export default ImageAdapter;
