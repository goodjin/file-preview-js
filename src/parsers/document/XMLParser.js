/**
 * XML解析器
 * 支持 .xml 格式
 */
import { BaseParser } from '../BaseParser.js';

export class XMLParser extends BaseParser {
  /**
   * 解析XML文件
   * @param {ArrayBuffer} fileData - 文件二进制数据
   * @returns {Promise<Object>} 解析结果
   */
  async parse(fileData) {
    const decoder = new TextDecoder('utf-8');
    const xmlText = decoder.decode(fileData);
    
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      
      const parseError = xmlDoc.getElementsByTagName('parsererror');
      if (parseError.length > 0) {
        throw new Error('XML解析错误');
      }
      
      const structure = this.analyzeStructure(xmlDoc);
      
      return {
        type: 'xml',
        content: xmlText,
        rootElement: structure.rootElement,
        elementCount: structure.elementCount,
        maxDepth: structure.maxDepth,
        metadata: {
          charset: 'UTF-8',
          declaration: this.getDeclaration(xmlText),
          hasDoctype: xmlText.includes('<!DOCTYPE')
        }
      };
    } catch (error) {
      throw new Error(`XML解析失败: ${error.message}`);
    }
  }

  /**
   * 分析XML结构
   * @param {Document} xmlDoc - XML文档对象
   * @returns {Object} 结构信息
   */
  analyzeStructure(xmlDoc) {
    let elementCount = 0;
    let maxDepth = 0;
    
    const traverse = (node, depth) => {
      if (node.nodeType === 1) { // Element node
        elementCount++;
        maxDepth = Math.max(maxDepth, depth);
        
        for (const child of node.childNodes) {
          traverse(child, depth + 1);
        }
      }
    };
    
    traverse(xmlDoc.documentElement, 1);
    
    return {
      rootElement: xmlDoc.documentElement.tagName,
      elementCount,
      maxDepth
    };
  }

  /**
   * 获取XML声明
   * @param {string} xmlText - XML文本
   * @returns {string|null} XML声明
   */
  getDeclaration(xmlText) {
    const match = xmlText.match(/^<\?xml[^>]*\?>\s*/);
    return match ? match[0].trim() : null;
  }

  /**
   * 验证XML文件
   * @param {ArrayBuffer} fileData - 文件二进制数据
   * @returns {boolean} 是否有效
   */
  validate(fileData) {
    try {
      const decoder = new TextDecoder('utf-8');
      const xmlText = decoder.decode(fileData);
      
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      
      const parseError = xmlDoc.getElementsByTagName('parsererror');
      return parseError.length === 0;
    } catch {
      return false;
    }
  }

  /**
   * 获取XML文件元数据
   * @param {ArrayBuffer} fileData - 文件二进制数据
   * @returns {Object} 元数据
   */
  getMetadata(fileData) {
    try {
      const decoder = new TextDecoder('utf-8');
      const xmlText = decoder.decode(fileData);
      
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      
      const structure = this.analyzeStructure(xmlDoc);
      
      return {
        type: 'xml',
        charset: 'UTF-8',
        size: fileData.byteLength,
        rootElement: structure.rootElement,
        elementCount: structure.elementCount,
        hasDoctype: xmlText.includes('<!DOCTYPE')
      };
    } catch {
      return {
        type: 'xml',
        charset: 'UTF-8',
        size: fileData.byteLength,
        valid: false
      };
    }
  }
}
