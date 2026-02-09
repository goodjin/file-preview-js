/**
 * BMP图片预览器
 * 支持bmp格式预览
 * 
 * @description 扩展ImagePreviewer以支持BMP格式
 * @module BmpPreviewer
 * @version 1.0.0
 */

import { ImagePreviewer } from './ImagePreviewer.js';

/**
 * BMP图片预览器类
 * @class BmpPreviewer
 */
export class BmpPreviewer extends ImagePreviewer {
  /**
   * 创建BMP图片预览器实例
   * @param {Object} options - 预览器选项
   */
  constructor(options = {}) {
    super(options);
  }

  /**
   * 加载BMP图片
   * @param {File} file - 文件对象
   * @returns {Promise<Object>} 加载结果
   */
  async load(file) {
    const result = await super.load(file);
    return {
      ...result,
      type: 'bmp',
      format: 'Bitmap Image'
    };
  }
}