/**
 * Excel解析器 - 解析XLSX格式的Excel文件
 * 基于Office Open XML规范，纯JavaScript实现
 */

import ZIPParser from '../../utils/ZIPParser.js';

/**
 * Excel解析器类
 */
export class ExcelParser {
  /**
   * 构造函数
   */
  constructor() {
    this.sharedStrings = [];
    this.styles = [];
    this.workbook = null;
    this.zipFiles = {};
  }

  /**
   * 解析Excel文件
   * @param {ArrayBuffer} fileData - XLSX文件二进制数据
   * @returns {Promise<Object>} 解析结果
   */
  async parse(fileData) {
    try {
      // 1. 解压ZIP文件
      const zipResult = await this.parseZIP(fileData);
      
      // 2. 解析共享字符串表
      if (this.zipFiles['xl/sharedStrings.xml']) {
        await this.parseSharedStrings(this.zipFiles['xl/sharedStrings.xml']);
      }
      
      // 3. 解析样式
      if (this.zipFiles['xl/styles.xml']) {
        await this.parseStyles(this.zipFiles['xl/styles.xml']);
      }
      
      // 4. 解析工作簿
      if (this.zipFiles['xl/workbook.xml']) {
        this.workbook = this.parseWorkbook(this.zipFiles['xl/workbook.xml']);
      }
      
      // 5. 解析工作表
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
      
      // 6. 返回解析结果
      return {
        type: 'excel',
        version: 'xlsx',
        sheets: sheets,
        metadata: {
          sheetCount: sheets.length,
          hasSharedStrings: this.sharedStrings.length > 0,
          hasStyles: this.styles.length > 0
        }
      };
      
    } catch (error) {
      console.error('Excel解析失败:', error);
      throw new Error(`Excel解析失败: ${error.message}`);
    }
  }

  /**
   * 解析ZIP文件
   * @param {ArrayBuffer} fileData - XLSX文件二进制数据
   * @returns {Promise<void>}
   */
  async parseZIP(fileData) {
    const zipParser = new ZIPParser();
    const zipResult = await zipParser.parse(fileData);
    
    // 将ZIPParser返回的文件列表转换为文件名->内容的映射
    this.zipFiles = {};
    for (const fileInfo of zipResult.files) {
      try {
        // 使用ZIPParser的readFile方法读取文件内容
        const content = await zipParser.readFile(fileInfo.name);
        this.zipFiles[fileInfo.name] = content.buffer;
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
    
    // 遍历工作簿中的sheet定义
    if (this.workbook && this.workbook.sheets) {
      for (const sheet of this.workbook.sheets) {
        const fileName = `xl/worksheets/${sheet.fileName}`;
        if (this.zipFiles[fileName]) {
          worksheets.push({
            name: sheet.name,
            id: sheet.id,
            fileName: sheet.fileName,
            xmlData: this.zipFiles[fileName]
          });
        }
      }
    }
    
    return worksheets;
  }

  /**
   * 解析共享字符串表
   * @param {ArrayBuffer} xmlData - sharedStrings.xml数据
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
   * 解析样式表
   * @param {ArrayBuffer} xmlData - styles.xml数据
   */
  async parseStyles(xmlData) {
    const text = this.decodeXML(xmlData);
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'application/xml');
    
    const cellXfs = doc.getElementsByTagName('cellXfs')[0];
    if (!cellXfs) return;
    
    const xfs = cellXfs.getElementsByTagName('xf');
    this.styles = [];
    
    for (let i = 0; i < xfs.length; i++) {
      const xf = xfs[i];
      const style = {
        fontId: parseInt(xf.getAttribute('fontId') || '0'),
        fillId: parseInt(xf.getAttribute('fillId') || '0'),
        borderId: parseInt(xf.getAttribute('borderId') || '0'),
        numFmtId: parseInt(xf.getAttribute('numFmtId') || '0'),
        applyFont: xf.getAttribute('applyFont') === '1',
        applyFill: xf.getAttribute('applyFill') === '1',
        applyBorder: xf.getAttribute('applyBorder') === '1'
      };
      this.styles.push(style);
    }
  }

  /**
   * 解析工作簿
   * @param {ArrayBuffer} xmlData - workbook.xml数据
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
      const id = sheet.getAttribute('sheetId');
      const name = sheet.getAttribute('name');
      const rId = sheet.getAttribute('r:id');
      
      // 从rId中提取文件名（rId1 -> sheet1.xml）
      const fileName = this.getWorksheetFileName(rId, i);
      
      sheets.push({
        id: parseInt(id),
        name: name,
        rId: rId,
        fileName: fileName
      });
    }
    
    return { sheets };
  }

  /**
   * 从rId获取工作表文件名
   * @param {string} rId - 关系ID
   * @param {number} index - 索引
   * @returns {string} 文件名
   */
  getWorksheetFileName(rId, index) {
    // 简化处理：rId1 -> sheet1.xml, rId2 -> sheet2.xml
    const match = rId.match(/rId(\d+)/);
    if (match) {
      return `sheet${match[1]}.xml`;
    }
    return `sheet${index + 1}.xml`;
  }

  /**
   * 解析工作表
   * @param {ArrayBuffer} xmlData - worksheet.xml数据
   * @returns {Object} 工作表数据
   */
  async parseWorksheet(xmlData) {
    const text = this.decodeXML(xmlData);
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'application/xml');
    
    const worksheet = {
      rows: [],
      mergeCells: [],
      dimensions: null
    };
    
    // 解析维度信息（工作表范围）
    const dimension = doc.getElementsByTagName('dimension')[0];
    if (dimension) {
      worksheet.dimensions = dimension.getAttribute('ref');
    }
    
    // 解析合并单元格
    const mergeCells = doc.getElementsByTagName('mergeCells')[0];
    if (mergeCells) {
      const mergeCellArray = mergeCells.getElementsByTagName('mergeCell');
      for (let i = 0; i < mergeCellArray.length; i++) {
        worksheet.mergeCells.push(mergeCellArray[i].getAttribute('ref'));
      }
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
    const styleIndex = parseInt(cellElement.getAttribute('s') || '0');
    
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
        case 'e': // 错误
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
      formula: formula,
      style: this.styles[styleIndex] || null
    };
  }

  /**
   * 解析单元格引用（如 A1, B10）
   * @param {string} ref - 单元格引用
   * @returns {Object} {col: 0-based, row: 0-based}
   */
  parseCellReference(ref) {
    // 匹配列字母和行数字
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
   * @returns {boolean} 是否为有效的XLSX文件
   */
  validate(fileData) {
    // 检查ZIP签名
    const bytes = new Uint8Array(fileData);
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
      format: 'XLSX',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: fileData.byteLength
    };
  }
}
