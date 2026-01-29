/**
 * OfficeAdapter - Office模块统一适配器
 * 负责将不同Office格式（docx/xlsx/pptx）的预览功能统一封装
 * 提供标准化的接口给核心框架层调用
 */

import DocxPreviewer from './docx/index.js';
import XlsxPreviewer from './xlsx/index.js';
import PptxPreviewer from './pptx/index.js';

/**
 * 预览错误类型
 */
export class PreviewError extends Error {
  constructor(message, type = 'unknown') {
    super(message);
    this.name = 'PreviewError';
    this.type = type;
  }
}

/**
 * OfficeAdapter类
 */
class OfficeAdapter {
  /**
   * 构造函数
   */
  constructor() {
    this._previewer = null;
    this._eventType = null;
    this._listeners = new Map();
  }

  /**
   * 获取支持的文件类型列表
   * @returns {string[]} 文件扩展名数组
   */
  static getSupportedTypes() {
    return ['doc', 'docx', 'xls', 'xlsx', 'csv', 'ppt', 'pptx'];
  }

  /**
   * 检测是否支持该文件类型
   * @param {string} fileType - 文件类型或扩展名
   * @returns {boolean}
   */
  static isSupported(fileType) {
    if (!fileType) return false;
    const ext = fileType.toLowerCase().replace(/^\./, '');
    return OfficeAdapter.getSupportedTypes().includes(ext);
  }

  /**
   * 加载Office文件
   * @param {File} file - 文件对象
   * @param {Object} options - 加载选项
   * @returns {Promise<void>}
   */
  async load(file, options = {}) {
    try {
      // 检查文件类型
      const fileType = this._detectFileType(file);
      if (!OfficeAdapter.isSupported(fileType)) {
        throw new PreviewError('不支持的文件格式', 'unsupported_format');
      }

      // 根据文件类型选择预览器
      this._previewer = this._createPreviewer(fileType);

      // 解析文件
      await this._previewer.parse(file, options);

      this._eventType = fileType;
      this._emit('load', { file, fileType });

    } catch (error) {
      this._handleError(error);
      throw error;
    }
  }

  /**
   * 渲染到指定容器
   * @param {HTMLElement} container - DOM容器
   * @param {Object} options - 渲染选项
   */
  render(container, options = {}) {
    if (!this._previewer) {
      throw new PreviewError('请先加载文件', 'not_loaded');
    }
    this._previewer.render(container, options);
  }

  /**
   * 页面导航（PPTX专用）
   * @param {number} pageNum - 页码
   */
  goToPage(pageNum) {
    if (!this._previewer) return;
    if (typeof this._previewer.goToPage === 'function') {
      this._previewer.goToPage(pageNum);
      this._emit('pageChange', { pageNum });
    }
  }

  /**
   * 下一页（PPTX专用）
   */
  nextPage() {
    if (!this._previewer) return;
    if (typeof this._previewer.nextPage === 'function') {
      this._previewer.nextPage();
      const pageNum = this._previewer.getCurrentPage ? this._previewer.getCurrentPage() : null;
      this._emit('pageChange', { pageNum });
    }
  }

  /**
   * 上一页（PPTX专用）
   */
  prevPage() {
    if (!this._previewer) return;
    if (typeof this._previewer.prevPage === 'function') {
      this._previewer.prevPage();
      const pageNum = this._previewer.getCurrentPage ? this._previewer.getCurrentPage() : null;
      this._emit('pageChange', { pageNum });
    }
  }

  /**
   * 设置缩放级别
   * @param {number} zoomLevel - 缩放级别（0.5-3.0）
   */
  setZoom(zoomLevel) {
    if (!this._previewer) return;
    if (typeof this._previewer.setZoom === 'function') {
      this._previewer.setZoom(zoomLevel);
      this._emit('zoomChange', { zoomLevel });
    }
  }

  /**
   * 获取当前缩放级别
   * @returns {number}
   */
  getZoom() {
    if (!this._previewer) return 1.0;
    if (typeof this._previewer.getZoom === 'function') {
      return this._previewer.getZoom();
    }
    return 1.0;
  }

  /**
   * 切换工作表（XLSX专用）
   * @param {number} sheetIndex - 工作表索引
   */
  switchSheet(sheetIndex) {
    if (!this._previewer) return;
    if (typeof this._previewer.switchSheet === 'function') {
      this._previewer.switchSheet(sheetIndex);
      this._emit('sheetChange', { sheetIndex });
    }
  }

  /**
   * 获取文件信息
   * @returns {Object}
   */
  getFileInfo() {
    if (!this._previewer) {
      throw new PreviewError('请先加载文件', 'not_loaded');
    }
    const info = this._previewer.getFileInfo ? this._previewer.getFileInfo() : {};
    return {
      fileType: this._eventType,
      ...info
    };
  }

  /**
   * 销毁实例
   */
  destroy() {
    if (this._previewer && typeof this._previewer.destroy === 'function') {
      this._previewer.destroy();
    }
    this._previewer = null;
    this._eventType = null;
    this._listeners.clear();
    this._emit('destroy');
  }

  /**
   * 添加事件监听器
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(callback);
  }

  /**
   * 移除事件监听器
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  off(event, callback) {
    if (!this._listeners.has(event)) return;
    const callbacks = this._listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * 检测文件类型
   * @private
   */
  _detectFileType(file) {
    const fileName = file.name;
    const ext = fileName.split('.').pop().toLowerCase();
    return ext;
  }

  /**
   * 创建对应格式的预览器
   * @private
   */
  _createPreviewer(fileType) {
    switch (fileType) {
      case 'doc':
      case 'docx':
        return new DocxPreviewer();
      case 'xls':
      case 'xlsx':
      case 'csv':
        return new XlsxPreviewer();
      case 'ppt':
      case 'pptx':
        return new PptxPreviewer();
      default:
        throw new PreviewError(`不支持的文件类型: ${fileType}`, 'unsupported_format');
    }
  }

  /**
   * 错误处理
   * @private
   */
  _handleError(error) {
    this._emit('error', { error });
  }

  /**
   * 触发事件
   * @private
   */
  _emit(event, data = {}) {
    if (!this._listeners.has(event)) return;
    const callbacks = this._listeners.get(event);
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (err) {
        console.error(`Event listener error for "${event}":`, err);
      }
    });
  }
}

// 支持的事件类型
OfficeAdapter.EVENTS = {
  LOAD: 'load',
  ERROR: 'error',
  PAGE_CHANGE: 'pageChange',
  ZOOM_CHANGE: 'zoomChange',
  SHEET_CHANGE: 'sheetChange',
  DESTROY: 'destroy'
};

export default OfficeAdapter;
