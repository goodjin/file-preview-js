/**
 * CSV解析器 - 解析CSV格式的文本文件
 * 纯JavaScript实现，不依赖任何第三方库
 */

/**
 * CSV解析器类
 */
export class CSVParser {
  /**
   * 构造函数
   * @param {Object} options - 解析选项
   * @param {string} options.delimiter - 分隔符，默认逗号
   * @param {string} options.quote - 引号字符，默认双引号
   * @param {string} options.escape - 转义字符，默认双引号
   * @param {boolean} options.hasHeader - 是否有标题行
   */
  constructor(options = {}) {
    this.delimiter = options.delimiter || ',';
    this.quote = options.quote || '"';
    this.escape = options.escape || '"';
    this.hasHeader = options.hasHeader !== undefined ? options.hasHeader : true;
    this.encoding = options.encoding || 'utf-8';
  }

  /**
   * 解析CSV文件
   * @param {ArrayBuffer} fileData - CSV文件二进制数据
   * @returns {Promise<Object>} 解析结果
   */
  async parse(fileData) {
    try {
      // 1. 解码文件内容
      const text = this.decodeFile(fileData);
      
      // 2. 解析CSV文本
      const result = this.parseText(text);
      
      // 3. 返回结构化数据
      return {
        type: 'csv',
        data: result.rows,
        metadata: {
          rowCount: result.rows.length,
          columnCount: result.columnCount,
          hasHeader: this.hasHeader,
          delimiter: this.delimiter,
          encoding: this.encoding
        }
      };
      
    } catch (error) {
      console.error('CSV解析失败:', error);
      throw new Error(`CSV解析失败: ${error.message}`);
    }
  }

  /**
   * 解码文件内容
   * @param {ArrayBuffer} fileData - 文件二进制数据
   * @returns {string} 解码后的文本
   */
  decodeFile(fileData) {
    const bytes = new Uint8Array(fileData);
    return new TextDecoder(this.encoding).decode(bytes);
  }

  /**
   * 解析CSV文本
   * @param {string} text - CSV文本
   * @returns {Object} 解析结果
   */
  parseText(text) {
    const rows = [];
    let maxColumnCount = 0;
    
    // 规范化换行符
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // 解析每一行
    const lines = this.splitLines(normalizedText);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 跳过空行
      if (!line.trim()) {
        continue;
      }
      
      // 解析行的列
      const columns = this.parseLine(line);
      maxColumnCount = Math.max(maxColumnCount, columns.length);
      
      rows.push({
        rowNum: i + 1,
        columns: columns,
        rawLine: line
      });
    }
    
    // 提取标题行（如果有）
    let headers = [];
    let dataRows = rows;
    
    if (this.hasHeader && rows.length > 0) {
      headers = rows[0].columns;
      dataRows = rows.slice(1);
    }
    
    return {
      rows: dataRows,
      headers: headers,
      columnCount: maxColumnCount,
      headerRow: this.hasHeader ? rows[0] : null
    };
  }

  /**
   * 解析单行
   * @param {string} line - CSV行
   * @returns {Array<string>} 列数组
   */
  parseLine(line) {
    const columns = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (inQuotes) {
        // 在引号内
        if (char === this.escape && nextChar === this.quote) {
          // 转义的引号
          current += this.quote;
          i += 2;
        } else if (char === this.quote) {
          // 引号结束
          inQuotes = false;
          i++;
        } else {
          // 普通字符
          current += char;
          i++;
        }
      } else {
        // 不在引号内
        if (char === this.quote) {
          // 引号开始
          inQuotes = true;
          i++;
        } else if (char === this.delimiter) {
          // 分隔符
          columns.push(current.trim());
          current = '';
          i++;
        } else {
          // 普通字符
          current += char;
          i++;
        }
      }
    }
    
    // 添加最后一列
    columns.push(current.trim());
    
    return columns;
  }

  /**
   * 分割行（处理引号内的换行）
   * @param {string} text - CSV文本
   * @returns {Array<string>} 行数组
   */
  splitLines(text) {
    const lines = [];
    let currentLine = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < text.length) {
      const char = text[i];
      
      if (char === this.quote) {
        // 切换引号状态
        inQuotes = !inQuotes;
        currentLine += char;
        i++;
      } else if (char === '\n' && !inQuotes) {
        // 换行且不在引号内
        lines.push(currentLine);
        currentLine = '';
        i++;
      } else {
        // 普通字符
        currentLine += char;
        i++;
      }
    }
    
    // 添加最后一行
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  }

  /**
   * 转换为数组（简化格式）
   * @param {ArrayBuffer} fileData - 文件数据
   * @returns {Promise<Array<Array<string>>>} 二维数组
   */
  async toArray(fileData) {
    const result = await this.parse(fileData);
    
    if (this.hasHeader && result.data.length > 0) {
      // 不包含标题行
      return result.data.map(row => row.columns);
    }
    
    return result.data.map(row => row.columns);
  }

  /**
   * 转换为对象数组（使用标题作为键）
   * @param {ArrayBuffer} fileData - 文件数据
   * @returns {Promise<Array<Object>>>} 对象数组
   */
  async toObjects(fileData) {
    const result = await this.parse(fileData);
    const { headers, data } = result;
    
    if (!this.hasHeader || headers.length === 0) {
      throw new Error('CSV需要标题行才能转换为对象数组');
    }
    
    // 将每一行转换为对象
    return data.map(row => {
      const obj = {};
      for (let i = 0; i < headers.length; i++) {
        const key = headers[i];
        const value = row.columns[i] !== undefined ? row.columns[i] : null;
        obj[key] = value;
      }
      return obj;
    });
  }

  /**
   * 验证文件格式
   * @param {ArrayBuffer} fileData - 文件数据
   * @returns {boolean} 是否为有效的CSV文件
   */
  validate(fileData) {
    try {
      // CSV是纯文本，尝试解码
      const text = this.decodeFile(fileData);
      
      // 检查是否包含有效的CSV内容
      if (!text || text.trim().length === 0) {
        return false;
      }
      
      // 检查是否包含分隔符
      if (!text.includes(this.delimiter)) {
        // 如果是单列，可能没有分隔符
        const lines = text.split('\n');
        return lines.length >= 1;
      }
      
      return true;
      
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取文件元数据
   * @param {ArrayBuffer} fileData - 文件数据
   * @returns {Object} 元数据
   */
  getMetadata(fileData) {
    try {
      const text = this.decodeFile(fileData);
      const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const lines = normalizedText.split('\n');
      const nonEmptyLines = lines.filter(line => line.trim().length > 0);
      
      // 估算列数
      const firstLine = nonEmptyLines[0] || '';
      const estimatedColumns = this.parseLine(firstLine).length;
      
      return {
        format: 'CSV',
        mimeType: 'text/csv',
        encoding: this.encoding,
        size: fileData.byteLength,
        estimatedRowCount: nonEmptyLines.length,
        estimatedColumnCount: estimatedColumns,
        delimiter: this.delimiter,
        hasHeader: this.hasHeader
      };
      
    } catch (error) {
      return {
        format: 'CSV',
        mimeType: 'text/csv',
        size: fileData.byteLength,
        error: error.message
      };
    }
  }

  /**
   * 生成CSV文本（用于导出）
   * @param {Array<Array<string>>} data - 数据数组
   * @param {boolean} includeHeader - 是否包含标题
   * @returns {string} CSV文本
   */
  generateCSV(data, includeHeader = true) {
    const lines = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const escapedColumns = row.map(column => this.escapeValue(column));
      lines.push(escapedColumns.join(this.delimiter));
    }
    
    return lines.join('\n');
  }

  /**
   * 转义值
   * @param {string} value - 值
   * @returns {string} 转义后的值
   */
  escapeValue(value) {
    if (value === null || value === undefined) {
      return '';
    }
    
    const strValue = String(value);
    
    // 如果包含分隔符、换行符或引号，用引号包裹
    if (strValue.includes(this.delimiter) || 
        strValue.includes('\n') || 
        strValue.includes(this.quote)) {
      // 转义引号
      return `${this.quote}${strValue.replace(new RegExp(this.quote, 'g'), this.escape + this.quote)}${this.quote}`;
    }
    
    return strValue;
  }
}
