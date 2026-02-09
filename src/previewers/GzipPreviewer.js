/**
 * Gzip压缩包预览器
 * 支持gzip格式预览
 * 
 * @description 扩展ArchivePreviewer以支持GZIP格式
 * @module GzipPreviewer
 * @version 1.0.0
 */

import { ArchivePreviewer } from './ArchivePreviewer.js';

/**
 * GZIP压缩包预览器类
 * @class GzipPreviewer
 */
export class GzipPreviewer extends ArchivePreviewer {
  /**
   * 创建GZIP压缩包预览器实例
   * @param {Object} options - 预览器选项
   */
  constructor(options = {}) {
    super(options);
  }

  /**
   * 加载GZIP压缩包文件
   * @param {File} file - 文件对象
   * @returns {Promise<Object>} 加载结果
   */
  async load(file) {
    const result = await super.load(file);
    return {
      ...result,
      format: 'GZIP Compressed Archive',
      compression: 'GZIP' // 模拟数据
    };
  }
}