/**
 * Jar压缩包预览器
 * 支持jar格式预览（Java Archive）
 * 
 * @description 扩展ArchivePreviewer以支持JAR格式
 * @module JarPreviewer
 * @version 1.0.0
 */

import { ArchivePreviewer } from './ArchivePreviewer.js';

/**
 * JAR压缩包预览器类
 * @class JarPreviewer
 */
export class JarPreviewer extends ArchivePreviewer {
  /**
   * 创建JAR压缩包预览器实例
   * @param {Object} options - 预览器选项
   */
  constructor(options = {}) {
    super(options);
  }

  /**
   * 加载JAR压缩包文件
   * @param {File} file - 文件对象
   * @returns {Promise<Object>} 加载结果
   */
  async load(file) {
    const result = await super.load(file);
    return {
      ...result,
      format: 'Java Archive (JAR)',
      compression: 'ZIP' // 模拟数据
    };
  }
}