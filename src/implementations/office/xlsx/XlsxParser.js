/**
 * XlsxParser - xlsx文件解析器
 * 基于SheetJS库实现xlsx文件解析
 */

import * as XLSX from 'xlsx';

export class XlsxParser {
  constructor() {
    this.workbook = null;
    this.currentSheetIndex = 0;
  }

  /**
   * 解析xlsx文件
   * @param {File|ArrayBuffer} file - xlsx文件对象或ArrayBuffer
   * @returns {Promise<Object>} 解析结果
   */
  async parse(file) {
    try {
      let data;
      if (file instanceof File) {
        data = await this._readFile(file);
      } else {
        data = file;
      }

      // 使用SheetJS解析
      this.workbook = XLSX.read(data, {
        type: 'array',
        cellStyles: true,
        cellHTML: false
      });

      // 提取工作表数据
      const sheets = [];
      this.workbook.SheetNames.forEach((name, index) => {
        const worksheet = this.workbook.Sheets[name];
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
        
        sheets.push({
          name,
          data: this._extractSheetData(worksheet, range),
          mergedCells: this._extractMergedCells(worksheet),
          rowCount: range.e.r + 1,
          colCount: range.e.c + 1
        });
      });

      return {
        sheets,
        currentSheetIndex: 0,
        sheetCount: sheets.length
      };
    } catch (error) {
      throw new Error(`解析xlsx文件失败: ${error.message}`);
    }
  }

  /**
   * 读取文件为ArrayBuffer
   */
  _readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * 提取工作表数据
   */
  _extractSheetData(worksheet, range) {
    const data = [];
    for (let r = range.s.r; r <= range.e.r; r++) {
      const row = [];
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        const cell = worksheet[cellRef];
        
        row.push({
          value: cell ? (cell.v !== undefined ? cell.v : '') : '',
          type: cell ? cell.t : 's',
          style: cell && cell.s ? this._extractStyle(cell.s) : null
        });
      }
      data.push(row);
    }
    return data;
  }

  /**
   * 提取单元格样式
   */
  _extractStyle(style) {
    return {
      font: style.font ? {
        name: style.font.name,
        size: style.font.sz,
        bold: style.font.bold,
        italic: style.font.italic,
        color: style.font.color ? style.font.color.rgb : null
      } : null,
      fill: style.fill && style.fill.fgColor ? {
        color: style.fill.fgColor.rgb
      } : null,
      alignment: style.alignment ? {
        horizontal: style.alignment.horizontal,
        vertical: style.alignment.vertical,
        wrapText: style.alignment.wrapText
      } : null,
      border: style.border ? {
        top: style.border.top,
        right: style.border.right,
        bottom: style.border.bottom,
        left: style.border.left
      } : null
    };
  }

  /**
   * 提取合并单元格
   */
  _extractMergedCells(worksheet) {
    const merges = [];
    if (worksheet['!merges']) {
      worksheet['!merges'].forEach(merge => {
        merges.push({
          startRow: merge.s.r,
          startCol: merge.s.c,
          endRow: merge.e.r,
          endCol: merge.e.c
        });
      });
    }
    return merges;
  }

  /**
   * 销毁解析器，释放资源
   */
  destroy() {
    this.workbook = null;
    this.currentSheetIndex = 0;
  }
}
