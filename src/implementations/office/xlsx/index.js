/**
 * xlsx子模块主入口
 * 集成Parser和Renderer，提供统一的xlsx预览接口
 */

import { XlsxParser } from './XlsxParser.js';
import { XlsxRenderer } from './XlsxRenderer.js';

export class XlsxModule {
  constructor() {
    this.parser = new XlsxParser();
    this.renderer = new XlsxRenderer();
    this.parseResult = null;
    this.isLoaded = false;
  }

  /**
   * 加载xlsx文件
   * @param {File|ArrayBuffer} file - xlsx文件
   * @returns {Promise<void>}
   */
  async load(file) {
    try {
      this.parseResult = await this.parser.parse(file);
      this.renderer.init(this.parseResult);
      this.isLoaded = true;
    } catch (error) {
      this.isLoaded = false;
      throw error;
    }
  }

  /**
   * 渲染到容器
   * @param {HTMLElement} container - DOM容器
   */
  render(container) {
    if (!this.isLoaded) {
      throw new Error('请先加载xlsx文件');
    }
    this.renderer.render(container);
  }

  /**
   * 切换工作表
   * @param {number} sheetIndex - 工作表索引
   */
  switchSheet(sheetIndex) {
    if (!this.isLoaded) {
      throw new Error('请先加载xlsx文件');
    }
    this.renderer.switchSheet(sheetIndex);
  }

  /**
   * 获取当前工作表索引
   * @returns {number}
   */
  getCurrentSheetIndex() {
    if (!this.isLoaded) {
      return 0;
    }
    return this.renderer.getCurrentSheetIndex();
  }

  /**
   * 获取工作表数量
   * @returns {number}
   */
  getSheetCount() {
    if (!this.isLoaded) {
      return 0;
    }
    return this.renderer.getSheetCount();
  }

  /**
   * 获取文件信息
   * @returns {Object}
   */
  getFileInfo() {
    if (!this.isLoaded) {
      return null;
    }
    return {
      sheetCount: this.parseResult.sheetCount,
      currentSheet: this.parseResult.currentSheetIndex
    };
  }

  /**
   * 销毁实例，释放资源
   */
  destroy() {
    this.parser.destroy();
    this.renderer.destroy();
    this.parseResult = null;
    this.isLoaded = false;
  }
}

// 导出默认实例
export default new XlsxModule();
