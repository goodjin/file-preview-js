/**
 * PSD图片预览器
 * 支持psd格式预览（Photoshop文档）
 * 
 * @description 使用专门的PSD解析库或提供兼容模式
 * @module PsdPreviewer
 * @version 1.0.0
 */

import { ImagePreviewer } from './ImagePreviewer.js';

/**
 * PSD图片预览器类
 * @class PsdPreviewer
 */
export class PsdPreviewer extends ImagePreviewer {
  /**
   * 创建PSD预览器实例
   * @param {Object} options - 预览器选项
   */
  constructor(options = {}) {
    super(options);
  }

  /**
   * 加载PSD文件
   * @param {File} file - 文件对象
   * @returns {Promise<Object>} 加载结果
   */
  async load(file) {
    try {
      this.emitProgress(10);

      // TODO: 使用专门的PSD解析库（如psd.js或ag-psd）
      // const psd = await parsePsdFile(file);
      // const image = psd.composite();
      // const imageBlob = new Blob([image.data], { type: 'image/png' });
      // const imageUrl = URL.createObjectURL(imageBlob);

      this.emitProgress(50);

      // 模拟PSD内容（临时实现）
      const mockImageUrl = URL.createObjectURL(file);

      this.emitProgress(100);

      return {
        type: 'psd',
        ext: 'psd',
        url: mockImageUrl,
        name: file.name,
        size: file.size,
        format: 'Adobe Photoshop Document',
        layers: ['Background', 'Layer 1', 'Layer 2'], // 模拟图层数据
        width: 1920,
        height: 1080
      };
    } catch (error) {
      this.emitError(error, 'Failed to load PSD file');
      throw error;
    }
  }

  /**
   * 渲染PSD预览
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
      wrapper.className = 'image-preview psd-preview';

      const imageContainer = document.createElement('div');
      imageContainer.className = 'image-container psd-container';

      // PSD标识
      const psdBadge = document.createElement('div');
      psdBadge.className = 'psd-badge';
      psdBadge.innerHTML = `
        <span style="background: #31a8ff; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 500;">
          Adobe Photoshop (.psd)
        </span>
      `;
      psdBadge.style.marginBottom = '20px';
      psdBadge.style.textAlign = 'center';
      imageContainer.appendChild(psdBadge);

      // 主图片
      const image = document.createElement('img');
      image.className = 'image-content psd-image';
      image.src = data.url;
      image.alt = data.name;
      image.style.maxWidth = '100%';
      image.style.maxHeight = '80vh';
      image.style.display = 'block';
      image.style.margin = '20px auto';

      imageContainer.appendChild(image);

      // 图层信息
      const layersInfo = document.createElement('div');
      layersInfo.className = 'psd-layers';
      layersInfo.style.marginTop = '20px';
      layersInfo.style.padding = '20px';
      layersInfo.style.background = '#f8f9fa';
      layersInfo.style.borderRadius = '8px';

      const layersTitle = document.createElement('h3');
      layersTitle.textContent = 'Layers';
      layersTitle.style.marginBottom = '10px';
      layersTitle.style.fontSize = '16px';
      layersTitle.style.color = '#333';

      layersInfo.appendChild(layersTitle);

      data.layers.forEach(layer => {
        const layerItem = document.createElement('div');
        layerItem.className = 'psd-layer';
        layerItem.style.padding = '8px 0';
        layerItem.style.borderBottom = '1px solid #e9ecef';
        layerItem.style.fontSize = '14px';
        layerItem.style.color = '#666';
        layerItem.innerHTML = `👁 ${layer}`;
        layersInfo.appendChild(layerItem);
      });

      imageContainer.appendChild(layersInfo);
      wrapper.appendChild(imageContainer);
      container.appendChild(wrapper);

      this.emitLoaded();
    } catch (error) {
      this.emitError(error, 'Failed to render PSD file');
      throw error;
    }
  }

  /**
   * 销毁预览器
   */
  destroy() {
    this.imageUrl = null;
    this.imageElement = null;
  }
}