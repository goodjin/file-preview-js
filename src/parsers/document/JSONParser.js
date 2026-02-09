/**
 * JSON解析器
 * 支持 .json 格式
 */
import { BaseParser } from '../BaseParser.js';

export class JSONParser extends BaseParser {
  /**
   * 解析JSON文件
   * @param {ArrayBuffer} fileData - 文件二进制数据
   * @returns {Promise<Object>} 解析结果
   */
  async parse(fileData) {
    const decoder = new TextDecoder('utf-8');
    const jsonText = decoder.decode(fileData);
    
    try {
      const data = JSON.parse(jsonText);
      const structure = this.analyzeStructure(data);
      
      return {
        type: 'json',
        content: data,
        formatted: JSON.stringify(data, null, 2),
        structure: structure,
        metadata: {
          charset: 'UTF-8',
          dataType: Array.isArray(data) ? 'array' : typeof data,
          keysCount: structure.keysCount,
          arrayCount: structure.arrayCount,
          objectCount: structure.objectCount
        }
      };
    } catch (error) {
      throw new Error(`JSON解析失败: ${error.message}`);
    }
  }

  /**
   * 分析JSON结构
   * @param {any} data - JSON数据
   * @returns {Object} 结构信息
   */
  analyzeStructure(data) {
    let keysCount = 0;
    let arrayCount = 0;
    let objectCount = 0;
    let maxDepth = 0;
    
    const traverse = (obj, depth) => {
      maxDepth = Math.max(maxDepth, depth);
      
      if (Array.isArray(obj)) {
        arrayCount++;
        obj.forEach(item => traverse(item, depth + 1));
      } else if (typeof obj === 'object' && obj !== null) {
        objectCount++;
        keysCount += Object.keys(obj).length;
        Object.values(obj).forEach(value => traverse(value, depth + 1));
      }
    };
    
    traverse(data, 1);
    
    return {
      keysCount,
      arrayCount,
      objectCount,
      maxDepth
    };
  }

  /**
   * 验证JSON文件
   * @param {ArrayBuffer} fileData - 文件二进制数据
   * @returns {boolean} 是否有效
   */
  validate(fileData) {
    try {
      const decoder = new TextDecoder('utf-8');
      const jsonText = decoder.decode(fileData);
      JSON.parse(jsonText);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取JSON文件元数据
   * @param {ArrayBuffer} fileData - 文件二进制数据
   * @returns {Object} 元数据
   */
  getMetadata(fileData) {
    try {
      const decoder = new TextDecoder('utf-8');
      const jsonText = decoder.decode(fileData);
      const data = JSON.parse(jsonText);
      const structure = this.analyzeStructure(data);
      
      return {
        type: 'json',
        charset: 'UTF-8',
        size: fileData.byteLength,
        dataType: Array.isArray(data) ? 'array' : typeof data,
        keysCount: structure.keysCount,
        arrayCount: structure.arrayCount,
        objectCount: structure.objectCount,
        maxDepth: structure.maxDepth
      };
    } catch {
      return {
        type: 'json',
        charset: 'UTF-8',
        size: fileData.byteLength,
        valid: false
      };
    }
  }
}
