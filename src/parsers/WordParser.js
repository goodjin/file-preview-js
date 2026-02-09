/**
 * Word解析器
 * 纯JavaScript实现的Word文档解析器，支持DOCX格式
 * 
 * @class WordParser
 * @description 解析DOCX文件，提取文本、样式、图片、表格等内容
 * @author 文件预览系统研发团队
 */

import ZIPParser from '../utils/ZIPParser.js';

/**
 * Word解析器类
 * @extends {BaseParser}
 */
class WordParser {
  /**
   * 构造函数
   * @constructor
   */
  constructor() {
    this.zipParser = new ZIPParser();
    this.parsedData = null;
  }

  /**
   * 解析Word文档
   * @param {ArrayBuffer} fileData - DOCX文件二进制数据
   * @returns {Promise<Object>} 解析结果
   * @throws {Error} 当文件格式无效时抛出错误
   * 
   * @example
   * const parser = new WordParser();
   * const result = await parser.parse(fileData);
   * console.log(result.content);
   */
  async parse(fileData) {
    // 使用ZIPParser解压DOCX文件
    const zipResult = await this.zipParser.parse(fileData);

    // 解析主文档
    const documentContent = await this.parseMainDocument();

    // 解析样式
    const styles = await this.parseStyles();

    // 提取图片
    const images = await this.extractImages();

    // 构建解析结果
    this.parsedData = {
      type: 'word',
      format: 'DOCX',
      content: documentContent,
      styles,
      images,
      metadata: this.zipParser.getMetadata()
    };

    return this.parsedData;
  }

  /**
   * 验证Word文档格式
   * @param {ArrayBuffer} fileData - DOCX文件二进制数据
   * @returns {Promise<boolean>} 是否为有效的DOCX文件
   */
  async validate(fileData) {
    try {
      await this.zipParser.parse(fileData);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取文件元数据
   * @param {ArrayBuffer} fileData - DOCX文件二进制数据
   * @returns {Promise<Object>} 元数据
   */
  async getMetadata(fileData) {
    if (!this.parsedData) {
      await this.parse(fileData);
    }
    return this.parsedData.metadata;
  }

  /**
   * 解析主文档（word/document.xml）
   * @returns {Promise<Array>} 文档内容数组
   * @private
   */
  async parseMainDocument() {
    try {
      const xmlContent = await this.zipParser.readFile('word/document.xml');
      const xmlText = new TextDecoder().decode(xmlContent);
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

      const content = [];
      const paragraphs = xmlDoc.getElementsByTagName('w:p');

      for (const paragraph of paragraphs) {
        const paraData = this.parseParagraph(paragraph);
        if (paraData) {
          content.push(paraData);
        }
      }

      return content;
    } catch (error) {
      // 如果没有word/document.xml，尝试其他可能的位置
      throw new Error('Failed to parse main document: ' + error.message);
    }
  }

  /**
   * 解析段落
   * @param {Element} paragraphElement - 段落元素
   * @returns {Object|null} 段落数据
   * @private
   */
  parseParagraph(paragraphElement) {
    // 检查是否是表格
    const table = this.findTableElement(paragraphElement);
    if (table) {
      return this.parseTable(table);
    }

    // 解析普通段落
    const runs = paragraphElement.getElementsByTagName('w:r');
    const texts = [];
    const styles = this.parseParagraphStyles(paragraphElement);

    for (const run of runs) {
      const runData = this.parseRun(run);
      if (runData) {
        texts.push(runData);
      }
    }

    if (texts.length === 0) {
      return null;
    }

    return {
      type: 'paragraph',
      text: texts.map(t => t.text).join(''),
      runs: texts,
      styles
    };
  }

  /**
   * 查找表格元素
   * @param {Element} element - 段落元素
   * @returns {Element|null} 表格元素或null
   * @private
   */
  findTableElement(element) {
    // 检查段落是否在表格中
    const parent = element.parentElement;
    if (!parent) return null;

    const grandParent = parent.parentElement;
    if (grandParent && grandParent.tagName === 'w:tbl') {
      return grandParent;
    }

    return null;
  }

  /**
   * 解析表格
   * @param {Element} tableElement - 表格元素
   * @returns {Object} 表格数据
   * @private
   */
  parseTable(tableElement) {
    const rows = tableElement.getElementsByTagName('w:tr');
    const tableData = [];

    for (const row of rows) {
      const cells = row.getElementsByTagName('w:tc');
      const rowData = [];

      for (const cell of cells) {
        const cellText = this.extractCellText(cell);
        rowData.push(cellText);
      }

      if (rowData.length > 0) {
        tableData.push({
          type: 'row',
          cells: rowData
        });
      }
    }

    return {
      type: 'table',
      rows: tableData
    };
  }

  /**
   * 提取单元格文本
   * @param {Element} cellElement - 单元格元素
   * @returns {string} 单元格文本
   * @private
   */
  extractCellText(cellElement) {
    const runs = cellElement.getElementsByTagName('w:r');
    const texts = [];

    for (const run of runs) {
      const tElements = run.getElementsByTagName('w:t');
      for (const t of tElements) {
        texts.push(t.textContent);
      }
    }

    return texts.join('');
  }

  /**
   * 解析文本运行（Run）
   * @param {Element} runElement - Run元素
   * @returns {Object|null} Run数据
   * @private
   */
  parseRun(runElement) {
    const tElements = runElement.getElementsByTagName('w:t');
    if (tElements.length === 0) {
      return null;
    }

    const text = Array.from(tElements).map(t => t.textContent).join('');
    if (!text) {
      return null;
    }

    return {
      text,
      styles: this.parseRunStyles(runElement)
    };
  }

  /**
   * 解析段落样式
   * @param {Element} paragraphElement - 段落元素
   * @returns {Object} 样式对象
   * @private
   */
  parseParagraphStyles(paragraphElement) {
    const styles = {};
    const pPr = paragraphElement.getElementsByTagName('w:pPr')[0];

    if (!pPr) {
      return styles;
    }

    // 对齐方式
    const jc = pPr.getElementsByTagName('w:jc')[0];
    if (jc) {
      styles.align = jc.getAttribute('w:val');
    }

    return styles;
  }

  /**
   * 解析Run样式
   * @param {Element} runElement - Run元素
   * @returns {Object} 样式对象
   * @private
   */
  parseRunStyles(runElement) {
    const styles = {};
    const rPr = runElement.getElementsByTagName('w:rPr')[0];

    if (!rPr) {
      return styles;
    }

    // 粗体
    const b = rPr.getElementsByTagName('w:b')[0];
    if (b) {
      styles.bold = true;
    }

    // 斜体
    const i = rPr.getElementsByTagName('w:i')[0];
    if (i) {
      styles.italic = true;
    }

    // 下划线
    const u = rPr.getElementsByTagName('w:u')[0];
    if (u) {
      styles.underline = u.getAttribute('w:val');
    }

    // 字体大小
    const sz = rPr.getElementsByTagName('w:sz')[0];
    if (sz) {
      styles.fontSize = parseInt(sz.getAttribute('w:val')) / 2; // 单位是半点
    }

    // 字体颜色
    const color = rPr.getElementsByTagName('w:color')[0];
    if (color) {
      styles.color = this.parseColor(color.getAttribute('w:val'));
    }

    // 字体
    const rFonts = rPr.getElementsByTagName('w:rFonts')[0];
    if (rFonts) {
      styles.fontFamily = rFonts.getAttribute('w:ascii');
    }

    return styles;
  }

  /**
   * 解析颜色值
   * @param {string} colorValue - Word颜色值
   * @returns {string} CSS颜色值
   * @private
   */
  parseColor(colorValue) {
    if (!colorValue) {
      return null;
    }

    // Word颜色是6位十六进制数，需要转换为RRGGBB格式
    if (colorValue.length === 6) {
      return `#${colorValue}`;
    }

    // 处理自动颜色
    if (colorValue === 'auto') {
      return null;
    }

    return `#${colorValue}`;
  }

  /**
   * 解析样式文件（word/styles.xml）
   * @returns {Promise<Object>} 样式定义
   * @private
   */
  async parseStyles() {
    try {
      const xmlContent = await this.zipParser.readFile('word/styles.xml');
      const xmlText = new TextDecoder().decode(xmlContent);
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

      const styles = {};
      const styleElements = xmlDoc.getElementsByTagName('w:style');

      for (const styleElement of styleElements) {
        const styleId = styleElement.getAttribute('w:styleId');
        const styleType = styleElement.getAttribute('w:type');

        if (styleId && styleType) {
          styles[styleId] = {
            type: styleType,
            name: this.getStyleName(styleElement),
            basedOn: this.getStyleBasedOn(styleElement)
          };
        }
      }

      return styles;
    } catch (error) {
      // 样式文件不存在不是致命错误
      console.warn('Failed to parse styles:', error.message);
      return {};
    }
  }

  /**
   * 获取样式名称
   * @param {Element} styleElement - 样式元素
   * @returns {string} 样式名称
   * @private
   */
  getStyleName(styleElement) {
    const name = styleElement.getElementsByTagName('w:name')[0];
    return name ? name.getAttribute('w:val') : '';
  }

  /**
   * 获取样式继承关系
   * @param {Element} styleElement - 样式元素
   * @returns {string} 基础样式ID
   * @private
   */
  getStyleBasedOn(styleElement) {
    const basedOn = styleElement.getElementsByTagName('w:basedOn')[0];
    return basedOn ? basedOn.getAttribute('w:val') : '';
  }

  /**
   * 提取嵌入图片
   * @returns {Promise<Array>} 图片数组
   * @private
   */
  async extractImages() {
    const images = [];

    try {
      // 尝试读取关系文件
      const relationships = await this.parseRelationships();

      // 提取document.xml.rels中的图片关系
      const documentRels = await this.parseDocumentRelationships(relationships);

      for (const rel of documentRels) {
        if (rel.type && rel.type.includes('image')) {
          try {
            const imageData = await this.zipParser.readFile(rel.target);
            const mimeType = this.getMimeTypeFromTarget(rel.target);
            
            images.push({
              id: rel.id,
              data: `data:${mimeType};base64,${this.arrayBufferToBase64(imageData)}`,
              mimeType,
              originalPath: rel.target
            });
          } catch (error) {
            console.warn(`Failed to extract image ${rel.target}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to extract images:', error.message);
    }

    return images;
  }

  /**
   * 解析关系文件
   * @returns {Promise<Object>} 关系对象
   * @private
   */
  async parseRelationships() {
    try {
      const xmlContent = await this.zipParser.readFile('_rels/.rels');
      const xmlText = new TextDecoder().decode(xmlContent);
      const parser = new DOMParser();
      return parser.parseFromString(xmlText, 'application/xml');
    } catch (error) {
      return null;
    }
  }

  /**
   * 解析文档关系
   * @param {Document} rootRels - 根关系文档
   * @returns {Promise<Array>} 关系数组
   * @private
   */
  async parseDocumentRelationships(rootRels) {
    const relationships = [];

    try {
      const xmlContent = await this.zipParser.readFile('word/_rels/document.xml.rels');
      const xmlText = new TextDecoder().decode(xmlContent);
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

      const relElements = xmlDoc.getElementsByTagName('Relationship');

      for (const rel of relElements) {
        relationships.push({
          id: rel.getAttribute('Id'),
          type: rel.getAttribute('Type'),
          target: rel.getAttribute('Target')
        });
      }
    } catch (error) {
      console.warn('Failed to parse document relationships:', error.message);
    }

    return relationships;
  }

  /**
   * 根据文件路径获取MIME类型
   * @param {string} target - 文件路径
   * @returns {string} MIME类型
   * @private
   */
  getMimeTypeFromTarget(target) {
    const ext = target.split('.').pop().toLowerCase();
    const mimeTypes = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'tiff': 'image/tiff'
    };

    return mimeTypes[ext] || 'image/png';
  }

  /**
   * 将ArrayBuffer转换为Base64
   * @param {ArrayBuffer} buffer - 二进制数据
   * @returns {string} Base64字符串
   * @private
   */
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

export default WordParser;
