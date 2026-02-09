/**
 * RTF解析器
 * 支持 .rtf 格式
 * RTF是微软的富文本格式
 */
import { BaseParser } from '../BaseParser.js';

export class RTFParser extends BaseParser {
  /**
   * RTF控制字前缀
   */
  static CONTROL_WORD_PREFIX = '\\';
  
  /**
   * RTF特殊字符
   */
  static SPECIAL_CHARS = {
    '\\\\': '\\',
    '\\{': '{',
    '\\}': '}',
    '\\line': '\n',
    '\\par': '\n\n',
    '\\tab': '\t',
    '\\-': '\u00AD', // 软连字符
    '\\endash': '\u2013',
    '\\emdash': '\u2014',
    '\\bullet': '\u2022',
    '\\lquote': '\u2018',
    '\\rquote': '\u2019',
    '\\ldblquote': '\u201C',
    '\\rdblquote': '\u201D'
  };

  /**
   * 解析RTF文件
   * @param {ArrayBuffer} fileData - 文件二进制数据
   * @returns {Promise<Object>} 解析结果
   */
  async parse(fileData) {
    const decoder = new TextDecoder('ascii');
    const rtfText = decoder.decode(fileData);
    
    // 验证RTF格式
    if (!this.validate(fileData)) {
      throw new Error('无效的RTF文件');
    }
    
    const result = this.parseContent(rtfText);
    
    return {
      type: 'rtf',
      content: result.text,
      metadata: result.metadata,
      structure: result.structure
    };
  }

  /**
   * 解析RTF内容
   * @param {string} rtfText - RTF文本
   * @returns {Object} 解析结果
   */
  parseContent(rtfText) {
    let text = '';
    let inGroup = 0;
    let i = 0;
    
    const structure = {
      hasFormatting: false,
      hasImages: false,
      hasTables: false,
      hasColors: false,
      hasFonts: false
    };
    
    // 跳过头部，查找第一个 {
    const headerEnd = rtfText.indexOf('{');
    if (headerEnd === -1) {
      return { text: '', metadata: {}, structure };
    }
    
    i = headerEnd;
    
    while (i < rtfText.length) {
      const char = rtfText[i];
      
      if (char === '{') {
        inGroup++;
        i++;
      } else if (char === '}') {
        inGroup--;
        i++;
      } else if (char === '\\') {
        // 处理控制字
        const result = this.parseControlWord(rtfText, i);
        
        if (result.isSpecialChar) {
          text += result.text;
        } else if (result.controlWord) {
          // 记录结构信息
          if (['b', 'i', 'u', 'sub', 'super'].includes(result.controlWord)) {
            structure.hasFormatting = true;
          } else if (result.controlWord === 'pict' || result.controlWord === 'shppict') {
            structure.hasImages = true;
          } else if (result.controlWord === 'trowd') {
            structure.hasTables = true;
          } else if (result.controlWord === 'colortbl') {
            structure.hasColors = true;
          } else if (result.controlWord === 'fonttbl') {
            structure.hasFonts = true;
          }
        }
        
        i = result.nextIndex;
      } else if (char === '\r' || char === '\n') {
        // 跳过换行符
        i++;
      } else {
        // 普通文本
        text += char;
        i++;
      }
    }
    
    return {
      text: text.trim(),
      metadata: {
        charset: 'ANSI',
        codePage: this.getCodePage(rtfText),
        encoding: this.getEncoding(rtfText)
      },
      structure
    };
  }

  /**
   * 解析控制字
   * @param {string} rtfText - RTF文本
   * @param {number} index - 当前索引
   * @returns {Object} 解析结果
   */
  parseControlWord(rtfText, index) {
    if (rtfText[index] !== '\\') {
      return { text: '', nextIndex: index + 1 };
    }
    
    let i = index + 1;
    let controlWord = '';
    let param = '';
    let isNumber = true;
    
    // 读取控制字
    while (i < rtfText.length) {
      const char = rtfText[i];
      
      if (char >= 'a' && char <= 'z') {
        controlWord += char;
        i++;
      } else if (char >= '0' && char <= '9' && isNumber) {
        param += char;
        i++;
      } else if (char === '-') {
        if (param === '') {
          param += char;
          i++;
          isNumber = false;
        } else {
          break;
        }
      } else {
        break;
      }
    }
    
    // 检查是否是特殊字符
    const specialChars = RTFParser.SPECIAL_CHARS;
    const controlWordWithSlash = '\\' + controlWord;
    
    if (specialChars[controlWordWithSlash]) {
      return {
        isSpecialChar: true,
        text: specialChars[controlWordWithSlash],
        nextIndex: i
      };
    }
    
    // 检查是否是十六进制字符 \'xx
    if (controlWord === "'" && param.length === 2) {
      const code = parseInt(param, 16);
      const char = String.fromCharCode(code);
      return {
        isSpecialChar: true,
        text: char,
        nextIndex: i
      };
    }
    
    // 普通控制字
    return {
      isSpecialChar: false,
      controlWord: controlWord,
      param: param,
      nextIndex: i
    };
  }

  /**
   * 获取代码页
   * @param {string} rtfText - RTF文本
   * @returns {number} 代码页
   */
  getCodePage(rtfText) {
    const match = rtfText.match(/\\ansicpg(\d+)/);
    return match ? parseInt(match[1]) : 1252; // 默认ANSI
  }

  /**
   * 获取编码
   * @param {string} rtfText - RTF文本
   * @returns {string} 编码
   */
  getEncoding(rtfText) {
    if (rtfText.includes('\\ansi')) return 'ANSI';
    if (rtfText.includes('\\mac')) return 'Macintosh';
    if (rtfText.includes('\\pc')) return 'PC';
    if (rtfText.includes('\\pca')) return 'PCA';
    return 'ANSI';
  }

  /**
   * 验证RTF文件
   * @param {ArrayBuffer} fileData - 文件二进制数据
   * @returns {boolean} 是否有效
   */
  validate(fileData) {
    const decoder = new TextDecoder('ascii');
    const rtfText = decoder.decode(fileData, { stream: true });
    
    // RTF文件以 {\rtf 开头
    return rtfText.startsWith('{\\rtf');
  }

  /**
   * 获取RTF文件元数据
   * @param {ArrayBuffer} fileData - 文件二进制数据
   * @returns {Object} 元数据
   */
  getMetadata(fileData) {
    try {
      const decoder = new TextDecoder('ascii');
      const rtfText = decoder.decode(fileData);
      
      const result = this.parseContent(rtfText);
      
      return {
        type: 'rtf',
        size: fileData.byteLength,
        charset: result.metadata.charset,
        codePage: result.metadata.codePage,
        encoding: result.metadata.encoding,
        charCount: result.text.length,
        lineCount: result.text.split('\n').length,
        hasFormatting: result.structure.hasFormatting,
        hasImages: result.structure.hasImages,
        hasTables: result.structure.hasTables
      };
    } catch {
      return {
        type: 'rtf',
        size: fileData.byteLength,
        valid: false
      };
    }
  }
}
