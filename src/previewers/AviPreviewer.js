/**
 * AVI视频预览器
 * 支持avi格式预览
 * 
 * @description 扩展VideoPreviewer以支持AVI格式
 * @module AviPreviewer
 * @version 1.0.0
 */

import { VideoPreviewer } from './VideoPreviewer.js';

/**
 * AVI视频预览器类
 * @class AviPreviewer
 */
export class AviPreviewer extends VideoPreviewer {
  /**
   * 创建AVI视频预览器实例
   * @param {Object} options - 预览器选项
   */
  constructor(options = {}) {
    super(options);
  }

  /**
   * 加载AVI视频文件
   * @param {File} file - 文件对象
   * @returns {Promise<Object>} 加载结果
   */
  async load(file) {
    const result = await super.load(file);
    return {
      ...result,
      format: 'Audio Video Interleave',
      codec: 'Various' // 模拟数据
    };
  }
}