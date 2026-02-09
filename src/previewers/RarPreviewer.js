/**
 * Rar压缩包预览器
 * 支持rar格式预览
 * 
 * @description 扩展ArchivePreviewer以支持RAR格式
 * @module RarPreviewer
 * @version 1.0.0
 */

import { ArchivePreviewer } from './ArchivePreviewer.js';

/**
 * RAR压缩包预览器类
 * @class RarPreviewer
 */
export class RarPreviewer extends ArchivePreviewer {
  /**
   * 创建RAR压缩包预览器实例
   * @param {Object} options - 预览器选项
   */
  constructor(options = {}) {
    super(options);
  }

  /**
   * 加载RAR压缩包文件
   * @param {File} file - 文件对象
   * @returns {Promise<Object>} 加载结果
   */
  async load(file) {
    const result = await super.load(file);
    return {
      ...result,
      format: 'RAR Archive',
      compression: 'RAR' // 模拟数据
    };
  }
}