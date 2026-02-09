/**
 * Word预览器
 * 支持doc, docx格式预览
 * 
 * @description 使用mammoth库解析Word文档并渲染
 * @module WordPreviewer
 * @version 1.0.0
 */

// 导入mammoth库（将通过npm安装）
// import { convertToHtml } from 'mammoth';

/**
 * Word预览器类
 * @class WordPreviewer
 */
export class WordPreviewer {
  /**
   * 创建Word预览器实例
   * @param {Object} options - 预览器选项
   * @param {EventBus} options.eventBus - 事件总线实例
   * @param {StateManager} options.stateManager - 状态管理器实例
   */
  constructor(options = {}) {
    this.eventBus = options.eventBus;
    this.stateManager = options.stateManager;
    this.pages = [];
    this.currentPage = 1;
  }

  /**
   * 加载Word文档
   * @param {File} file - 文件对象
   * @returns {Promise<Object>} 加载结果
   */
  async load(file) {
    try {
      this.emitProgress(10);

      // 读取文件为ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      this.emitProgress(30);

      // TODO: 使用mammoth库解析Word文档
      // const result = await convertToHtml({ arrayBuffer });
      // const htmlContent = result.value;
      // const messages = result.messages;

      // 模拟mammoth解析结果（临时实现）
      this.emitProgress(50);

      const mockResult = this.mockMammothParse(file.name);
      this.pages = [mockResult.htmlContent];

      this.emitProgress(100);

      return {
        type: 'word',
        ext: file.name.split('.').pop(),
        pages: this.pages,
        numPages: this.pages.length,
        messages: mockResult.messages
      };
    } catch (error) {
      this.emitError(error, 'Failed to load Word document');
      throw error;
    }
  }

  /**
   * 模拟mammoth解析结果（临时实现）
   * @param {string} fileName - 文件名
   * @returns {Object} 解析结果
   */
  mockMammothParse(fileName) {
    // 实际实现中，这里会调用mammoth.convertToHtml()
    const mockHtml = `
      <div style="padding: 40px; font-family: Arial, sans-serif; line-height: 1.6;">
        <h1 style="color: #2c3e50; margin-bottom: 20px;">${fileName}</h1>
        
        <h2 style="color: #34495e; margin-bottom: 15px;">Introduction</h2>
        <p style="margin-bottom: 15px;">
          This is a <strong>placeholder</strong> for Word document content.
          In the actual implementation, this will be replaced with parsed content
          from the <code>mammoth</code> library.
        </p>
        
        <h2 style="color: #34495e; margin-bottom: 15px;">Features</h2>
        <ul style="margin-bottom: 15px; padding-left: 20px;">
          <li style="margin-bottom: 8px;">Accurate DOCX to HTML conversion</li>
          <li style="margin-bottom: 8px;">Supports text formatting</li>
          <li style="margin-bottom: 8px;">Preserves document structure</li>
          <li style="margin-bottom: 8px;">Handles images and tables</li>
        </ul>
        
        <h2 style="color: #34495e; margin-bottom: 15px;">Technical Details</h2>
        <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-left: 4px solid #3498db; border-radius: 4px;">
          <strong>Implementation:</strong>
          <br>
          To enable actual Word parsing:
          <ol style="margin-top: 10px; margin-left: 20px;">
            <li style="margin-bottom: 5px;">Install mammoth: <code>npm install mammoth</code></li>
            <li style="margin-bottom: 5px;">Import: <code>import { convertToHtml } from 'mammoth';</code></li>
            <li style="margin-bottom: 5px;">Parse: <code>const result = await convertToHtml({ arrayBuffer });</code></li>
          </ol>
        </div>
        
        <div style="margin-top: 30px; padding: 20px; background: #e8f5e9; border-radius: 4px;">
          <h3 style="color: #1e7e34; margin-bottom: 10px;">Note</h3>
          <p style="margin: 0; color: #145a32;">
            The current implementation shows a mock preview. 
            After integrating mammoth, this will display the actual 
            content of the uploaded Word document.
          </p>
        </div>
      </div>
    `;

    return {
      htmlContent: mockHtml,
      messages: [
        { type: 'info', message: 'Document loaded successfully' }
      ]
    };
  }

  /**
   * 渲染Word预览
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
      wrapper.className = 'word-preview';

      const contentDiv = document.createElement('div');
      contentDiv.className = 'word-content';
      contentDiv.innerHTML = this.pages[0];

      wrapper.appendChild(contentDiv);
      container.appendChild(wrapper);

      this.emitLoaded();
    } catch (error) {
      this.emitError(error, 'Failed to render Word document');
      throw error;
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
   * 转到指定页
   * @param {number} pageNum - 页码
   */
  goToPage(pageNum) {
    if (pageNum >= 1 && pageNum <= this.pages.length) {
      this.currentPage = pageNum;
      this.updateCurrentPage();
    }
  }

  /**
   * 下一页
   */
  nextPage() {
    if (this.currentPage < this.pages.length) {
      this.goToPage(this.currentPage + 1);
    }
  }

  /**
   * 上一页
   */
  previousPage() {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  /**
   * 更新当前页
   */
  updateCurrentPage() {
    if (this.stateManager) {
      this.stateManager.setState('currentPage', this.currentPage);
    }

    if (this.eventBus) {
      this.eventBus.emit('page:changed', {
        currentPage: this.currentPage,
        totalPages: this.pages.length
      });
    }
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
  }
}