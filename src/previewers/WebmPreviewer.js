/**
 * WebM视频预览器
 * 支持webm格式预览
 * 
 * @description 扩展VideoPreviewer以支持WebM格式
 * @module WebmPreviewer
 * @version 1.0.0
 */

import { VideoPreviewer } from './VideoPreviewer.js';

/**
 * WebM视频预览器类
 * @class WebmPreviewer
 */
export class WebmPreviewer extends VideoPreviewer {
  /**
   * 创建WebM视频预览器实例
   * @param {Object} options - 预览器选项
   */
  constructor(options = {}) {
    super(options);
  }

  /**
   * 加载WebM视频文件
   * @param {File} file - 文件对象
   * @returns {Promise<Object>} 加载结果
   */
  async load(file) {
    const result = await super.load(file);
    return {
      ...result,
      format: 'WebM Video',
      codec: 'VP8/VP9/Opus' // 模拟数据
    };
  }
}