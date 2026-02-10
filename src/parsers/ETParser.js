/**
 * WPS表格解析器 - 解析.ET格式的WPS表格文件
 * 纯JavaScript实现，不依赖任何第三方库
 */

import ZIPParser from '../../utils/ZIPParser.js';

/**
 * WPS表格解析器类
 */
export class ETParser {
  /**
   * 构造函数
   */
  constructor() {
    this.sharedStrings = [];
    this.workbook = null;
    this.etFiles = {};
  }

  /**
   * 解析WPS表格文件
   * @param {ArrayBuffer} fileData - .ET文件二进制数据
   * @returns {Promise<Object>} 解析结果
   */
  async parse(fileData) {
    try {
      // 1. 解压ZIP文件
      await this.parseZIP(fileData);
      
      // 2. 解析共享字符串表
      if (this.etFiles['SharedStrings.xml']) {
        await this.parseSharedStrings(this.etFiles['SharedStrings.xml']);
      }
      
      // 3. 解析工作簿
      if (this.etFiles['1.xml'] || this.etFiles['Workbook.xml']) {
        this.workbook = this.parseWorkbook(this.etFiles['1.xml'] || this.etFiles['Workbook.xml']);
      }
      
      // 4. 解析工作表
      const sheets = [];
      const worksheets = this.getWorksheetFiles();
      
      for (const sheetInfo of worksheets) {
        const sheetData = await this.parseWorksheet(sheetInfo.xmlData);
        sheets.push({
          name: sheetInfo.name,
          id: sheetInfo.id,
          data: sheetData
        });
      }
      
      // 5. 返回解析结果
      return {
        type: 'wps-table',
        version: 'et',
        sheets: sheets,
        metadata: {
          sheetCount: sheets.length,
          hasSharedStrings: this.sharedStrings.length > 0
        }
      };
      
    } catch (error) {
      console.error('WPS表格解析失败:', error);
      throw new Error(`WPS表格解析失败: ${error.message}`);
    }
  }

  /**
   * 解析ZIP文件
   * @param {ArrayBuffer} fileData - .ET文件二进制数据
   * @returns {Promise<void>}
   */
  async parseZIP(fileData) {
    const zipParser = new ZIPParser();
    const zipResult = await zipParser.parse(fileData);
    
    // 将ZIPParser返回的文件列表转换为文件名->内容的映射
    this.etFiles = {};
    for (const fileInfo of zipResult.files) {
      try {
        const content = await zipParser.readFile(fileInfo.name);
        this.etFiles[fileInfo.name] = content.buffer;
      } catch (error) {
        console.warn(`读取ZIP文件失败: ${fileInfo.name}`, error);
      }
    }
  }

  /**
   * 获取工作表文件列表
   * @returns {Array} 工作表信息数组
   */
  getWorksheetFiles() {
    const worksheets = [];
    
    // WPS表格的工作表文件命名规则: 2.xml, 3.xml, 4.xml, ...
    if (this.workbook && this.workbook.sheets) {
      for (const sheet of this.workbook.sheets) {
        const fileName = `${sheet.fileName}`;
        if (this.etFiles[fileName]) {
          worksheets.push({
            name: sheet.name,
            id: sheet.id,
            fileName: sheet.fileName,
            xmlData: this.etFiles[fileName]
          });
        }
      }
    }
    
    return worksheets;
  }

  /**
   * 解析共享字符串表
   * @param {ArrayBuffer} xmlData - SharedStrings.xml数据
   */
  async parseSharedStrings(xmlData) {
    const text = this.decodeXML(xmlData);
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'application/xml');
    
    const sst = doc.getElementsByTagName('sst')[0];
    if (!sst) return;
    
    const items = doc.getElementsByTagName('si');
    this.sharedStrings = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const textNode = item.getElementsByTagName('t')[0];
      if (textNode) {
        this.sharedStrings.push(textNode.textContent);
      } else {
        this.sharedStrings.push('');
      }
    }
  }

  /**
   * 解析工作簿
   * @param {ArrayBuffer} xmlData - 1.xml或Workbook.xml数据
   * @returns {Object} 工作簿信息
   */
  parseWorkbook(xmlData) {
    const text = this.decodeXML(xmlData);
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'application/xml');
    
    const sheets = [];
    const sheetElements = doc.getElementsByTagName('sheet');
    
    for (let i = 0; i < sheetElements.length; i++) {
      const sheet = sheetElements[i];
      const id = sheet.getAttribute('sheetId') || (i + 1);
      const name = sheet.getAttribute('name') || `Sheet${i + 1}`;
      const fileName = sheet.getAttribute('filename') || `${i + 2}.xml`;
      
      sheets.push({
        id: parseInt(id),
        name: name,
        fileName: fileName
      });
    }
    
    return { sheets };
  }

  /**
   * 解析工作表
   * @param {ArrayBuffer} xmlData - 工作表XML数据
   * @returns {Object} 工作表数据
   */
  async parseWorksheet(xmlData) {
    const text = this.decodeXML(xmlData);
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'application/xml');
    
    const worksheet = {
      rows: [],
      dimensions: null
    };
    
    // 解析维度信息（工作表范围）
    const dimension = doc.getElementsByTagName('dimension')[0];
    if (dimension) {
      worksheet.dimensions = dimension.getAttribute('ref');
    }
    
    // 解析行数据
    const sheetData = doc.getElementsByTagName('sheetData')[0];
    if (!sheetData) return worksheet;
    
    const rows = sheetData.getElementsByTagName('row');
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = parseInt(row.getAttribute('r') || (i + 1));
      const cells = [];
      
      const cellElements = row.getElementsByTagName('c');
      for (let j = 0; j < cellElements.length; j++) {
        const cell = this.parseCell(cellElements[j]);
        if (cell) {
          cells.push(cell);
        }
      }
      
      worksheet.rows.push({
        rowNum: rowNum,
        cells: cells
      });
    }
    
    return worksheet;
  }

  /**
   * 解析单元格
   * @param {Element} cellElement - 单元格DOM元素
   * @returns {Object} 单元格数据
   */
  parseCell(cellElement) {
    const ref = cellElement.getAttribute('r');
    const type = cellElement.getAttribute('t');
    
    // 获取单元格值
    const valueElement = cellElement.getElementsByTagName('v')[0];
    const formulaElement = cellElement.getElementsByTagName('f')[0];
    
    let value = null;
    let formula = null;
    
    if (valueElement) {
      const rawValue = valueElement.textContent;
      
      // 根据类型解析值
      switch (type) {
        case 's': // 共享字符串
          const index = parseInt(rawValue);
          value = this.sharedStrings[index] || '';
          break;
        case 'n': // 数字
          value = parseFloat(rawValue);
          break;
        case 'b': // 布尔值
          value = rawValue === '1';
          break;
        case 'str': // 字符串
          value = rawValue;
          break;
        default: // 自动类型
          value = rawValue;
      }
    }
    
    if (formulaElement) {
      formula = formulaElement.textContent;
    }
    
    // 解析列和行
    const { col, row } = this.parseCellReference(ref);
    
    return {
      ref: ref,
      col: col,
      row: row,
      value: value,
      type: type || null,
      formula: formula
    };
  }

  /**
   * 解析单元格引用（如 A1, B10）
   * @param {string} ref - 单元格引用
   * @returns {Object} {col: 0-based, row: 0-based}
   */
  parseCellReference(ref) {
    const match = ref.match(/^([A-Z]+)(\d+)$/);
    if (!match) {
      return { col: 0, row: 0 };
    }
    
    const colStr = match[1];
    const rowStr = match[2];
    
    // 转换列字母为数字
    let col = 0;
    for (let i = 0; i < colStr.length; i++) {
      col = col * 26 + (colStr.charCodeAt(i) - 64);
    }
    col = col - 1;
    
    const row = parseInt(rowStr) - 1;
    
    return { col, row };
  }

  /**
   * 解码XML数据
   * @param {ArrayBuffer} data - 二进制数据
   * @returns {string} XML文本
   */
  decodeXML(data) {
    const bytes = new Uint8Array(data);
    return new TextDecoder('utf-8').decode(bytes);
  }

  /**
   * 验证文件格式
   * @param {ArrayBuffer} fileData - 文件数据
   * @returns {boolean} 是否为有效的.ET文件
   */
  validate(fileData) {
    const bytes = new Uint8Array(fileData);
    // 检查ZIP签名
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4B) {
      return false;
    }
    return true;
  }

  /**
   * 获取文件元数据
   * @param {ArrayBuffer} fileData - 文件数据
   * @returns {Object} 元数据
   */
  getMetadata(fileData) {
    return {
      format: 'ET',
      mimeType: 'application/vnd.ms-excel',
      size: fileData.byteLength
    };
  }
}
