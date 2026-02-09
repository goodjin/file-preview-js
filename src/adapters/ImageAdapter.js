/**
 * 图片适配器
 * 支持：jpg, png, gif, bmp, svg, tif, webp, psd
 * 
 * @description 统一图片文件的预览接口
 * @module ImageAdapter
 * @version 1.0.0
 */

import { BaseAdapter } from './BaseAdapter.js';

/**
 * 图片适配器类
 * @class ImageAdapter
 * @extends BaseAdapter
 */
export class ImageAdapter extends BaseAdapter {
  /**
   * 支持的文件类型列表
   * @type {Array<string>}
   */
  static supportedTypes = [
    'jpg', 'jpeg', 'png', 'gif',
    'bmp', 'svg', 'tif', 'tiff',
    'webp', 'psd'
  ];

  /**
   * 检查是否支持该文件类型
   * @param {string} fileType - 文件类型
   * @returns {boolean} 是否支持
   */
  static supports(fileType) {
    return this.supportedTypes.includes(fileType);
  }

  /**
   * 加载文件
   * @param {File} file - 文件对象
   * @returns {Promise<Object>} 加载结果
   */
  async load(file) {
    try {
      this.emitProgress(20);

      // 创建图片对象
      const imageUrl = URL.createObjectURL(file);
      
      this.emitProgress(50);

      // 预加载图片
      await this.preloadImage(imageUrl);
      
      this.emitProgress(100);
      
      return {
        type: 'image',
        url: imageUrl,
        name: file.name,
        size: file.size
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
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  }

  /**
   * 渲染预览
   * @param {HTMLElement} container - 容器元素
   * @param {Object} data - 加载的数据
   * @returns {Promise<void>}
   */
  async render(container, data) {
    if (!container) {
      throw new Error('Container is required');
    }

    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'image-preview';

    const img = document.createElement('img');
    img.className = 'image-content';
    img.src = data.url;
    img.alt = data.name;
    img.style.maxWidth = '100%';
    img.style.height = 'auto';

    wrapper.appendChild(img);
    container.appendChild(wrapper);

    this.emitLoaded();
  }

  /**
   * 销毁预览器
   */
  destroy() {
    // 清理容器
    if (this.container) {
      const img = this.container.querySelector('img');
      if (img && img.src && img.src.startsWith('blob:')) {
        URL.revokeObjectURL(img.src);
      }
      this.container.innerHTML = '';
    }
  }
}