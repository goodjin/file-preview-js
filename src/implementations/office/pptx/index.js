/**
 * PPTX子模块主入口
 * 集成Parser和Renderer，提供统一接口
 */

import PptxParser from './PptxParser.js';
import PptxRenderer from './PptxRenderer.js';

class PptxModule {
  constructor() {
    this.parser = new PptxParser();
    this.renderer = new PptxRenderer();
    this.fileInfo = null;
    this.isLoaded = false;
    this.eventCallbacks = {};
  }

  /**
   * 解析PPTX文件
   * @param {File|ArrayBuffer} file - PPTX文件
   * @param {Object} options - 解析选项
   * @returns {Promise<Object>} 解析结果
   */
  async parse(file, options = {}) {
    try {
      const result = await this.parser.parse(file, options);
      this.fileInfo = result;
      this.isLoaded = true;
      this._trigger('load', result);
      return result;
    } catch (error) {
      this._trigger('error', error);
      throw error;
    }
  }

  /**
   * 渲染到指定容器
   * @param {HTMLElement} container - 目标容器
   * @param {Object} options - 渲染选项
   */
  render(container, options = {}) {
    if (!this.isLoaded) {
      throw new Error('请先解析PPTX文件');
    }

    this.renderer.init(this.fileInfo, {
      initialSlide: options.initialSlide || 1,
      zoom: options.zoom || 1,
      onPageChange: (pageNum) => {
        this._trigger('pageChange', { pageNum, total: this.fileInfo.totalSlides });
        if (options.onPageChange) options.onPageChange(pageNum);
      },
      onZoomChange: (zoomLevel) => {
        this._trigger('zoomChange', { zoomLevel });
        if (options.onZoomChange) options.onZoomChange(zoomLevel);
      }
    });

    this.renderer.render(container);
  }

  /**
   * 跳转到指定幻灯片
   * @param {number} pageNum - 页码（从1开始）
   */
  goToPage(pageNum) {
    if (!this.isLoaded) {
      throw new Error('请先加载PPTX文件');
    }
    this.renderer.goToPage(pageNum);
  }

  /**
   * 下一张幻灯片
   */
  nextPage() {
    if (!this.isLoaded) {
      throw new Error('请先加载PPTX文件');
    }
    this.renderer.nextPage();
  }

  /**
   * 上一张幻灯片
   */
  prevPage() {
    if (!this.isLoaded) {
      throw new Error('请先加载PPTX文件');
    }
    this.renderer.prevPage();
  }

  /**
   * 设置缩放级别
   * @param {number} zoomLevel - 缩放级别（0.1-3.0）
   */
  setZoom(zoomLevel) {
    this.renderer.setZoom(zoomLevel);
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
    if (!this.isLoaded) {
      return null;
    }

    return {
      fileName: this.fileInfo.docProps.title || '未命名PPT',
      fileSize: 0, // 需要在外部传入
      fileType: 'pptx',
      pageCount: this.fileInfo.totalSlides,
      author: this.fileInfo.docProps.author || '',
      createdDate: this.fileInfo.docProps.created || ''
    };
  }

  /**
   * 销毁实例，清理资源
   */
  destroy() {
    this.renderer.destroy();
    this.parser.destroy();
    this.fileInfo = null;
    this.isLoaded = false;
    this.eventCallbacks = {};
  }

  /**
   * 注册事件监听
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  on(event, callback) {
    if (!this.eventCallbacks[event]) {
      this.eventCallbacks[event] = [];
    }
    this.eventCallbacks[event].push(callback);
  }

  /**
   * 移除事件监听
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  off(event, callback) {
    if (!this.eventCallbacks[event]) return;
    
    const index = this.eventCallbacks[event].indexOf(callback);
    if (index > -1) {
      this.eventCallbacks[event].splice(index, 1);
    }
  }

  /**
   * 触发事件
   * @private
   */
  _trigger(event, data) {
    if (!this.eventCallbacks[event]) return;
    
    this.eventCallbacks[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`PPTX模块事件回调出错 [${event}]:`, error);
      }
    });
  }

  /**
   * 获取支持的文件类型
   */
  static getSupportedTypes() {
    return ['pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
  }

  /**
   * 检测文件类型
   */
  static isSupported(fileType) {
    const supportedTypes = this.getSupportedTypes();
    return supportedTypes.includes(fileType.toLowerCase());
  }
}

// 创建并导出单例实例
const pptxInstance = new PptxModule();

// 同时导出类和实例
export default pptxInstance;
export { PptxModule };
