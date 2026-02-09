/**
 * Word文档解析器
 * 负责解析DOC和DOCX格式
 */
import { BaseParser } from '../BaseParser.js';
import { BinaryUtils } from '../../utils/BinaryUtils.js';
import { XMLUtils } from '../../utils/XMLUtils.js';
import { ZIPUtils } from '../../utils/ZIPUtils.js';

export class WordParser extends BaseParser {
  /**
   * 验证Word文档格式
   * @param {ArrayBuffer} fileData - 文件二进制数据
   * @returns {boolean} 是否有效
   */
  validate(fileData) {
    const magic = BinaryUtils.readMagicNumber(fileData, 0, 8);
    // DOCX: ZIP file signature (PK\x03\x04)
    if (magic.startsWith('504B0304')) {
      return true;
    }
    // DOC: OLE Compound Document signature
    if (magic === 'D0CF11E0A1B11AE1') {
      return true;
    }
    return false;
  }

  /**
   * 解析Word文档
   * @param {ArrayBuffer} fileData - 文件二进制数据
   * @returns {Promise<Object>} 解析结果
   */
  async parse(fileData) {
    const magic = BinaryUtils.readMagicNumber(fileData, 0, 8);
    
    if (magic.startsWith('504B0304')) {
      return this.parseDOCX(fileData);
    } else if (magic === 'D0CF11E0A1B11AE1') {
      return this.parseDOC(fileData);
    }
    
    throw new Error('Invalid Word document format');
  }

  /**
   * 解析DOCX格式
   * @param {ArrayBuffer} fileData - 文件二进制数据
   * @returns {Promise<Object>} 解析结果
   */
  async parseDOCX(fileData) {
    // 解压ZIP文件
    const files = await ZIPUtils.parseZIP(fileData);
    
    // 查找主文档
    const mainDocFile = this.findMainDocument(files);
    if (!mainDocFile) {
      throw new Error('Main document not found in DOCX');
    }
    
    // 解析XML
    const xmlText = BinaryUtils.bufferToString(mainDocFile, 'utf-8');
    const xmlDoc = XMLUtils.parseXML(xmlText);
    
    // 提取文档内容
    const content = this.extractContent(xmlDoc);
    const metadata = this.extractMetadata(xmlDoc);
    
    return {
      type: 'docx',
      content: content,
      metadata: metadata
    };
  }

  /**
   * 解析DOC格式（简化实现）
   * @param {ArrayBuffer} fileData - 文件二进制数据
   * @returns {Promise<Object>} 解析结果
   */
  async parseDOC(fileData) {
    // DOC格式是二进制格式，实现较为复杂
    // 这里提供基础框架，完整实现需要深入研究OLE Compound Document格式
    
    const textContent = this.extractTextFromDOC(fileData);
    
    return {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          text: textContent,
          styles: {}
        }
      ],
      metadata: {
        format: 'DOC'
      }
    };
  }

  /**
   * 从DOC提取文本（简化实现）
   * @param {ArrayBuffer} fileData - 文件数据
   * @returns {string} 文本内容
   */
  extractTextFromDOC(fileData) {
    // DOC格式文本提取的简化版本
    // 完整实现需要解析WordDocument流
    const view = new Uint8Array(fileData);
    let text = '';
    
    // 尝试从文件中提取可读文本
    for (let i = 0; i < view.length; i++) {
      // 跳过控制字符
      if (view[i] >= 32 && view[i] < 127) {
        text += String.fromCharCode(view[i]);
      }
    }
    
    return text;
  }

  /**
   * 查找主文档
   * @param {Object} files - ZIP文件内容
   * @returns {ArrayBuffer} 主文档内容
   */
  findMainDocument(files) {
    // 标准路径: word/document.xml
    if (files['word/document.xml']) {
      return files['word/document.xml'];
    }
    
    // 查找可能的路径
    for (const path in files) {
      if (path.endsWith('document.xml')) {
        return files[path];
      }
    }
    
    return null;
  }

  /**
   * 提取文档内容
   * @param {Document} xmlDoc - XML文档
   * @returns {Array} 内容数组
   */
  extractContent(xmlDoc) {
    const content = [];
    const paragraphs = xmlDoc.getElementsByTagNameNS('*', 'p');
    
    for (let i = 0; i < paragraphs.length; i++) {
      const para = paragraphs[i];
      const paragraphData = this.parseParagraph(para);
      if (paragraphData) {
        content.push(paragraphData);
      }
    }
    
    // 提取表格
    const tables = xmlDoc.getElementsByTagNameNS('*', 'tbl');
    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      const tableData = this.parseTable(table);
      if (tableData) {
        content.push(tableData);
      }
    }
    
    return content;
  }

  /**
   * 解析段落
   * @param {Element} para - 段落元素
   * @returns {Object|null} 段落数据
   */
  parseParagraph(para) {
    const runs = para.getElementsByTagNameNS('*', 'r');
    let text = '';
    const styles = {};
    
    for (let i = 0; i < runs.length; i++) {
      const run = runs[i];
      const textElement = run.getElementsByTagNameNS('*', 't')[0];
      if (textElement) {
        text += XMLUtils.getText(textElement);
      }
      
      // 提取样式
      this.extractRunStyles(run, styles);
    }
    
    if (!text.trim()) {
      return null;
    }
    
    return {
      type: 'paragraph',
      text: text,
      styles: styles
    };
  }

  /**
   * 提取运行样式
   * @param {Element} run - 运行元素
   * @param {Object} styles - 样式对象
   */
  extractRunStyles(run, styles) {
    const rPr = run.getElementsByTagNameNS('*', 'rPr')[0];
    if (!rPr) return;
    
    // 字体大小
    const sz = rPr.getElementsByTagNameNS('*', 'sz')[0];
    if (sz) {
      styles.fontSize = parseInt(XMLUtils.getAttribute(sz, 'val'), 10) / 2;
    }
    
    // 加粗
    const b = rPr.getElementsByTagNameNS('*', 'b')[0];
    if (b) {
      styles.bold = true;
    }
    
    // 斜体
    const i = rPr.getElementsByTagNameNS('*', 'i')[0];
    if (i) {
      styles.italic = true;
    }
    
    // 下划线
    const u = rPr.getElementsByTagNameNS('*', 'u')[0];
    if (u) {
      styles.underline = true;
    }
    
    // 颜色
    const color = rPr.getElementsByTagNameNS('*', 'color')[0];
    if (color) {
      const colorVal = XMLUtils.getAttribute(color, 'val');
      if (colorVal) {
        styles.color = this.parseColor(colorVal);
      }
    }
  }

  /**
   * 解析表格
   * @param {Element} table - 表格元素
   * @returns {Object} 表格数据
   */
  parseTable(table) {
    const rows = table.getElementsByTagNameNS('*', 'tr');
    const tableData = [];
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const cells = row.getElementsByTagNameNS('*', 'tc');
      const rowData = [];
      
      for (let j = 0; j < cells.length; j++) {
        const cell = cells[j];
        const cellText = this.extractCellText(cell);
        rowData.push(cellText);
      }
      
      if (rowData.length > 0) {
        tableData.push(rowData);
      }
    }
    
    return {
      type: 'table',
      rows: tableData
    };
  }

  /**
   * 提取单元格文本
   * @param {Element} cell - 单元格元素
   * @returns {string} 单元格文本
   */
  extractCellText(cell) {
    const runs = cell.getElementsByTagNameNS('*', 'r');
    let text = '';
    
    for (let i = 0; i < runs.length; i++) {
      const run = runs[i];
      const textElement = run.getElementsByTagNameNS('*', 't')[0];
      if (textElement) {
        text += XMLUtils.getText(textElement);
      }
    }
    
    return text;
  }

  /**
   * 解析颜色
   * @param {string} hexColor - 十六进制颜色
   * @returns {string} CSS颜色
   */
  parseColor(hexColor) {
    if (!hexColor) return '#000000';
    
    if (hexColor.length === 6) {
      return '#' + hexColor;
    } else if (hexColor.length === 8) {
      return '#' + hexColor.substring(2);
    }
    
    return '#000000';
  }

  /**
   * 提取文档元数据
   * @param {Document} xmlDoc - XML文档
   * @returns {Object} 元数据
   */
  extractMetadata(xmlDoc) {
    return {
      format: 'DOCX'
    };
  }

  /**
   * 获取文件元数据
   * @param {ArrayBuffer} fileData - 文件二进制数据
   * @returns {Object} 元数据
   */
  getMetadata(fileData) {
    const magic = BinaryUtils.readMagicNumber(fileData, 0, 8);
    
    if (magic.startsWith('504B0304')) {
      return {
        format: 'DOCX',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      };
    } else if (magic === 'D0CF11E0A1B11AE1') {
      return {
        format: 'DOC',
        mimeType: 'application/msword'
      };
    }
    
    return {
      format: 'Unknown'
    };
  }
}
