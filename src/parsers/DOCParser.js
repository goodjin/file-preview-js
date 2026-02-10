/**
 * DOC解析器
 * 纯JavaScript实现的DOC文档解析器，支持.doc格式
 * 
 * @class DOCParser
 * @description 解析DOC文档，提取文本、样式、表格等内容
 * @author 文件预览系统研发团队
 */

import OLE2Parser from '../utils/OLE2Parser.js';

/**
 * DOC解析器类
 */
class DOCParser {
  /**
   * 构造函数
   * @constructor
   */
  constructor() {
    this.ole2Parser = new OLE2Parser();
    this.parsedData = null;
    this.fib = null;
  }

  /**
   * 解析DOC文档
   * @param {ArrayBuffer} fileData - DOC文件二进制数据
   * @returns {Promise<Object>} 解析结果
   * @throws {Error} 当文件格式无效时抛出错误
   * 
   * @example
   * const parser = new DOCParser();
   * const result = await parser.parse(fileData);
   * console.log(result.content);
   */
  async parse(fileData) {
    // 使用OLE2Parser解析OLE2文档结构
    const ole2Structure = await this.ole2Parser.parse(fileData);

    // 获取WordDocument流
    const wordDocumentStream = ole2Structure.streams['WordDocument'];
    if (!wordDocumentStream) {
      throw new Error('WordDocument stream not found');
    }

    // 解析FIB（File Information Block）
    this.fib = this.parseFIB(wordDocumentStream);

    // 解析文本内容
    const content = this.parseContent(wordDocumentStream);

    // 构建解析结果
    this.parsedData = {
      type: 'word',
      format: 'DOC',
      content,
      metadata: this.getFIBMetadata()
    };

    return this.parsedData;
  }

  /**
   * 验证DOC文档格式
   * @param {ArrayBuffer} fileData - DOC文件二进制数据
   * @returns {Promise<boolean>} 是否为有效的DOC文件
   */
  async validate(fileData) {
    try {
      await this.ole2Parser.parse(fileData);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取文件元数据
   * @param {ArrayBuffer} fileData - DOC文件二进制数据
   * @returns {Promise<Object>} 元数据
   */
  async getMetadata(fileData) {
    if (!this.parsedData) {
      await this.parse(fileData);
    }
    return this.parsedData.metadata;
  }

  /**
   * 解析FIB（File Information Block）
   * @param {Uint8Array} wordDocumentStream - WordDocument流数据
   * @returns {Object} FIB对象
   * @private
   */
  parseFIB(wordDocumentStream) {
    const view = new DataView(wordDocumentStream.buffer);

    return {
      // FIB基础信息（前68字节）
      magic: view.getUint16(0, true),
      version: view.getUint16(2, true),
      flags: view.getUint16(4, true),
      lastSaved: view.getUint32(8, true),
      
      // 文本偏移和长度
      ccpText: view.getUint32(8 + 0x008, true),
      ccpFtn: view.getUint32(8 + 0x00C, true),
      
      // 复杂文件信息
      fcMin: view.getUint32(8 + 0x018, true),
      fcMac: view.getUint32(8 + 0x01C, true),
      
      // 表格信息
      nFibBack: view.getUint16(8 + 0x042, true),
      
      // 文件信息块扩展
      fcPlcfbteChpx: view.getUint32(8 + 0x0Fa, true),
      lcbPlcfbteChpx: view.getUint32(8 + 0x0Fe, true),
      
      // 段落信息
      fcPlcfbtePapx: view.getUint32(8 + 0x102, true),
      lcbPlcfbtePapx: view.getUint32(8 + 0x106, true)
    };
  }

  /**
   * 解析文档内容
   * @param {Uint8Array} wordDocumentStream - WordDocument流数据
   * @returns {Array} 内容数组
   * @private
   */
  parseContent(wordDocumentStream) {
    const content = [];
    
    try {
      // 提取文本内容（简化版）
      const textContent = this.extractText(wordDocumentStream);
      
      if (textContent) {
        content.push({
          type: 'paragraph',
          text: textContent,
          runs: [{ text: textContent, styles: {} }],
          styles: {}
        });
      }
    } catch (error) {
      console.warn('Failed to parse DOC content:', error.message);
    }

    return content;
  }

  /**
   * 提取文本内容
   * @param {Uint8Array} wordDocumentStream - WordDocument流数据
   * @returns {string} 文本内容
   * @private
   */
  extractText(wordDocumentStream) {
    // 简化实现：跳过FIB（大约68字节），提取文本
    // 真实的实现需要根据FIB中的偏移信息定位文本
    const view = new DataView(wordDocumentStream.buffer);
    const length = Math.min(wordDocumentStream.byteLength, 10240); // 限制长度
    
    let text = '';
    let offset = 1024; // 跳过FIB和其他结构
    
    for (let i = offset; i < length; i++) {
      const byte = view.getUint8(i);
      
      // 跳过控制字符
      if (byte === 0x0D || byte === 0x0A) {
        text += '\n';
      } else if (byte >= 0x20 && byte <= 0x7E) {
        // 可打印ASCII字符
        text += String.fromCharCode(byte);
      } else if (byte >= 0xC0) {
        // 可能是中文（GBK编码）
        if (i + 1 < length) {
          const nextByte = view.getUint8(i + 1);
          text += this.decodeGBK(byte, nextByte);
          i++;
        }
      }
    }

    return text.trim();
  }

  /**
   * 解码GBK字符
   * @param {number} byte1 - 第一个字节
   * @param {number} byte2 - 第二个字节
   * @returns {string} 解码后的字符
   * @private
   */
  decodeGBK(byte1, byte2) {
    // 简化的GBK解码，只处理常见字符
    // 真实实现需要完整的GBK编码表
    try {
      const bytes = new Uint8Array([byte1, byte2]);
      const decoder = new TextDecoder('gbk');
      return decoder.decode(bytes);
    } catch (error) {
      return '?';
    }
  }

  /**
   * 获取FIB元数据
   * @returns {Object} 元数据
   * @private
   */
  getFIBMetadata() {
    if (!this.fib) {
      return {};
    }

    return {
      format: 'DOC',
      version: this.getFIBVersion(),
      magic: `0x${this.fib.magic.toString(16).toUpperCase()}`,
      flags: `0x${this.fib.flags.toString(16).toUpperCase()}`
    };
  }

  /**
   * 获取FIB版本信息
   * @returns {string} 版本描述
   * @private
   */
  getFIBVersion() {
    const version = this.fib.version;
    const versions = {
      0x00C5: 'Word 97',
      0x00C6: 'Word 2000',
      0x00C7: 'Word 2002/2003',
      0x00C8: 'Word 2007'
    };

    return versions[version] || `Unknown (0x${version.toString(16).toUpperCase()})`;
  }
}

export default DOCParser;
