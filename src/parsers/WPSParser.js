/**
 * WPS解析器
 * 纯JavaScript实现的WPS文档解析器，支持.wps格式
 * 
 * @class WPSParser
 * @description 解析WPS文档，提取文本、样式、图片、表格等内容
 * @author 文件预览系统研发团队
 */

import ZIPParser from '../utils/ZIPParser.js';

/**
 * WPS解析器类
 */
class WPSParser {
  /**
   * 构造函数
   * @constructor
   */
  constructor() {
    this.zipParser = new ZIPParser();
    this.parsedData = null;
  }

  /**
   * 解析WPS文档
   * @param {ArrayBuffer} fileData - WPS文件二进制数据
   * @returns {Promise<Object>} 解析结果
   * @throws {Error} 当文件格式无效时抛出错误
   * 
   * @example
   * const parser = new WPSParser();
   * const result = await parser.parse(fileData);
   * console.log(result.content);
   */
  async parse(fileData) {
    // 使用ZIPParser解压WPS文件
    const zipResult = await this.zipParser.parse(fileData);

    // 解析主文档
    const documentContent = await this.parseMainDocument();

    // 解析样式
    const styles = await this.parseStyles();

    // 提取图片
    const images = await this.extractImages();

    // 构建解析结果
    this.parsedData = {
      type: 'wps',
      format: 'WPS',
      content: documentContent,
      styles,
      images,
      metadata: this.zipParser.getMetadata()
    };

    return this.parsedData;
  }

  /**
   * 验证WPS文档格式
   * @param {ArrayBuffer} fileData - WPS文件二进制数据
   * @returns {Promise<boolean>} 是否为有效的WPS文件
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
   * @param {ArrayBuffer} fileData - WPS文件二进制数据
   * @returns {Promise<Object>} 元数据
   */
  async getMetadata(fileData) {
    if (!this.parsedData) {
      await this.parse(fileData);
    }
    return this.parsedData.metadata;
  }

  /**
   * 解析主文档
   * @returns {Promise<Array>} 文档内容数组
   * @private
   */
  async parseMainDocument() {
    // 尝试多个可能的文档路径
    const possiblePaths = ['document.xml', 'doc.xml', 'content.xml'];
    let xmlContent = null;

    for (const path of possiblePaths) {
      try {
        xmlContent = await this.zipParser.readFile(path);
        if (xmlContent) break;
      } catch (error) {
        continue;
      }
    }

    if (!xmlContent) {
      throw new Error('Failed to find main document in WPS file');
    }

    const xmlText = new TextDecoder().decode(xmlContent);
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

    return this.extractContentFromXML(xmlDoc);
  }

  /**
   * 从XML中提取内容
   * @param {Document} xmlDoc - XML文档对象
   * @returns {Array} 内容数组
   * @private
   */
  extractContentFromXML(xmlDoc) {
    const content = [];

    // 尝试多种可能的元素命名空间
    const paragraphSelectors = [
      'w\\:p',
      'p',
      'text\\:p',
      'draw\\:p',
      'wp\\:p'
    ];

    for (const selector of paragraphSelectors) {
      try {
        const paragraphs = xmlDoc.getElementsByTagNameNS('*', 'p');
        if (paragraphs.length > 0) {
          for (const paragraph of paragraphs) {
            const paraData = this.parseParagraph(paragraph);
            if (paraData) {
              content.push(paraData);
            }
          }
          if (content.length > 0) break;
        }
      } catch (error) {
        continue;
      }
    }

    // 如果没有找到段落，尝试查找表格
    if (content.length === 0) {
      const tables = xmlDoc.getElementsByTagNameNS('*', 'table');
      for (const table of tables) {
        const tableData = this.parseTable(table);
        if (tableData) {
          content.push(tableData);
        }
      }
    }

    return content;
  }

  /**
   * 解析段落
   * @param {Element} paragraphElement - 段落元素
   * @returns {Object|null} 段落数据
   * @private
   */
  parseParagraph(paragraphElement) {
    const texts = this.extractTextFromElement(paragraphElement);
    const styles = this.parseParagraphStyles(paragraphElement);

    if (texts.length === 0) {
      return null;
    }

    return {
      type: 'paragraph',
      text: texts.join(''),
      runs: texts.map(t => ({ text: t, styles: {} })),
      styles
    };
  }

  /**
   * 从元素中提取文本
   * @param {Element} element - XML元素
   * @returns {Array<string>} 文本数组
   * @private
   */
  extractTextFromElement(element) {
    const texts = [];
    const textElements = element.getElementsByTagNameNS('*', 't');

    for (const textElement of textElements) {
      const text = textElement.textContent;
      if (text) {
        texts.push(text);
      }
    }

    // 如果没有找到t元素，直接获取文本内容
    if (texts.length === 0 && element.textContent) {
      texts.push(element.textContent);
    }

    return texts;
  }

  /**
   * 解析段落样式
   * @param {Element} paragraphElement - 段落元素
   * @returns {Object} 样式对象
   * @private
   */
  parseParagraphStyles(paragraphElement) {
    const styles = {};

    // 尝试多种可能的样式属性
    const styleAttributes = ['align', 'text-align', 'w:jc', 'jc'];
    for (const attr of styleAttributes) {
      const value = paragraphElement.getAttribute(attr);
      if (value) {
        styles.align = value;
        break;
      }
    }

    return styles;
  }

  /**
   * 解析表格
   * @param {Element} tableElement - 表格元素
   * @returns {Object|null} 表格数据
   * @private
   */
  parseTable(tableElement) {
    const rows = tableElement.getElementsByTagNameNS('*', 'row');
    if (rows.length === 0) {
      rows.push(...tableElement.getElementsByTagNameNS('*', 'tr'));
    }

    if (rows.length === 0) return null;

    const tableData = [];

    for (const row of rows) {
      const cells = row.getElementsByTagNameNS('*', 'cell');
      if (cells.length === 0) {
        cells.push(...row.getElementsByTagNameNS('*', 'td'));
        cells.push(...row.getElementsByTagNameNS('*', 'tc'));
      }

      const rowData = [];
      for (const cell of cells) {
        const cellText = this.extractTextFromElement(cell).join('');
        rowData.push(cellText);
      }

      if (rowData.length > 0) {
        tableData.push({
          type: 'row',
          cells: rowData
        });
      }
    }

    if (tableData.length === 0) return null;

    return {
      type: 'table',
      rows: tableData
    };
  }

  /**
   * 解析样式文件
   * @returns {Promise<Object>} 样式定义
   * @private
   */
  async parseStyles() {
    const possiblePaths = ['styles.xml', 'style.xml'];

    for (const path of possiblePaths) {
      try {
        const xmlContent = await this.zipParser.readFile(path);
        const xmlText = new TextDecoder().decode(xmlContent);
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

        const styles = {};
        const styleElements = xmlDoc.getElementsByTagNameNS('*', 'style');

        for (const styleElement of styleElements) {
          const styleId = styleElement.getAttribute('id') || 
                         styleElement.getAttribute('name');
          if (styleId) {
            styles[styleId] = {
              name: styleId,
              attributes: this.extractStyleAttributes(styleElement)
            };
          }
        }

        return styles;
      } catch (error) {
        continue;
      }
    }

    return {};
  }

  /**
   * 提取样式属性
   * @param {Element} styleElement - 样式元素
   * @returns {Object} 属性对象
   * @private
   */
  extractStyleAttributes(styleElement) {
    const attributes = {};

    // 提取所有属性
    for (let i = 0; i < styleElement.attributes.length; i++) {
      const attr = styleElement.attributes[i];
      attributes[attr.name] = attr.value;
    }

    return attributes;
  }

  /**
   * 提取嵌入图片
   * @returns {Promise<Array>} 图片数组
   * @private
   */
  async extractImages() {
    const images = [];

    try {
      const fileList = await this.zipParser.parse(new ArrayBuffer(0));
      const files = fileList.files || [];

      for (const file of files) {
        if (this.isImageFile(file.name)) {
          try {
            const imageData = await this.zipParser.readFile(file.name);
            const mimeType = this.getMimeTypeFromFileName(file.name);
            
            images.push({
              id: file.name,
              name: file.name,
              data: `data:${mimeType};base64,${this.arrayBufferToBase64(imageData)}`,
              mimeType
            });
          } catch (error) {
            console.warn(`Failed to extract image ${file.name}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to extract images:', error.message);
    }

    return images;
  }

  /**
   * 判断是否为图片文件
   * @param {string} fileName - 文件名
   * @returns {boolean} 是否为图片
   * @private
   */
  isImageFile(fileName) {
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.webp'];
    const lowerName = fileName.toLowerCase();
    return imageExtensions.some(ext => lowerName.endsWith(ext));
  }

  /**
   * 根据文件名获取MIME类型
   * @param {string} fileName - 文件名
   * @returns {string} MIME类型
   * @private
   */
  getMimeTypeFromFileName(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const mimeTypes = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'tiff': 'image/tiff',
      'webp': 'image/webp'
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

export default WPSParser;
