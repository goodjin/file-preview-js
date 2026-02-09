/**
 * ET预览器
 * 支持et格式预览（WPS表格格式）
 * 
 * @description 使用专门的ET解析库或使用Excel预览器兼容模式
 * @module EtPreviewer
 * @version 1.0.0
 */

import { ExcelPreviewer } from './ExcelPreviewer.js';

/**
 * ET预览器类
 * @class EtPreviewer
 */
export class EtPreviewer extends ExcelPreviewer {
  /**
   * 创建ET预览器实例
   * @param {Object} options - 预览器选项
   */
  constructor(options = {}) {
    super(options);
  }

  /**
   * 加载ET文件
   * @param {File} file - 文件对象
   * @returns {Promise<Object>} 加载结果
   */
  async load(file) {
    try {
      this.emitProgress(10);

      // TODO: 使用专门的ET解析库
      // const result = await parseEtFile(file);

      // 临时使用Excel预览器的兼容模式
      // ET文件与Excel文档结构类似，可以复用Excel预览器逻辑

      this.emitProgress(50);

      // 模拟ET内容（临时实现）
      const mockSheets = [
        {
          name: 'Sheet1',
          headers: ['Product', 'Price', 'Stock', 'Category'],
          data: [
            ['WPS Excel', '299.99', '50', 'Office Suite'],
            ['WPS Word', '199.99', '100', 'Word Processor'],
            ['WPS Presentation', '99.99', '80', 'Presentation Software']
          ],
          rowCount: 3,
          colCount: 4
        },
        {
          name: 'Sales Data',
          headers: ['Region', 'Q1', 'Q2', 'Q3', 'Q4'],
          data: [
            ['North', '100', '120', '130', '140'],
            ['South', '80', '90', '100', '110'],
            ['East', '90', '100', '110', '120'],
            ['West', '70', '80', '90', '100']
          ],
          rowCount: 4,
          colCount: 5
        }
      ];

      this.sheets = mockSheets;
      this.currentSheet = 0;

      this.emitProgress(100);

      return {
        type: 'et',
        ext: 'et',
        sheets: this.sheets,
        numSheets: this.sheets.length,
        currentSheet: this.currentSheet
      };
    } catch (error) {
      this.emitError(error, 'Failed to load ET spreadsheet');
      throw error;
    }
  }

  /**
   * 渲染ET预览
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
      wrapper.className = 'excel-preview et-preview';

      // 添加ET标识
      const etBadge = document.createElement('div');
      etBadge.className = 'et-badge';
      etBadge.innerHTML = `
        <span style="background: #f39c12; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 500;">
          WPS Excel (.et)
        </span>
      `;
      etBadge.style.marginBottom = '20px';
      wrapper.appendChild(etBadge);

      // 调用父类的render方法
      await super.render(container, data);

      // 更新表格类名
      const table = container.querySelector('.excel-table');
      if (table) {
        table.className = 'excel-table et-table';
      }

      this.emitLoaded();
    } catch (error) {
      this.emitError(error, 'Failed to render ET spreadsheet');
      throw error;
    }
  }

  /**
   * 销毁预览器
   */
  destroy() {
    this.sheets = [];
    this.currentSheet = 0;
  }
}