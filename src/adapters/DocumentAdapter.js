/**
 * DocumentAdapter - 文档适配器
 * 
 * 统一文本文档的预览接口，处理文档的通用逻辑
 * 支持格式：pdf, ofd, rtf, txt, md, xml, json, epub
 */

import BaseAdapter from './BaseAdapter.js';

class DocumentAdapter extends BaseAdapter {
  constructor() {
    super();
    this._supportedTypes = new Set([
      'pdf',
      'ofd',
      'rtf',
      'txt',
      'md',
      'xml',
      'json',
      'epub'
    ]);
  }

  /**
   * 判断是否能处理该文件类型
   * @param {string} fileType - 文件类型
   * @returns {boolean} 是否支持
   */
  canHandle(fileType) {
    const type = fileType.toLowerCase();
    return this._supportedTypes.has(type);
  }

  /**
   * 解析文档文件
   * @param {File} file - 文件对象
   * @returns {Promise<Object>} 解析后的数据
   */
  async parse(file) {
    this.validateFile(file);

    const fileType = this.getFileExtension(file.name);
    
    if (!this.canHandle(fileType)) {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    const result = {
      fileType,
      fileName: file.name,
      fileSize: file.size,
      lastModified: file.lastModified,
      content: null,
      data: null
    };

    // 根据不同类型进行解析
    switch (fileType) {
      case 'txt':
        result.content = await this._parseTextFile(file);
        break;
      case 'md':
        result.content = await this._parseTextFile(file);
        break;
      case 'json':
        result.content = await this._parseJsonFile(file);
        break;
      case 'xml':
        result.content = await this._parseTextFile(file);
        break;
      case 'pdf':
        result.data = await file.arrayBuffer();
        break;
      case 'rtf':
        result.data = await file.arrayBuffer();
        break;
      case 'ofd':
        result.data = await file.arrayBuffer();
        break;
      case 'epub':
        result.data = await file.arrayBuffer();
        break;
      default:
        throw new Error(`Unknown file type: ${fileType}`);
    }

    return result;
  }

  /**
   * 渲染数据
   * @param {Object} data - 解析后的数据
   * @returns {HTMLElement} 渲染结果
   */
  render(data) {
    const container = document.createElement('div');
    container.className = 'document-preview';

    const { fileType, content } = data;

    // 根据不同类型进行渲染
    switch (fileType) {
      case 'txt':
        container.innerHTML = this._renderText(content);
        break;
      case 'md':
        container.innerHTML = this._renderMarkdown(content);
        break;
      case 'json':
        container.innerHTML = this._renderJson(content);
        break;
      case 'xml':
        container.innerHTML = this._renderXml(content);
        break;
      case 'pdf':
      case 'rtf':
      case 'ofd':
      case 'epub':
        container.innerHTML = this._renderBinary(fileType);
        break;
      default:
        container.textContent = `Unsupported file type: ${fileType}`;
    }

    return container;
  }

  /**
   * 获取支持的文件类型列表
   * @returns {string[]} 支持的文件类型数组
   */
  getSupportedTypes() {
    return Array.from(this._supportedTypes);
  }

  /**
   * 解析文本文件
   * @private
   * @param {File} file - 文件对象
   * @returns {Promise<string>} 文本内容
   */
  async _parseTextFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read text file'));
      reader.readAsText(file);
    });
  }

  /**
   * 解析JSON文件
   * @private
   * @param {File} file - 文件对象
   * @returns {Promise<Object>} JSON对象
   */
  async _parseJsonFile(file) {
    const text = await this._parseTextFile(file);
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error('Invalid JSON file');
    }
  }

  /**
   * 渲染纯文本
   * @private
   * @param {string} content - 文本内容
   * @returns {string} HTML字符串
   */
  _renderText(content) {
    const escaped = this._escapeHtml(content);
    return `<pre class="text-content">${escaped}</pre>`;
  }

  /**
   * 渲染Markdown
   * @private
   * @param {string} content - Markdown内容
   * @returns {string} HTML字符串
   */
  _renderMarkdown(content) {
    // 简化版Markdown渲染，实际项目应使用markdown-it等库
    let html = content
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/`([^`]+)`/gim, '<code>$1</code>')
      .replace(/\n/gim, '<br>');
    
    return `<div class="markdown-content">${html}</div>`;
  }

  /**
   * 渲染JSON
   * @private
   * @param {Object} content - JSON对象
   * @returns {string} HTML字符串
   */
  _renderJson(content) {
    const jsonStr = JSON.stringify(content, null, 2);
    const escaped = this._escapeHtml(jsonStr);
    return `<pre class="json-content"><code>${escaped}</code></pre>`;
  }

  /**
   * 渲染XML
   * @private
   * @param {string} content - XML内容
   * @returns {string} HTML字符串
   */
  _renderXml(content) {
    const escaped = this._escapeHtml(content);
    return `<pre class="xml-content"><code>${escaped}</code></pre>`;
  }

  /**
   * 渲染二进制文件
   * @private
   * @param {string} fileType - 文件类型
   * @returns {string} HTML字符串
   */
  _renderBinary(fileType) {
    return `
      <div class="binary-placeholder">
        <div class="placeholder-icon">📄</div>
        <p>${fileType.toUpperCase()} file</p>
        <p class="placeholder-hint">This file type requires a specialized previewer</p>
      </div>
    `;
  }

  /**
   * 转义HTML特殊字符
   * @private
   * @param {string} text - 文本内容
   * @returns {string} 转义后的文本
   */
  _escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}

export default DocumentAdapter;
