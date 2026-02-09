/**
 * Markdown预览器
 * 支持md格式预览
 * 
 * @description 使用marked库解析Markdown文件并渲染
 * @module MarkdownPreviewer
 * @version 1.0.0
 */

// 导入marked库（将通过npm安装）
// import { marked } from 'marked';

/**
 * Markdown预览器类
 * @class MarkdownPreviewer
 */
export class MarkdownPreviewer {
  /**
   * 创建Markdown预览器实例
   * @param {Object} options - 预览器选项
   * @param {EventBus} options.eventBus - 事件总线实例
   * @param {StateManager} options.stateManager - 状态管理器实例
   */
  constructor(options = {}) {
    this.eventBus = options.eventBus;
    this.stateManager = options.stateManager;
    this.markdown = '';
    this.html = '';
  }

  /**
   * 加载Markdown文件
   * @param {File} file - 文件对象
   * @returns {Promise<Object>} 加载结果
   */
  async load(file) {
    try {
      this.emitProgress(20);

      // 读取文件为文本
      this.markdown = await file.text();

      this.emitProgress(50);

      // TODO: 使用marked库解析Markdown
      // this.html = marked(this.markdown);

      // 模拟marked解析（临时实现）
      this.html = this.mockMarkedParse(this.markdown);

      this.emitProgress(100);

      return {
        type: 'markdown',
        ext: 'md',
        markdown: this.markdown,
        html: this.html
      };
    } catch (error) {
      this.emitError(error, 'Failed to load Markdown file');
      throw error;
    }
  }

  /**
   * 模拟marked解析（临时实现）
   * @param {string} markdown - Markdown文本
   * @returns {string} HTML内容
   */
  mockMarkedParse(markdown) {
    // 实际实现中，这里会调用marked(markdown)
    // 简单的Markdown到HTML转换（临时实现）
    return markdown
      // 标题 #
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
      .replace(/^##### (.*$)/gim, '<h5>$1</h5>')
      .replace(/^###### (.*$)/gim, '<h6>$1</h6>')
      // 粗体 **
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // 斜体 *
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // 代码 `
      .replace(/`(.*?)`/g, '<code>$1</code>')
      // 链接 [text](url)
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
      // 换行
      .replace(/\n/g, '<br>');
  }

  /**
   * 渲染Markdown预览
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
      wrapper.className = 'markdown-preview';

      const contentDiv = document.createElement('div');
      contentDiv.className = 'markdown-content';
      contentDiv.innerHTML = data.html;

      wrapper.appendChild(contentDiv);
      container.appendChild(wrapper);

      this.emitLoaded();
    } catch (error) {
      this.emitError(error, 'Failed to render Markdown file');
      throw error;
    }
  }

  /**
   * 获取总页数
   * @returns {number} 总页数（Markdown为1）
   */
  getTotalPages() {
    return 1;
  }

  /**
   * 获取当前页码
   * @returns {number} 当前页码（Markdown为1）
   */
  getCurrentPage() {
    return 1;
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
    this.markdown = '';
    this.html = '';
  }
}