/**
 * 代码预览器
 * 支持js、ts、py、java、c、cpp、css、html、json、xml等代码格式
 * 
 * @description 使用highlight.js等库进行语法高亮显示
 * @module CodePreviewer
 * @version 1.0.0
 */

// 导入highlight.js库（预留接口）
// import hljs from 'highlight.js';

/**
 * 代码预览器类
 * @class CodePreviewer
 */
export class CodePreviewer {
  /**
   * 支持的代码语言映射
   * @type {Object}
   */
  static languageMap = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'h': 'c',
    'hpp': 'cpp',
    'cs': 'csharp',
    'css': 'css',
    'scss': 'scss',
    'less': 'less',
    'html': 'html',
    'htm': 'html',
    'xml': 'xml',
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'sql': 'sql',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'sh': 'bash',
    'bat': 'batch',
    'ps1': 'powershell',
    'vue': 'vue'
  };

  /**
   * 创建代码预览器实例
   * @param {Object} options - 预览器选项
   * @param {EventBus} options.eventBus - 事件总线实例
   * @param {StateManager} options.stateManager - 状态管理器实例
   */
  constructor(options = {}) {
    this.eventBus = options.eventBus;
    this.stateManager = options.stateManager;
    this.code = '';
    this.language = 'plaintext';
  }

  /**
   * 加载代码文件
   * @param {File} file - 文件对象
   * @returns {Promise<Object>} 加载结果
   */
  async load(file) {
    try {
      this.emitProgress(20);

      // 获取文件扩展名
      const ext = file.name.split('.').pop().toLowerCase();

      // 映射到语言
      this.language = this.detectLanguage(ext);

      // 读取文件为文本
      this.emitProgress(50);
      this.code = await file.text();

      this.emitProgress(100);

      return {
        type: 'code',
        ext: ext,
        language: this.language,
        code: this.code
      };
    } catch (error) {
      this.emitError(error, 'Failed to load code file');
      throw error;
    }
  }

  /**
   * 检测代码语言
   * @param {string} ext - 文件扩展名
   * @returns {string} 语言标识
   */
  detectLanguage(ext) {
    return this.languageMap[ext] || 'plaintext';
  }

  /**
   * 渲染代码预览
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
      wrapper.className = 'code-preview';

      const pre = document.createElement('pre');
      pre.className = `code-content language-${data.language}`;

      const code = document.createElement('code');
      code.textContent = data.code;

      pre.appendChild(code);
      wrapper.appendChild(pre);
      container.appendChild(wrapper);

      // TODO: 使用highlight.js进行语法高亮
      // hljs.highlightElement(pre, { language: data.language });

      this.emitLoaded();
    } catch (error) {
      this.emitError(error, 'Failed to render code file');
      throw error;
    }
  }

  /**
   * 获取总页数
   * @returns {number} 总页数（代码为1）
   */
  getTotalPages() {
    return 1;
  }

  /**
   * 获取当前页码
   * @returns {number} 当前页码（代码为1）
   */
  getCurrentPage() {
    return 1;
  }

  /**
   * 复制代码到剪贴板
   */
  async copyCode() {
    try {
      await navigator.clipboard.writeText(this.code);
      this.eventBus.emit('code:copied', { success: true });
    } catch (error) {
      this.eventBus.emit('code:copied', { success: false, error });
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
    this.code = '';
    this.language = 'plaintext';
  }
}