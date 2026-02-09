/**
 * DPS预览器
 * 支持dps格式预览（WPS演示格式）
 * 
 * @description 使用专门的DPS解析库或使用PowerPoint预览器兼容模式
 * @module DpsPreviewer
 * @version 1.0.0
 */

import { PowerPointPreviewer } from './PowerPointPreviewer.js';

/**
 * DPS预览器类
 * @class DpsPreviewer
 */
export class DpsPreviewer extends PowerPointPreviewer {
  /**
   * 创建DPS预览器实例
   * @param {Object} options - 预览器选项
   */
  constructor(options = {}) {
    super(options);
  }

  /**
   * 加载DPS文件
   * @param {File} file - 文件对象
   * @returns {Promise<Object>} 加载结果
   */
  async load(file) {
    try {
      this.emitProgress(10);

      // TODO: 使用专门的DPS解析库
      // const result = await parseDpsFile(file);

      // 临时使用PowerPoint预览器的兼容模式
      // DPS文件与PowerPoint文档结构类似，可以复用PowerPoint预览器逻辑

      this.emitProgress(50);

      // 模拟DPS内容（临时实现）
      const mockSlides = [
        {
          number: 1,
          title: 'WPS Presentation',
          content: 'WPS Office Presentation Software',
          layout: 'title-slide'
        },
        {
          number: 2,
          title: 'Features',
          content: '• Document Editing\n• Spreadsheet Creation\n• Presentation Design\n• PDF Support',
          layout: 'content-slide'
        },
        {
          number: 3,
          title: 'Advantages',
          content: '• Free and Paid Versions\n• Cloud Integration\n• Cross-Platform Support\n• Rich Template Library',
          layout: 'content-slide'
        },
        {
          number: 4,
          title: 'Compatibility',
          content: '• Supports Microsoft Office Formats\n• OpenDocument Formats\n• Native Chinese Language Support',
          layout: 'content-slide'
        },
        {
          number: 5,
          title: 'Thank You',
          content: 'Questions? Contact WPS Support',
          layout: 'end-slide'
        }
      ];

      this.slides = mockSlides;

      this.emitProgress(100);

      return {
        type: 'dps',
        ext: 'dps',
        slides: this.slides,
        numSlides: this.slides.length
      };
    } catch (error) {
      this.emitError(error, 'Failed to load DPS presentation');
      throw error;
    }
  }

  /**
   * 渲染DPS预览
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
      wrapper.className = 'powerpoint-preview dps-preview';

      // 添加DPS标识
      const dpsBadge = document.createElement('div');
      dpsBadge.className = 'dps-badge';
      dpsBadge.innerHTML = `
        <span style="background: #f39c12; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 500;">
          WPS Presentation (.dps)
        </span>
      `;
      dpsBadge.style.marginBottom = '20px';
      wrapper.appendChild(dpsBadge);

      // 调用父类的render方法
      await super.render(container, data);

      // 更新幻灯片类名
      const allSlides = container.querySelectorAll('.powerpoint-slide');
      allSlides.forEach(slide => {
        slide.classList.add('dps-slide');
      });

      this.emitLoaded();
    } catch (error) {
      this.emitError(error, 'Failed to render DPS presentation');
      throw error;
    }
  }

  /**
   * 销毁预览器
   */
  destroy() {
    this.slides = [];
    this.currentPage = 1;
  }
}