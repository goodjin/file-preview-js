/**
 * TIF图片预览器
 * 支持tif/tiff格式预览
 * 
 * @description 扩展ImagePreviewer以支持TIF格式
 * @module TifPreviewer
 * @version 1.0.0
 */

import { ImagePreviewer } from './ImagePreviewer.js';

/**
 * TIF图片预览器类
 * @class TifPreviewer
 */
export class TifPreviewer extends ImagePreviewer {
  /**
   * 创建TIF图片预览器实例
   * @param {Object} options - 预览器选项
   */
  constructor(options = {}) {
    super(options);
  }

  /**
   * 加载TIF图片
   * @param {File} file - 文件对象
   * @returns {Promise<Object>} 加载结果
   */
  async load(file) {
    const result = await super.load(file);
    return {
      ...result,
      type: 'tif',
      format: 'Tagged Image File Format'
    };
  }
}