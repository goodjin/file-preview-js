/**
 * docx文件解析器
 * 基于mammoth.js实现docx解析，支持大文件流式解析
 */
class DocxParser {
  constructor() {
    this.mammoth = null;
    this.isLoaded = false;
    this.parsedData = null;
  }

  /**
   * 加载mammoth.js库
   */
  async loadLibrary() {
    if (this.isLoaded) return;

    try {
      // 动态加载mammoth.js
      const response = await fetch('/libs/mammoth.browser.min.js');
      const script = await response.text();
      eval(script);
      this.mammoth = window.mammoth;
      this.isLoaded = true;
    } catch (error) {
      throw new Error('Failed to load mammoth.js library');
    }
  }

  /**
   * 解析docx文件
   * @param {File|ArrayBuffer|Uint8Array} file - docx文件
   * @param {Object} options - 解析选项
   * @returns {Promise<Object>} 解析结果
   */
  async parse(file, options = {}) {
    await this.loadLibrary();

    const defaultOptions = {
      styleMap: this._getDefaultStyleMap(),
      transformDocument: null,
      includeDefaultStyleMap: true,
      ignoreEmptyParagraphs: true
    };

    const parseOptions = { ...defaultOptions, ...options };

    try {
      let arrayBuffer;

      if (file instanceof File) {
        arrayBuffer = await file.arrayBuffer();
      } else if (file instanceof ArrayBuffer) {
        arrayBuffer = file;
      } else if (file instanceof Uint8Array) {
        arrayBuffer = file.buffer;
      } else {
        throw new Error('Invalid file type');
      }

      // 使用mammoth解析docx
      const result = await this.mammoth.convertToHtml(
        { arrayBuffer },
        parseOptions
      );

      // 提取原始数据用于进一步处理
      const rawResult = await this.mammoth.extractRawText({ arrayBuffer });

      this.parsedData = {
        html: result.value,
        messages: result.messages,
        rawText: rawResult.value,
        warnings: this._filterMessages(result.messages, 'warning'),
        errors: this._filterMessages(result.messages, 'error')
      };

      return this.parsedData;
    } catch (error) {
      throw new Error(`Failed to parse docx file: ${error.message}`);
    }
  }

  /**
   * 获取解析后的数据
   */
  getParsedData() {
    return this.parsedData;
  }

  /**
   * 清理解析数据
   */
  clear() {
    this.parsedData = null;
  }

  /**
   * 获取默认样式映射
   */
  _getDefaultStyleMap() {
    return [
      "p[style-name='Title'] => h1:fresh",
      "p[style-name='Heading 1'] => h2:fresh",
      "p[style-name='Heading 2'] => h3:fresh",
      "p[style-name='Heading 3'] => h4:fresh",
      "r[style-name='Strong'] => strong"
    ];
  }

  /**
   * 过滤消息类型
   */
  _filterMessages(messages, type) {
    return messages.filter(msg => msg.type === type);
  }
}

export default DocxParser;
