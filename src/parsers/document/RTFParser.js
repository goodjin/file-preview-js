/**
 * RTF (Rich Text Format) 解析器
 * 解析RTF文件，提取文本、样式、图片等元素
 * @extends BaseParser
 */
export class RTFParser extends BaseParser {
  /**
   * 构造函数
   */
  constructor() {
    super();
    /** @type {Object} 解析结果 */
    this.result = {
      type: 'rtf',
      content: [],
      metadata: {}
    };
    /** @type {Object} 当前的文本样式 */
    this.currentStyle = {
      font: 0,
      fontSize: 12,
      bold: false,
      italic: false,
      underline: false,
      color: 0,
      bgColor: -1
    };
    /** @type {Array} 字体表 */
    this.fontTable = [];
    /** @type {Array} 颜色表 */
    this.colorTable = [];
    /** @type {string} 当前段落的文本内容 */
    this.currentText = '';
  }

  /**
   * 解析RTF文件
   * @param {ArrayBuffer} fileData - 文件二进制数据
   * @returns {Promise<Object>} 解析结果
   */
  async parse(fileData) {
    // 重置解析状态
    this.reset();

    // 转换为文本
    const text = this.arrayBufferToText(fileData);

    // 验证RTF文件
    if (!this.validate(fileData)) {
      throw new Error('无效的RTF文件格式');
    }

    // 解析RTF内容
    this.parseRTF(text);

    // 添加最后一段文本
    this.addTextToContent();

    return this.result;
  }

  /**
   * 验证RTF文件格式
   * @param {ArrayBuffer} fileData - 文件二进制数据
   * @returns {boolean} 是否有效
   */
  validate(fileData) {
    try {
      const text = this.arrayBufferToText(fileData);
      return text.trim().startsWith('{\\rtf1');
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取文件元数据
   * @param {ArrayBuffer} fileData - 文件二进制数据
   * @returns {Object} 元数据
   */
  getMetadata(fileData) {
    const text = this.arrayBufferToText(fileData);
    const metadata = {
      format: 'RTF',
      version: '1.0'
    };

    // 提取标题
    const titleMatch = text.match(/\{\\\*\\title[^}]+\}/);
    if (titleMatch) {
      metadata.title = titleMatch[0].replace(/\{\\\*\\title/, '').replace(/\}/, '');
    }

    // 提取作者
    const authorMatch = text.match(/\{\\\*\\author[^}]+\}/);
    if (authorMatch) {
      metadata.author = authorMatch[0].replace(/\{\\\*\\author/, '').replace(/\}/, '');
    }

    // 提取创建时间
    const createMatch = text.match(/\{\\\*\\creatim[^}]+\}/);
    if (createMatch) {
      metadata.createTime = createMatch[0];
    }

    return metadata;
  }

  /**
   * 重置解析状态
   * @private
   */
  reset() {
    this.result = {
      type: 'rtf',
      content: [],
      metadata: {}
    };
    this.currentStyle = {
      font: 0,
      fontSize: 12,
      bold: false,
      italic: false,
      underline: false,
      color: 0,
      bgColor: -1
    };
    this.fontTable = [];
    this.colorTable = [];
    this.currentText = '';
  }

  /**
   * 将ArrayBuffer转换为文本
   * @param {ArrayBuffer} arrayBuffer - 二进制数据
   * @returns {string} 文本内容
   * @private
   */
  arrayBufferToText(arrayBuffer) {
    const decoder = new TextDecoder('ansi');
    return decoder.decode(arrayBuffer);
  }

  /**
   * 解析RTF内容
   * @param {string} text - RTF文本内容
   * @private
   */
  parseRTF(text) {
    let pos = 0;
    const len = text.length;

    while (pos < len) {
      const char = text[pos];

      // 处理转义字符
      if (char === '\\') {
        const token = this.parseControlWord(text, pos);
        pos += token.length;

        // 处理控制字
        if (token.type === 'control') {
          this.processControlWord(token.word, token.param);
        } else if (token.type === 'symbol') {
          // 转义符号
          this.currentText += token.symbol;
        }
      }
      // 处理组开始
      else if (char === '{') {
        pos++;
      }
      // 处理组结束
      else if (char === '}') {
        // 段落结束
        this.addTextToContent();
        pos++;
      }
      // 处理普通文本
      else {
        this.currentText += char;
        pos++;
      }
    }
  }

  /**
   * 解析控制字或转义符号
   * @param {string} text - RTF文本
   * @param {number} pos - 起始位置
   * @returns {Object} 解析结果
   * @private
   */
  parseControlWord(text, pos) {
    pos++; // 跳过反斜杠
    const len = text.length;

    // 检查是否是转义符号
    if (pos < len && /[\\{}]/.test(text[pos])) {
      return {
        type: 'symbol',
        symbol: text[pos],
        length: 2
      };
    }

    // 解析控制字
    let word = '';
    let param = null;

    while (pos < len && /[a-zA-Z]/.test(text[pos])) {
      word += text[pos];
      pos++;
    }

    // 解析参数（可选）
    if (pos < len && /-?[0-9]/.test(text[pos])) {
      let negative = false;
      if (text[pos] === '-') {
        negative = true;
        pos++;
      }
      let numStr = '';
      while (pos < len && /[0-9]/.test(text[pos])) {
        numStr += text[pos];
        pos++;
      }
      if (numStr) {
        param = negative ? -parseInt(numStr, 10) : parseInt(numStr, 10);
      }
    }

    return {
      type: 'control',
      word: word,
      param: param,
      length: pos - (word.length + 1) + word.length + 1
    };
  }

  /**
   * 处理控制字
   * @param {string} word - 控制字
   * @param {number|null} param - 参数
   * @private
   */
  processControlWord(word, param) {
    // 处理字体表
    if (word === 'fonttbl') {
      // 标记字体表开始（简化处理）
    }
    // 字体表项
    else if (word === 'f') {
      this.currentStyle.font = param || 0;
    }
    // 颜色表
    else if (word === 'colortbl') {
      // 标记颜色表开始（简化处理）
    }
    // 前景色
    else if (word === 'cf') {
      this.currentStyle.color = param || 0;
    }
    // 背景色
    else if (word === 'cb') {
      this.currentStyle.bgColor = param || -1;
    }
    // 字体大小（单位：半点）
    else if (word === 'fs') {
      this.currentStyle.fontSize = (param || 24) / 2;
    }
    // 加粗
    else if (word === 'b') {
      this.currentStyle.bold = param !== 0;
    }
    // 斜体
    else if (word === 'i') {
      this.currentStyle.italic = param !== 0;
    }
    // 下划线
    else if (word === 'ul') {
      this.currentStyle.underline = param !== 0;
    }
    // 段落结束
    else if (word === 'par' || word === 'line') {
      this.addTextToContent();
    }
    // 换行
    else if (word === 'tab') {
      this.currentText += '\t';
    }
    // 单引号（特殊字符）
    else if (word === "'") {
      // 十六进制编码的字符（简化处理，忽略）
    }
    // 图片
    else if (word === 'pict') {
      // 标记图片开始
    }
  }

  /**
   * 将当前文本添加到内容中
   * @private
   */
  addTextToContent() {
    if (this.currentText.trim()) {
      this.result.content.push({
        type: 'text',
        text: this.currentText.trim(),
        styles: { ...this.currentStyle }
      });
    }
    this.currentText = '';
  }
}
