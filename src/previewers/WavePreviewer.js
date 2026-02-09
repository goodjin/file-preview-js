/**
 * Wave音频预览器
 * 支持wav格式预览
 * 
 * @description 扩展AudioPreviewer以支持WAV格式
 * @module WavePreviewer
 * @version 1.0.0
 */

import { AudioPreviewer } from './AudioPreviewer.js';

/**
 * Wave音频预览器类
 * @class WavePreviewer
 */
export class WavePreviewer extends AudioPreviewer {
  /**
   * 创建Wave音频预览器实例
   * @param {Object} options - 预览器选项
   */
  constructor(options = {}) {
    super(options);
  }

  /**
   * 加载WAV音频文件
   * @param {File} file - 文件对象
   * @returns {Promise<Object>} 加载结果
   */
  async load(file) {
    const result = await super.load(file);
    return {
      ...result,
      format: 'WAV Audio',
      encoding: 'PCM',
      sampleRate: '44100Hz' // 模拟数据
    };
  }
}