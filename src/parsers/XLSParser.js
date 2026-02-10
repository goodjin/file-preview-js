/**
 * XLS解析器 - 解析.xls格式的Excel文件
 * 纯JavaScript实现，不依赖任何第三方库
 */

import OLE2Parser from '../../utils/OLE2Parser.js';

/**
 * XLS解析器类
 */
export class XLSParser {
  /**
   * 构造函数
   */
  constructor() {
    this.workbook = null;
    this.worksheets = [];
    this.biffRecords = [];
  }

  /**
   * 解析XLS文件
   * @param {ArrayBuffer} fileData - XLS文件二进制数据
   * @returns {Promise<Object>} 解析结果
   */
  async parse(fileData) {
    try {
      // 1. 解析OLE2复合文档
      const ole2Parser = new OLE2Parser();
      const structure = await ole2Parser.parse(fileData);
      
      // 2. 找到Workbook流
      const workbookStream = this.findWorkbookStream(structure);
      
      if (!workbookStream) {
        throw new Error('Workbook stream not found');
      }
      
      // 3. 解析BIFF记录
      await this.parseBIFFRecords(workbookStream);
      
      // 4. 提取工作表和单元格数据
      const worksheets = this.extractWorksheets();
      
      // 5. 返回解析结果
      return {
        type: 'excel',
        version: 'xls',
        sheets: worksheets,
        metadata: {
          sheetCount: worksheets.length,
          biffVersion: workbookStream.biffVersion,
          oleFormat: 'compound'
        }
      };
      
    } catch (error) {
      console.error('XLS解析失败:', error);
      throw new Error(`XLS解析失败: ${error.message}`);
    }
  }

  /**
   * 查找Workbook流
   * @param {Object} structure - OLE2文档结构
   * @returns {Object|null} Workbook流信息
   */
  findWorkbookStream(structure) {
    // 查找"Workbook"或"Book"流
    const possibleNames = ['Workbook', 'Book', '工作簿'];
    
    for (const name of possibleNames) {
      if (structure.streams && structure.streams[name]) {
        return {
          name: name,
          data: structure.streams[name],
          biffVersion: this.detectBIFFVersion(structure.streams[name])
        };
      }
    }
    
    return null;
  }

  /**
   * 检测BIFF版本
   * @param {Uint8Array} streamData - 流数据
   * @returns {string} BIFF版本
   */
  detectBIFFVersion(streamData) {
    // 检查开头的BOF记录
    if (streamData.length < 8) {
      return 'BIFF2';
    }
    
    const bofRecordId = streamData[0];
    
    // BOF记录ID
    if (bofRecordId === 0x09) {
      return 'BIFF2';
    } else if (bofRecordId === 0x01) {
      // 检查版本号
      const version = streamData[2];
      if (version === 0x00) {
        return 'BIFF3';
      } else if (version === 0x02) {
        return 'BIFF4';
      } else if (version === 0x04) {
        return 'BIFF5';
      } else if (version === 0x08) {
        return 'BIFF8';
      }
    }
    
    return 'BIFF8';
  }

  /**
   * 解析BIFF记录
   * @param {Object} workbookStream - Workbook流
   */
  async parseBIFFRecords(workbookStream) {
    const streamData = workbookStream.data;
    let offset = 0;
    const length = streamData.length;
    
    this.biffRecords = [];
    
    while (offset < length) {
      const record = this.parseBIFFRecord(streamData, offset);
      
      if (!record) {
        break;
      }
      
      this.biffRecords.push(record);
      offset += record.length;
      
      // 如果遇到EOF记录，停止解析
      if (record.id === 0x0A) {
        break;
      }
    }
  }

  /**
   * 解析单个BIFF记录
   * @param {Uint8Array} streamData - 流数据
   * @param {number} offset - 偏移量
   * @returns {Object|null} BIFF记录
   */
  parseBIFFRecord(streamData, offset) {
    if (offset >= streamData.length) {
      return null;
    }
    
    const recordId = streamData[offset];
    const length = this.readUInt16(streamData, offset + 2);
    const recordLength = length + 4;
    
    if (offset + recordLength > streamData.length) {
      return null;
    }
    
    let recordData = null;
    if (length > 0) {
      recordData = new Uint8Array(streamData.subarray(offset + 4, offset + recordLength));
    }
    
    return {
      id: recordId,
      length: length,
      totalLength: recordLength,
      data: recordData,
      offset: offset
    };
  }

  /**
   * 提取工作表
   * @returns {Array<Object>} 工作表数组
   */
  extractWorksheets() {
    const worksheets = [];
    let currentWorksheet = null;
    let currentRow = [];
    let currentCell = null;
    
    for (const record of this.biffRecords) {
      switch (record.id) {
        case 0x09: // BOF
          currentWorksheet = this.createWorksheet();
          break;
          
        case 0x08: // BOUNDSHEET
          this.parseBoundsheet(record.data, currentWorksheet);
          break;
          
        case 0x06: // ROW
          currentRow = [];
          currentWorksheet.rows.push(currentRow);
          break;
          
        case 0x01: // BLANK
          currentCell = null;
          break;
          
        case 0x00: // INTEGER
          if (currentCell && record.length >= 2) {
            const value = this.readInteger(record.data, 0);
            currentCell.value = value;
            currentCell.type = 'number';
            currentRow.push(currentCell);
          }
          break;
          
        case 0x03: // NUMBER
          if (currentCell && record.length >= 8) {
            const value = this.readNumber(record.data, 0);
            currentCell.value = value;
            currentCell.type = 'number';
            currentRow.push(currentCell);
          }
          break;
          
        case 0x07: // RK
          if (currentCell && record.length >= 4) {
            const value = this.readRK(record.data, 0);
            currentCell.value = value;
            currentCell.type = 'number';
            currentRow.push(currentCell);
          }
          break;
          
        case 0x05: // LABEL
          if (currentCell && record.length >= 2) {
            const value = this.readLabel(record.data, 0);
            currentCell.value = value;
            currentCell.type = 'string';
            currentRow.push(currentCell);
          }
          break;
          
        case 0x0A: // EOF
          if (currentWorksheet && currentRow.length > 0) {
            currentWorksheet.rows.push(currentRow);
            worksheets.push(currentWorksheet);
          }
          break;
          
        default:
          // 其他记录类型，暂时忽略
          break;
      }
    }
    
    return worksheets;
  }

  /**
   * 创建新工作表
   * @returns {Object} 工作表对象
   */
  createWorksheet() {
    return {
      name: 'Sheet',
      bounds: { left: 0, top: 0, right: 0, bottom: 0 },
      rows: []
    };
  }

  /**
   * 解析BOUNDSHEET记录
   * @param {Uint8Array} data - 记录数据
   * @param {Object} worksheet - 工作表对象
   */
  parseBoundsheet(data, worksheet) {
    if (data.length < 8) {
      return;
    }
    
    const row = this.readUInt16(data, 0);
    const col = this.readUInt16(data, 2);
    const firstRow = this.readUInt16(data, 4);
    const lastRow = this.readUInt16(data, 6);
    
    worksheet.bounds = {
      left: col,
      top: row,
      right: 0,
      bottom: 0,
      firstRow: firstRow,
      lastRow: lastRow
    };
    
    // 简化工作表名称
    worksheet.name = `Sheet${this.worksheets.length + 1}`;
    this.worksheets.push(worksheet);
  }

  /**
   * 读取16位无符号整数
   * @param {Uint8Array} data - 数据
   * @param {number} offset - 偏移
   * @returns {number} 整数值
   */
  readUInt16(data, offset) {
    return (data[offset] | (data[offset + 1] << 8)) >>> 0;
  }

  /**
   * 读取32位无符号整数
   * @param {Uint8Array} data - 数据
   * @param {number} offset - 偏移
   * @returns {number} 整数值
   */
  readUInt32(data, offset) {
    return (data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)) >>> 0;
  }

  /**
   * 读取整数
   * @param {Uint8Array} data - 数据
   * @param {number} offset - 偏移
   * @returns {number} 整数值
   */
  readInteger(data, offset) {
    const isSigned = (data[1] & 0x01) === 0x01;
    const value = this.readInt16(data, 2);
    
    return isSigned ? value : (value >>> 0);
  }

  /**
   * 读取16位有符号整数
   * @param {Uint8Array} data - 数据
   * @param {number} offset - 偏移
   * @returns {number} 整数值
   */
  readInt16(data, offset) {
    return (data[offset] | (data[offset + 1] << 8));
  }

  /**
   * 读取IEEE 754浮点数
   * @param {Uint8Array} data - 数据
   * @param {number} offset - 偏移
   * @returns {number} 浮点数值
   */
  readNumber(data, offset) {
    const view = new DataView(data.buffer, data.byteOffset + offset, 8);
    return view.getFloat64(0, true);
  }

  /**
   * 读取RK值
   * @param {Uint8Array} data - 数据
   * @param {number} offset - 偏移
   * @returns {number} RK值
   */
  readRK(data, offset) {
    const rk = this.readUInt32(data, offset);
    
    // RK编码格式
    const isInt100 = (rk & 0x01) === 0;
    const isInt16 = (rk & 0x02) === 0;
    
    if (isInt100) {
      return (rk >>> 16) / 100;
    } else if (isInt16) {
      return ((rk & 0xFFFF) << 16) >> 16;
    } else {
      return rk / 100;
    }
  }

  /**
   * 读取字符串
   * @param {Uint8Array} data - 数据
   * @param {number} offset - 偏移
   * @returns {string} 字符串
   */
  readLabel(data, offset) {
    const length = data[0];
    
    if (length === 0) {
      return '';
    }
    
    let str = '';
    for (let i = 1; i <= length && (offset + i) < data.length; i++) {
      const charCode = data[offset + i];
      str += String.fromCharCode(charCode);
    }
    
    return str;
  }

  /**
   * 验证文件格式
   * @param {ArrayBuffer} fileData - 文件数据
   * @returns {boolean} 是否为有效的XLS文件
   */
  validate(fileData) {
    const bytes = new Uint8Array(fileData);
    
    // 检查OLE2签名
    if (bytes.length < 8) {
      return false;
    }
    
    const ole2Signature = [
      0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1
    ];
    
    for (let i = 0; i < 8; i++) {
      if (bytes[i] !== ole2Signature[i]) {
        return false;
      }
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
      format: 'XLS',
      mimeType: 'application/vnd.ms-excel',
      size: fileData.byteLength
    };
  }
}
