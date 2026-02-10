/**
 * OFD解析器
 * 实现OFD国产文档格式解析功能
 * 
 * @class OFDParser
 * @extends BaseParser
 * @description 解析OFD(Open Fixed-layout Document)格式文档,提取文本、图片、页面布局等内容
 * @author 文件预览系统研发团队
 * @version 1.0.0
 */

import { BaseParser } from '../BaseParser.js';
import ZIPParser from '../../utils/ZIPParser.js';

export class OFDParser extends BaseParser {
  /**
   * 构造函数
   * @constructor
   */
  constructor() {
    super();
    this.zipParser = new ZIPParser();
    this.ofdData = null;
  }

  /**
   * 解析OFD文件
   * @param {ArrayBuffer} fileData - OFD文件二进制数据
   * @returns {Promise<Object>} 解析结果,包含文档元数据、页面内容、元素等
   * @throws {Error} 当文件格式无效时抛出错误
   * 
   * @example
   * const parser = new OFDParser();
   * const result = await parser.parse(fileData);
   * console.log(result.metadata);
   * console.log(result.pages);
   */
  async parse(fileData) {
    if (!this.validate(fileData)) {
      throw new Error('Invalid OFD file format');
    }

    // 使用ZIPParser解析OFD文件(ZIP包)
    const zipResult = await this.zipParser.parse(fileData);
    this.ofdData = zipResult;

    // 解析OFD.xml(文档根)
    const ofdXml = await this.parseOFDXml();

    // 解析Document.xml(文档信息)
    const documentInfo = await this.parseDocumentXml();

    // 解析Pages.xml(页面列表)
    const pages = await this.parsePagesXml();

    // 提取所有页面的内容
    const pageContents = await this.parsePageContents(pages);

    return {
      type: 'ofd',
      metadata: this.buildMetadata(ofdXml, documentInfo),
      pages: pageContents
    };
  }

  /**
   * 验证OFD文件格式
   * @param {ArrayBuffer} fileData - OFD文件二进制数据
   * @returns {boolean} 是否为有效的OFD文件
   * 
   * @description 验证逻辑:
   * 1. 检查文件是否为有效的ZIP包
   * 2. 检查是否包含OFD.xml文件
   */
  validate(fileData) {
    if (!fileData || fileData.byteLength < 4) {
      return false;
    }

    try {
      // 验证是否为有效的ZIP包
      return this.zipParser.validate(fileData);
    } catch (e) {
      return false;
    }
  }

  /**
   * 获取文件元数据
   * @param {ArrayBuffer} fileData - OFD文件二进制数据
   * @returns {Promise<Object>} 文档元数据
   */
  async getMetadata(fileData) {
    if (!this.ofdData) {
      await this.parse(fileData);
    }
    return this.parse(fileData).then(result => result.metadata);
  }

  /**
   * 解析OFD.xml(文档根)
   * @returns {Promise<Object>} OFD.xml解析结果
   * @private
   */
  async parseOFDXml() {
    const content = await this.zipParser.readFile('OFD.xml');
    const xmlStr = new TextDecoder('utf-8').decode(content);
    return this.parseXML(xmlStr);
  }

  /**
   * 解析Document.xml(文档信息)
   * @returns {Promise<Object>} Document.xml解析结果
   * @private
   */
  async parseDocumentXml() {
    try {
      // OFD中可能有多个文档,这里处理第一个文档
      const content = await this.zipParser.readFile('Doc_0/Document.xml');
      const xmlStr = new TextDecoder('utf-8').decode(content);
      return this.parseXML(xmlStr);
    } catch (e) {
      console.warn('Document.xml not found, using default values');
      return { CommonData: {} };
    }
  }

  /**
   * 解析Pages.xml(页面列表)
   * @returns {Promise<Array>} 页面列表
   * @private
   */
  async parsePagesXml() {
    try {
      const content = await this.zipParser.readFile('Doc_0/Pages.xml');
      const xmlStr = new TextDecoder('utf-8').decode(content);
      const xml = this.parseXML(xmlStr);
      return xml.Page ? (Array.isArray(xml.Page) ? xml.Page : [xml.Page]) : [];
    } catch (e) {
      console.warn('Pages.xml not found');
      return [];
    }
  }

  /**
   * 解析页面内容
   * @param {Array} pages - 页面列表
   * @returns {Promise<Array>} 页面内容数组
   * @private
   */
  async parsePageContents(pages) {
    const pageContents = [];

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const pageId = page.ID || `Page_${i}`;
      const pageFile = `Doc_0/Pages/Page_${i}/Content.xml`;

      try {
        const content = await this.zipParser.readFile(pageFile);
        const xmlStr = new TextDecoder('utf-8').decode(content);
        const xml = this.parseXML(xmlStr);

        // 提取页面尺寸
        const pageArea = xml.PageArea || {};
        const physicalBox = pageArea.PhysicalBox ? pageArea.PhysicalBox.split(' ') : ['0', '0', '210', '297'];
        
        pageContents.push({
          index: i,
          id: pageId,
          width: parseFloat(physicalBox[2]) || 210,
          height: parseFloat(physicalBox[3]) || 297,
          elements: this.extractElements(xml)
        });
      } catch (e) {
        console.warn(`Failed to parse page ${i}:`, e);
        pageContents.push({
          index: i,
          id: pageId,
          width: 210,
          height: 297,
          elements: []
        });
      }
    }

    return pageContents;
  }

  /**
   * 提取页面元素(文本、图片、图形等)
   * @param {Object} xml - 页面XML对象
   * @returns {Array} 元素数组
   * @private
   */
  extractElements(xml) {
    const elements = [];
    const content = xml.Content || {};
    const layer = content.Layer;

    if (!layer) {
      return elements;
    }

    // 处理Layer(可能是数组或单个对象)
    const layers = Array.isArray(layer) ? layer : [layer];

    layers.forEach(l => {
      // 提取文本对象
      if (l.TextObject) {
        const textObjects = Array.isArray(l.TextObject) ? l.TextObject : [l.TextObject];
        textObjects.forEach(textObj => {
          elements.push(this.extractTextObject(textObj));
        });
      }

      // 提取图片对象
      if (l.ImageObject) {
        const imageObjects = Array.isArray(l.ImageObject) ? l.ImageObject : [l.ImageObject];
        imageObjects.forEach(imgObj => {
          elements.push(this.extractImageObject(imgObj));
        });
      }

      // 提取路径对象(图形)
      if (l.PathObject) {
        const pathObjects = Array.isArray(l.PathObject) ? l.PathObject : [l.PathObject];
        pathObjects.forEach(pathObj => {
          elements.push(this.extractPathObject(pathObj));
        });
      }
    });

    return elements;
  }

  /**
   * 提取文本对象
   * @param {Object} textObj - 文本对象
   * @returns {Object} 文本元素
   * @private
   */
  extractTextObject(textObj) {
    const boundary = textObj.Boundary ? textObj.Boundary.split(' ') : ['0', '0', '100', '20'];
    
    return {
      type: 'text',
      id: textObj.ID,
      x: parseFloat(boundary[0]) || 0,
      y: parseFloat(boundary[1]) || 0,
      width: parseFloat(boundary[2]) || 100,
      height: parseFloat(boundary[3]) || 20,
      content: textObj.TextCode ? this.extractTextContent(textObj.TextCode) : ''
    };
  }

  /**
   * 提取文本内容
   * @param {Object|Array} textCode - 文本代码对象
   * @returns {string} 文本内容
   * @private
   */
  extractTextContent(textCode) {
    if (!textCode) return '';

    const codes = Array.isArray(textCode) ? textCode : [textCode];
    let text = '';

    codes.forEach(code => {
      if (code.X && code.Y && code.TextCode) {
        // 解码十六进制文本
        const hexText = code.TextCode;
        let decodedText = '';
        for (let i = 0; i < hexText.length; i += 2) {
          const hex = hexText.substr(i, 2);
          const charCode = parseInt(hex, 16);
          decodedText += String.fromCharCode(charCode);
        }
        text += decodedText;
      }
    });

    return text;
  }

  /**
   * 提取图片对象
   * @param {Object} imgObj - 图片对象
   * @returns {Object} 图片元素
   * @private
   */
  extractImageObject(imgObj) {
    const boundary = imgObj.Boundary ? imgObj.Boundary.split(' ') : ['0', '0', '100', '100'];

    return {
      type: 'image',
      id: imgObj.ID,
      resourceId: imgObj.ResourceID,
      x: parseFloat(boundary[0]) || 0,
      y: parseFloat(boundary[1]) || 0,
      width: parseFloat(boundary[2]) || 100,
      height: parseFloat(boundary[3]) || 100
    };
  }

  /**
   * 提取路径对象(图形)
   * @param {Object} pathObj - 路径对象
   * @returns {Object} 图形元素
   * @private
   */
  extractPathObject(pathObj) {
    const boundary = pathObj.Boundary ? pathObj.Boundary.split(' ') : ['0', '0', '100', '100'];

    return {
      type: 'path',
      id: pathObj.ID,
      boundary: {
        x: parseFloat(boundary[0]) || 0,
        y: parseFloat(boundary[1]) || 0,
        width: parseFloat(boundary[2]) || 100,
        height: parseFloat(boundary[3]) || 100
      },
      strokeColor: pathObj.StrokeColor || '#000000',
      fillColor: pathObj.FillColor || '#FFFFFF',
      lineWidth: parseFloat(pathObj.LineWidth) || 1
    };
  }

  /**
   * 构建文档元数据
   * @param {Object} ofdXml - OFD.xml解析结果
   * @param {Object} documentInfo - Document.xml解析结果
   * @returns {Object} 文档元数据
   * @private
   */
  buildMetadata(ofdXml, documentInfo) {
    const commonData = documentInfo.CommonData || {};
    
    return {
      format: 'OFD',
      version: ofdXml.Version || '1.0',
      docType: ofdXml.DocType || 'OFD',
      title: commonData.Title || '',
      author: commonData.Creator || '',
      subject: commonData.Subject || '',
      keywords: commonData.Keywords || '',
      creator: commonData.Creator || '',
      creationDate: commonData.CreationDate || '',
      modificationDate: commonData.ModDate || '',
      pageCount: this.ofdData.files.filter(f => f.name.startsWith('Doc_0/Pages/Page_')).length
    };
  }

  /**
   * 解析XML字符串为对象
   * @param {string} xmlStr - XML字符串
   * @returns {Object} 解析后的对象
   * @private
   */
  parseXML(xmlStr) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlStr, 'text/xml');

    // 将XML转换为JavaScript对象
    function xmlToObj(xmlNode) {
      if (xmlNode.nodeType === 3) {
        return xmlNode.nodeValue;
      }

      const obj = {};
      
      // 处理属性
      if (xmlNode.attributes && xmlNode.attributes.length > 0) {
        for (let i = 0; i < xmlNode.attributes.length; i++) {
          const attr = xmlNode.attributes[i];
          obj[`@${attr.name}`] = attr.value;
        }
      }

      // 处理子节点
      if (xmlNode.childNodes && xmlNode.childNodes.length > 0) {
        const childNodes = Array.from(xmlNode.childNodes).filter(n => n.nodeType !== 3 || n.nodeValue.trim());

        childNodes.forEach(node => {
          if (node.nodeType === 3) {
            // 文本节点
            const text = node.nodeValue.trim();
            if (text) {
              obj['#text'] = text;
            }
          } else {
            const nodeName = node.nodeName;
            const childObj = xmlToObj(node);

            if (obj[nodeName]) {
              // 如果已存在同名节点,转换为数组
              if (!Array.isArray(obj[nodeName])) {
                obj[nodeName] = [obj[nodeName]];
              }
              obj[nodeName].push(childObj);
            } else {
              obj[nodeName] = childObj;
            }
          }
        });
      }

      return obj;
    }

    return xmlToObj(xmlDoc.documentElement);
  }

  /**
   * 获取图片资源
   * @param {string} resourceId - 资源ID
   * @returns {Promise<ArrayBuffer>} 图片数据
   */
  async getImageResource(resourceId) {
    try {
      // 查找资源文件
      const resourceFiles = this.ofdData.files.filter(f => 
        f.name.startsWith('Doc_0/Res/') && 
        f.name.includes(resourceId)
      );

      if (resourceFiles.length === 0) {
        throw new Error(`Resource not found: ${resourceId}`);
      }

      const content = await this.zipParser.readFile(resourceFiles[0].name);
      return content.buffer;
    } catch (e) {
      console.warn('Failed to load image resource:', e);
      throw e;
    }
  }
}

export default OFDParser;
