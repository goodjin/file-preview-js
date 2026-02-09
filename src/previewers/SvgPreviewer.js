/**
 * SVG图片预览器
 * 支持svg格式预览
 * 
 * @description 扩展ImagePreviewer以支持SVG格式
 * @module SvgPreviewer
 * @version 1.0.0
 */

import { ImagePreviewer } from './ImagePreviewer.js';

/**
 * SVG图片预览器类
 * @class SvgPreviewer
 */
export class SvgPreviewer extends ImagePreviewer {
  /**
   * 创建SVG图片预览器实例
   * @param {Object} options - 预览器选项
   */
  constructor(options = {}) {
    super(options);
  }

  /**
   * 加载SVG图片
   * @param {File} file - 文件对象
   * @returns {Promise<Object>} 加载结果
   */
  async load(file) {
    const result = await super.load(file);
    return {
      ...result,
      type: 'svg',
      format: 'Scalable Vector Graphics'
    };
  }

  /**
   * 渲染SVG预览
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
      wrapper.className = 'image-preview svg-preview';

      const imageContainer = document.createElement('div');
      imageContainer.className = 'image-container svg-container';

      // 读取SVG内容并显示
      const svgContent = await file.text();
      const image = document.createElement('img');
      image.className = 'image-content svg-content';
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
      image.alt = data.name;
      image.style.maxWidth = '100%';
      image.style.height = 'auto';
      image.style.display = 'block';
      image.style.margin = 'auto';

      imageContainer.appendChild(image);
      wrapper.appendChild(imageContainer);
      container.appendChild(wrapper);

      this.emitLoaded();
    } catch (error) {
      this.emitError(error, 'Failed to render SVG image');
      throw error;
    }
  }
}