/**
 * WebP图片预览器
 * 支持webp格式预览
 * 
 * @description 扩展ImagePreviewer以支持WebP格式
 * @module WebpPreviewer
 * @version 1.0.0
 */

import { ImagePreviewer } from './ImagePreviewer.js';

/**
 * WebP图片预览器类
 * @class WebpPreviewer
 */
export class WebpPreviewer extends ImagePreviewer {
  /**
   * 创建WebP图片预览器实例
   * @param {Object} options - 预览器选项
   */
  constructor(options = {}) {
    super(options);
  }

  /**
   * 加载WebP图片
   * @param {File} file - 文件对象
   * @returns {Promise<Object>} 加载结果
   */
  async load(file) {
    const result = await super.load(file);
    return {
      ...result,
      type: 'webp',
      format: 'WebP Image'
    };
  }
}