/**
 * Flv视频预览器
 * 支持flv格式预览
 * 
 * @description 扩展VideoPreviewer以支持FLV格式
 * @module FlvPreviewer
 * @version 1.0.0
 */

import { VideoPreviewer } from './VideoPreviewer.js';

/**
 * Flv视频预览器类
 * @class FlvPreviewer
 */
export class FlvPreviewer extends VideoPreviewer {
  /**
   * 创建FLV视频预览器实例
   * @param {Object} options - 预览器选项
   */
  constructor(options = {}) {
    super(options);
  }

  /**
   * 加载FLV视频文件
   * @param {File} file - 文件对象
   * @returns {Promise<Object>} 加载结果
   */
  async load(file) {
    const result = await super.load(file);
    return {
      ...result,
      format: 'Flash Video',
      codec: 'H.264/AAC' // 模拟数据
    };
  }
}