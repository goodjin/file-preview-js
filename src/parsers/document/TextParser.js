/**
 * 文本解析器
 * 支持 .txt 格式
 */
import { BaseParser } from '../BaseParser.js';

export class TextParser extends BaseParser {
  /**
   * 解析文本文件
   * @param {ArrayBuffer} fileData - 文件二进制数据
   * @returns {Promise<Object>} 解析结果
   */
  async parse(fileData) {
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(fileData);
    
    return {
      type: 'text',
      content: text,
      metadata: {
        charset: 'UTF-8',
        lineCount: text.split('\n').length,
        charCount: text.length
      }
    };
  }

  /**
   * 验证文本文件
   * @param {ArrayBuffer} fileData - 文件二进制数据
   * @returns {boolean} 是否有效
   */
  validate(fileData) {
    // 文本文件没有固定的Magic Number，直接返回true
    return true;
  }

  /**
   * 获取文本文件元数据
   * @param {ArrayBuffer} fileData - 文件二进制数据
   * @returns {Object} 元数据
   */
  getMetadata(fileData) {
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(fileData);
    
    return {
      type: 'text',
      charset: 'UTF-8',
      size: fileData.byteLength,
      lineCount: text.split('\n').length,
      charCount: text.length,
      hasNonAscii: /[^\x00-\x7F]/.test(text)
    };
  }
}
