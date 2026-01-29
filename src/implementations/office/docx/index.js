/**
 * docx子模块主入口
 * 集成Parser和Renderer，提供统一的预览接口
 */
import DocxParser from './DocxParser.js';
import DocxRenderer from './DocxRenderer.js';

class DocxPreview {
  constructor() {
    this.parser = new DocxParser();
    this.renderer = new DocxRenderer();
    this.isLoaded = false;
    this.container = null;
    this.currentFile = null;
  }

  /**
   * 解析docx文件
   * @param {File|ArrayBuffer|Uint8Array} file - docx文件
   * @param {Object} options - 解析选项
   * @returns {Promise<Object>} 解析结果
   */
  async parse(file, options = {}) {
    try {
      this.currentFile = file;
      const result = await this.parser.parse(file, options);
      this.isLoaded = true;
      return result;
    } catch (error) {
      this.isLoaded = false;
      throw error;
    }
  }

  /**
   * 渲染到指定容器
   * @param {HTMLElement} container - 渲染容器
   * @param {Object} options - 渲染选项
   */
  render(container, options = {}) {
    if (!this.isLoaded) {
      throw new Error('No parsed data available. Call parse() first.');
    }

    const parsedData = this.parser.getParsedData();
    if (!parsedData || !parsedData.html) {
      throw new Error('No HTML data to render');
    }

    this.container = container;
    this.renderer.render(parsedData.html, container, options);

    // 返回警告和错误信息
    return {
      warnings: parsedData.warnings,
      errors: parsedData.errors
    };
  }

  /**
   * 重新渲染
   * @param {Object} options - 渲染选项
   */
  rerender(options = {}) {
    if (!this.isLoaded) {
      throw new Error('No parsed data available. Call parse() first.');
    }
    const parsedData = this.parser.getParsedData();
    this.renderer.update(parsedData.html);
  }

  /**
   * 设置缩放级别
   * @param {number} level - 缩放级别 (0.5 - 3.0)
   */
  setZoom(level) {
    this.renderer.setZoom(level);
  }

  /**
   * 获取当前缩放级别
   */
  getZoom() {
    return this.renderer.getZoom();
  }

  /**
   * 获取文件信息
   */
  getFileInfo() {
    if (!this.currentFile) {
      return null;
    }

    const parsedData = this.parser.getParsedData();
    return {
      fileName: this.currentFile.name || 'unknown.docx',
      fileSize: this.currentFile.size || 0,
      fileType: 'docx',
      wordCount: parsedData ? this._countWords(parsedData.rawText) : 0,
      charCount: parsedData ? parsedData.rawText.length : 0
    };
  }

  /**
   * 获取原始文本
   */
  getRawText() {
    if (!this.isLoaded) {
      return '';
    }
    const parsedData = this.parser.getParsedData();
    return parsedData ? parsedData.rawText : '';
  }

  /**
   * 获取警告信息
   */
  getWarnings() {
    if (!this.isLoaded) {
      return [];
    }
    const parsedData = this.parser.getParsedData();
    return parsedData ? parsedData.warnings : [];
  }

  /**
   * 获取错误信息
   */
  getErrors() {
    if (!this.isLoaded) {
      return [];
    }
    const parsedData = this.parser.getParsedData();
    return parsedData ? parsedData.errors : [];
  }

  /**
   * 销毁实例，清理资源
   */
  destroy() {
    this.renderer.clear();
    this.parser.clear();
    this.isLoaded = false;
    this.container = null;
    this.currentFile = null;
  }

  /**
   * 统计字数
   */
  _countWords(text) {
    if (!text) return 0;
    const words = text.trim().split(/\s+/);
    return words.filter(word => word.length > 0).length;
  }
}

// 导出单例
export default new DocxPreview();

// 同时也导出类，用于需要多实例的场景
export { DocxPreview };
