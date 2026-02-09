/**
 * PDF对象解析工具类
 * 提供PDF文件结构解析、对象解析、交叉引用表解析等功能
 */
import { BinaryUtils } from './BinaryUtils.js';

/**
 * 自定义解析错误类
 */
export class ParserError extends Error {
  constructor(message, errorCode) {
    super(message);
    this.name = 'ParserError';
    this.errorCode = errorCode;
  }
}

/**
 * PDF对象类型枚举
 */
export const PDFObjectType = {
  NULL: 'null',
  BOOLEAN: 'boolean',
  NUMBER: 'number',
  STRING: 'string',
  NAME: 'name',
  ARRAY: 'array',
  DICTIONARY: 'dictionary',
  STREAM: 'stream',
  INDIRECT_REFERENCE: 'reference'
};

/**
 * PDF工具类
 */
export class PDFUtils {
  /**
   * 验证PDF文件
   * @param {ArrayBuffer} buffer - PDF文件数据
   * @returns {boolean} 是否为有效PDF
   */
  static validatePDF(buffer) {
    const signature = BinaryUtils.readString(buffer, 0, 4);
    return signature === '%PDF';
  }

  /**
   * 查找PDF版本号
   * @param {ArrayBuffer} buffer - PDF文件数据
   * @returns {string} PDF版本号（如 '1.4'）
   */
  static getPDFVersion(buffer) {
    const bytes = new Uint8Array(buffer);
    const text = BinaryUtils.readString(buffer, 0, Math.min(1024, buffer.byteLength));
    const match = text.match(/%PDF-(\d+\.\d+)/);
    return match ? match[1] : '1.4';
  }

  /**
   * 查找文件起始位置（%%EOF标记之前）
   * @param {ArrayBuffer} buffer - PDF文件数据
   * @returns {number} 文件起始位置的偏移量
   */
  static findFileStart(buffer) {
    const text = BinaryUtils.readString(buffer, buffer.byteLength - 1024, 1024);
    const match = text.match(/startxref\s+(\d+)/s);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * 查找xref表的起始位置
   * @param {ArrayBuffer} buffer - PDF文件数据
   * @returns {number} xref起始位置
   */
  static findXRefPosition(buffer) {
    const text = BinaryUtils.readString(buffer, buffer.byteLength - 1024, 1024);
    const match = text.match(/xref\s+(\d+)/s);
    if (match) {
      return buffer.byteLength - 1024 + text.indexOf('xref');
    }
    throw new ParserError('找不到xref表', 'XREF_NOT_FOUND');
  }

  /**
   * 解析xref表
   * @param {ArrayBuffer} buffer - PDF文件数据
   * @param {number} xrefOffset - xref表偏移量
   * @returns {Object} xref表对象
   */
  static parseXRef(buffer, xrefOffset) {
    const text = BinaryUtils.readString(buffer, xrefOffset, Math.min(1024, buffer.byteLength - xrefOffset));
    const lines = text.split('\n');
    
    const xref = {};
    let currentObj = 0;
    let count = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 解析对象数量
      if (line.match(/^\d+\s+\d+$/)) {
        const parts = line.split(/\s+/);
        currentObj = parseInt(parts[0], 10);
        count = parseInt(parts[1], 10);
        continue;
      }

      // 解析xref条目（每行20个字符）
      if (line.length >= 18 && currentObj < count) {
        const offset = parseInt(line.substring(0, 10), 10);
        const generation = parseInt(line.substring(11, 16), 10);
        const status = line.charAt(17);
        
        xref[currentObj] = { offset, generation, status };
        currentObj++;
      }
    }

    return xref;
  }

  /**
   * 解析trailer字典
   * @param {ArrayBuffer} buffer - PDF文件数据
   * @returns {Object} trailer字典
   */
  static parseTrailer(buffer) {
    const text = BinaryUtils.readString(buffer, buffer.byteLength - 2048, 2048);
    const match = text.match(/trailer\s*<<(.+?)>>/s);
    
    if (!match) {
      throw new ParserError('找不到trailer', 'TRAILER_NOT_FOUND');
    }

    return this.parseDictionary(match[1]);
  }

  /**
   * 解析PDF对象
   * @param {string} text - PDF对象文本
   * @returns {Object} 解析后的对象
   */
  static parseObject(text) {
    text = text.trim();

    // null对象
    if (text === 'null') {
      return { type: PDFObjectType.NULL, value: null };
    }

    // 布尔值
    if (text === 'true' || text === 'false') {
      return { type: PDFObjectType.BOOLEAN, value: text === 'true' };
    }

    // 数字
    if (/^-?\d+(\.\d+)?$/.test(text)) {
      const value = text.includes('.') ? parseFloat(text) : parseInt(text, 10);
      return { type: PDFObjectType.NUMBER, value };
    }

    // 间接引用
    const refMatch = text.match(/^(\d+)\s+(\d+)\s+R$/);
    if (refMatch) {
      return {
        type: PDFObjectType.INDIRECT_REFERENCE,
        value: {
          objNumber: parseInt(refMatch[1], 10),
          generation: parseInt(refMatch[2], 10)
        }
      };
    }

    // 字符串（括号或尖括号）
    if (text.startsWith('(') && text.endsWith(')')) {
      return {
        type: PDFObjectType.STRING,
        value: this.parseLiteralString(text)
      };
    }
    if (text.startsWith('<') && text.endsWith('>')) {
      return {
        type: PDFObjectType.STRING,
        value: this.parseHexString(text)
      };
    }

    // 名称对象
    if (text.startsWith('/')) {
      return {
        type: PDFObjectType.NAME,
        value: this.parseName(text)
      };
    }

    // 数组
    if (text.startsWith('[') && text.endsWith(']')) {
      return {
        type: PDFObjectType.ARRAY,
        value: this.parseArray(text)
      };
    }

    // 字典
    if (text.startsWith('<<') && text.endsWith('>>')) {
      return {
        type: PDFObjectType.DICTIONARY,
        value: this.parseDictionary(text)
      };
    }

    throw new ParserError(`无法解析对象: ${text}`, 'PARSE_ERROR');
  }

  /**
   * 解析字面字符串
   * @param {string} text - 括号包裹的字符串
   * @returns {string} 解码后的字符串
   */
  static parseLiteralString(text) {
    // 移除外层括号
    text = text.substring(1, text.length - 1);
    
    // 处理转义字符
    const result = [];
    let i = 0;
    while (i < text.length) {
      if (text[i] === '\\' && i + 1 < text.length) {
        const next = text[i + 1];
        if (next === 'n') {
          result.push('\n');
          i += 2;
        } else if (next === 'r') {
          result.push('\r');
          i += 2;
        } else if (next === 't') {
          result.push('\t');
          i += 2;
        } else if (next === 'b') {
          result.push('\b');
          i += 2;
        } else if (next === 'f') {
          result.push('\f');
          i += 2;
        } else if (next === '(' || next === ')' || next === '\\') {
          result.push(next);
          i += 2;
        } else if (next >= '0' && next <= '7') {
          // 八进制转义
          let octal = next;
          let j = i + 2;
          while (j < i + 4 && j < text.length && text[j] >= '0' && text[j] <= '7') {
            octal += text[j];
            j++;
          }
          result.push(String.fromCharCode(parseInt(octal, 8)));
          i = j;
        } else {
          result.push(next);
          i += 2;
        }
      } else {
        result.push(text[i]);
        i++;
      }
    }
    return result.join('');
  }

  /**
   * 解析十六进制字符串
   * @param {string} text - 尖括号包裹的十六进制字符串
   * @returns {string} 解码后的字符串
   */
  static parseHexString(text) {
    // 移除外层尖括号
    text = text.substring(1, text.length - 1).replace(/\s/g, '');
    
    // 补齐为偶数个字符
    if (text.length % 2 !== 0) {
      text += '0';
    }

    let result = '';
    for (let i = 0; i < text.length; i += 2) {
      const hex = text.substring(i, i + 2);
      result += String.fromCharCode(parseInt(hex, 16));
    }
    return result;
  }

  /**
   * 解析名称对象
   * @param {string} text - 名称对象文本（以/开头）
   * @returns {string} 名称
   */
  static parseName(text) {
    text = text.substring(1);
    
    // 解析名称中的转义字符（#XX格式）
    const result = [];
    let i = 0;
    while (i < text.length) {
      if (text[i] === '#' && i + 2 < text.length) {
        const hex = text.substring(i + 1, i + 3);
        result.push(String.fromCharCode(parseInt(hex, 16)));
        i += 3;
      } else {
        result.push(text[i]);
        i++;
      }
    }
    return result.join('');
  }

  /**
   * 解析数组
   * @param {string} text - 数组文本
   * @returns {Array} 解析后的数组
   */
  static parseArray(text) {
    // 移除外层方括号
    text = text.substring(1, text.length - 1).trim();
    if (!text) return [];

    const result = [];
    let depth = 0;
    let start = 0;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      if (char === '[' || char === '(' || char === '<') {
        depth++;
      } else if (char === ']' || char === ')' || char === '>') {
        depth--;
      } else if (char === ' ' || char === '\n' || char === '\r' || char === '\t') {
        if (depth === 0) {
          const item = text.substring(start, i).trim();
          if (item) {
            result.push(this.parseObject(item));
          }
          start = i + 1;
        }
      }
    }

    // 处理最后一个元素
    if (start < text.length) {
      const item = text.substring(start).trim();
      if (item) {
        result.push(this.parseObject(item));
      }
    }

    return result;
  }

  /**
   * 解析字典
   * @param {string} text - 字典文本
   * @returns {Object} 解析后的字典
   */
  static parseDictionary(text) {
    // 移除外层<<>>
    text = text.substring(2, text.length - 2).trim();
    if (!text) return {};

    const result = {};
    let depth = 0;
    let inName = false;
    let inValue = false;
    let currentName = '';
    let currentValue = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (char === '/' && depth === 0 && !inValue) {
        // 开始新的键
        if (currentName) {
          result[currentName] = currentValue.trim();
        }
        currentName = '';
        currentValue = '';
        inName = true;
        inValue = false;
      } else if (inName && (char === ' ' || char === '\n' || char === '\r' || char === '\t')) {
        // 键结束
        inName = false;
        inValue = true;
      } else if (inName) {
        currentName += char;
      } else if (inValue) {
        currentValue += char;
        if (char === '<') depth++;
        if (char === '>') depth--;
        if (char === '[') depth++;
        if (char === ']') depth--;
        if (char === '(') depth++;
        if (char === ')') depth--;
      }
    }

    // 处理最后一个键值对
    if (currentName) {
      result[currentName] = currentValue.trim();
    }

    // 解析字典中的值
    for (const key in result) {
      try {
        result[key] = this.parseObject(result[key]);
      } catch (e) {
        // 保持原始字符串
      }
    }

    return result;
  }

  /**
   * 从buffer中读取间接对象
   * @param {ArrayBuffer} buffer - PDF文件数据
   * @param {number} offset - 对象偏移量
   * @returns {Object} 解析后的对象
   */
  static readIndirectObject(buffer, offset) {
    const text = BinaryUtils.readString(buffer, offset, Math.min(1024, buffer.byteLength - offset));
    const match = text.match(/^(\d+)\s+(\d+)\s+obj\s*(.+?)\s*endobj/s);
    
    if (!match) {
      throw new ParserError(`无法读取对象于偏移量 ${offset}`, 'READ_OBJECT_FAILED');
    }

    return {
      objNumber: parseInt(match[1], 10),
      generation: parseInt(match[2], 10),
      content: match[3].trim()
    };
  }

  /**
   * 解析流对象
   * @param {string} content - 流字典内容
   * @param {ArrayBuffer} buffer - PDF文件数据
   * @param {number} offset - 流起始位置
   * @returns {Object} 流对象
   */
  static parseStream(content, buffer, offset) {
    const dictMatch = content.match(/^(.+?)\s*stream\s*$/s);
    if (!dictMatch) {
      throw new ParserError('无效的流对象', 'INVALID_STREAM');
    }

    const dict = this.parseObject(dictMatch[1]);
    
    // 查找stream长度
    let streamLength = dict.value.Length;
    if (typeof streamLength === 'object' && streamLength.type === PDFObjectType.NUMBER) {
      streamLength = streamLength.value;
    }

    // 查找endstream位置
    const fullText = BinaryUtils.readString(buffer, offset, Math.min(offset + 4096, buffer.byteLength - offset));
    const endStreamMatch = fullText.match(/endstream/);
    
    if (!endStreamMatch) {
      throw new ParserError('找不到endstream标记', 'ENDSTREAM_NOT_FOUND');
    }

    const streamStart = fullText.indexOf('stream') + 6;
    const streamData = new Uint8Array(buffer, offset + streamStart, streamLength);

    return {
      dict,
      data: streamData.buffer
    };
  }
}
