/**
 * Mkv视频预览器
 * 支持mkv格式预览
 * 
 * @description 扩展VideoPreviewer以支持MKV格式
 * @module MkvPreviewer
 * @version 1.0.0
 */

import { VideoPreviewer } from './VideoPreviewer.js';

/**
 * MKV视频预览器类
 * @class MkvPreviewer
 */
export class MkvPreviewer extends VideoPreviewer {
  /**
   * 创建MKV视频预览器实例
   * @param {Object} options - 预览器选项
   */
  constructor(options = {}) {
    super(options);
  }

  /**
   * 加载MKV视频文件
   * @param {File} file - 文件对象
   * @returns {Promise<Object>} 加载结果
   */
  async load(file) {
    const result = await super.load(file);
    return {
      ...result,
      format: 'Matroska Video',
      codec: 'H.264/HE-AAC' // 模拟数据
    };
  }
}