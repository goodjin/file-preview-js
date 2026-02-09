/**
 * OFD预览器
 * 支持ofd格式预览（开放版式文档）
 * 
 * @description 使用OFD.js等库解析OFD文档
 * @module OfdPreviewer
 * @version 1.0.0
 */

/**
 * OFD预览器类
 * @class OfdPreviewer
 */
export class OfdPreviewer {
  /**
   * 创建OFD预览器实例
   * @param {Object} options - 预览器选项
   * @param {EventBus} options.eventBus - 事件总线实例
   * @param {StateManager} options.stateManager - 状态管理器实例
   */
  constructor(options = {}) {
    this.eventBus = options.eventBus;
    this.stateManager = options.stateManager;
    this.pages = [];
    this.currentPage = 1;
    this.document = null;
  }

  /**
   * 加载OFD文档
   * @param {File} file - 文件对象
   * @returns {Promise<Object>} 加载结果
   */
  async load(file) {
    try {
      this.emitProgress(10);

      // TODO: 使用OFD.js等库解析OFD文档
      // const arrayBuffer = await file.arrayBuffer();
      // this.document = await OfdDocument.load(arrayBuffer);
      // 
      // 提取页面内容
      // this.pages = [];
      // for (let i = 0; i < this.document.pages.length; i++) {
      //   const page = this.document.pages[i];
      //   this.pages.push({
      //     pageNumber: i + 1,
      //     width: page.width,
      //     height: page.height,
      //     content: page.toCanvas()
      //   });
      // }

      this.emitProgress(50);

      // 模拟OFD内容（临时实现）
      const mockPages = [
        {
          pageNumber: 1,
          content: `OFD Page 1 - Open Fixed-layout Document

OFD（Open Fixed-layout Document）是我国国家标准版式文档，
类似于PDF格式，但具有更好的版式固定性。

特点：
• 版式固定：保证在不同设备上显示一致
• 原生支持中文：适合中文文档
• 支持数字签名：满足电子文档签名需求
• 文件体积小：比PDF文件通常更小`,
          width: 800,
          height: 1131
        },
        {
          pageNumber: 2,
          content: `OFD Page 2 - Document Content

OFD文档可以包含：
• 文字内容
• 图片内容
• 表格内容
• 图形内容
• 数字签名`,
          width: 800,
          height: 1131
        },
        {
          pageNumber: 3,
          content: `OFD Page 3 - Implementation Note

当前实现显示OFD文档的预览效果。
实际的OFD解析需要专门的库（如ofd.js）。
这些库可以：
• 解析OFD文件结构
• 渲染OFD页面内容
• 支持OFD文档的各种特性`,
          width: 800,
          height: 1131
        },
        {
          pageNumber: 4,
          content: `OFD Page 4 - Supported Features

OFD预览器将支持：
• 多页面显示
• 缩放功能
• 页面导航
• 全屏模式
• 文档信息显示
• 页面缩略图（可选）`,
          width: 800,
          height: 1131
        }
      ];

      this.pages = mockPages;

      this.emitProgress(100);

      return {
        type: 'ofd',
        ext: 'ofd',
        pages: this.pages,
        numPages: this.pages.length
      };
    } catch (error) {
      this.emitError(error, 'Failed to load OFD document');
      throw error;
    }
  }

  /**
   * 渲染OFD预览
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
      wrapper.className = 'ofd-preview document-preview';

      // 创建页面容器
      const pageContainer = document.createElement('div');
      pageContainer.className = 'ofd-pages pdf-pages';

      // 渲染所有页面
      data.pages.forEach((page, index) => {
        const pageElement = this.createPageElement(page, index);
        pageContainer.appendChild(pageElement);
      });

      wrapper.appendChild(pageContainer);
      container.appendChild(wrapper);

      // 显示第一页
      this.showPage(1);

      this.emitLoaded();
    } catch (error) {
      this.emitError(error, 'Failed to render OFD document');
      throw error;
    }
  }

  /**
   * 创建OFD页面元素
   * @param {Object} page - 页面数据
   * @param {number} index - 页面索引
   * @returns {HTMLElement} 页面元素
   */
  createPageElement(page, index) {
    const pageDiv = document.createElement('div');
    pageDiv.className = 'ofd-page pdf-page';
    pageDiv.dataset.pageIndex = index + 1;

    const pageContent = document.createElement('div');
    pageContent.className = 'ofd-page-content pdf-page-content';
    pageContent.style.width = `${page.width}px`;
    pageContent.style.height = `${page.height}px`;
    pageContent.style.backgroundColor = '#fff';
    pageContent.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';

    // 添加OFD标识
    const ofdWatermark = document.createElement('div');
    ofdWatermark.style.position = 'absolute';
    ofdWatermark.style.top = '20px';
    ofdWatermark.style.right = '20px';
    ofdWatermark.style.background = 'rgba(243, 156, 18, 0.1)';
    ofdWatermark.style.color = '#f39c12';
    ofdWatermark.style.padding = '4px 8px';
    ofdWatermark.style.borderRadius = '4px';
    ofdWatermark.style.fontSize = '12px';
    ofdWatermark.style.fontWeight = '500';
    ofdWatermark.textContent = 'OFD';
    pageContent.appendChild(ofdWatermark);

    // 页面内容（临时实现，实际应该是canvas）
    const contentDiv = document.createElement('div');
    contentDiv.style.padding = '40px';
    contentDiv.style.fontFamily = 'Arial, sans-serif';
    contentDiv.innerHTML = `
      <h1 style="color: #f39c12; margin-bottom: 20px;">Page ${page.pageNumber}</h1>
      <div style="margin-top: 30px; padding: 20px; background: #fef5e7; border-left: 4px solid #f39c12; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #27ae60; line-height: 1.8;">
          ${page.content}
        </p>
      </div>
    `;

    pageContent.appendChild(contentDiv);

    // 页面编号
    const pageNumber = document.createElement('div');
    pageNumber.className = 'ofd-page-number pdf-page-number';
    pageNumber.textContent = `${page.pageNumber}`;
    pageDiv.appendChild(pageNumber);

    pageDiv.appendChild(pageContent);

    return pageDiv;
  }

  /**
   * 显示指定页面
   * @param {number} pageNum - 页码
   */
  showPage(pageNum) {
    if (pageNum < 1 || pageNum > this.pages.length) {
      return;
    }

    this.currentPage = pageNum;

    // 隐藏所有页面
    const allPages = document.querySelectorAll('.ofd-page');
    allPages.forEach(page => {
      page.style.display = 'none';
    });

    // 显示当前页面
    const currentPageElement = document.querySelector(`[data-page-index="${pageNum}"]`);
    if (currentPageElement) {
      currentPageElement.style.display = 'block';
    }

    this.updateCurrentPage();
  }

  /**
   * 下一页
   */
  nextPage() {
    if (this.currentPage < this.pages.length) {
      this.showPage(this.currentPage + 1);
    }
  }

  /**
   * 上一页
   */
  previousPage() {
    if (this.currentPage > 1) {
      this.showPage(this.currentPage - 1);
    }
  }

  /**
   * 更新当前页
   */
  updateCurrentPage() {
    if (this.stateManager) {
      this.stateManager.setState('currentPage', this.currentPage);
      this.stateManager.setState('totalPages', this.pages.length);
    }

    if (this.eventBus) {
      this.eventBus.emit('page:changed', {
        currentPage: this.currentPage,
        totalPages: this.pages.length
      });
    }
  }

  /**
   * 获取总页数
   * @returns {number} 总页数
   */
  getTotalPages() {
    return this.pages.length;
  }

  /**
   * 获取当前页码
   * @returns {number} 当前页码
   */
  getCurrentPage() {
    return this.currentPage;
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
    this.pages = [];
    this.currentPage = 1;
    if (this.document) {
      this.document = null;
    }
  }
}