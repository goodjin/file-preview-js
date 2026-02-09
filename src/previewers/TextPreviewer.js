/**
 * 文本预览器
 * 支持txt、log、ini、conf等纯文本格式
 * 
 * @description 使用浏览器原生能力预览纯文本文件
 * @module TextPreviewer
 * @version 1.0.0
 */

/**
 * 文本预览器类
 * @class TextPreviewer
 */
export class TextPreviewer {
  /**
   * 创建文本预览器实例
   * @param {Object} options - 预览器选项
   * @param {EventBus} options.eventBus - 事件总线实例
   * @param {StateManager} options.stateManager - 状态管理器实例
   */
  constructor(options = {}) {
    this.eventBus = options.eventBus;
    this.stateManager = options.stateManager;
    this.content = '';
  }

  /**
   * 加载文本文件
   * @param {File} file - 文件对象
   * @returns {Promise<Object>} 加载结果
   */
  async load(file) {
    try {
      this.emitProgress(20);

      // 读取文件为文本
      this.content = await file.text();

      this.emitProgress(100);

      return {
        type: 'text',
        ext: file.name.split('.').pop(),
        content: this.content,
        encoding: 'utf-8'
      };
    } catch (error) {
      this.emitError(error, 'Failed to load text file');
      throw error;
    }
  }

  /**
   * 渲染文本预览
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
      wrapper.className = 'text-preview';

      const pre = document.createElement('pre');
      pre.className = 'text-content';
      pre.textContent = data.content;

      wrapper.appendChild(pre);
      container.appendChild(wrapper);

      this.emitLoaded();
    } catch (error) {
      this.emitError(error, 'Failed to render text file');
      throw error;
    }
  }

  /**
   * 获取总页数
   * @returns {number} 总页数（文本为1）
   */
  getTotalPages() {
    return 1;
  }

  /**
   * 获取当前页码
   * @returns {number} 当前页码（文本为1）
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
    this.content = '';
  }
}