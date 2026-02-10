/**
 * WPS演示解析器 - 解析.dps格式的WPS演示文件
 * 纯JavaScript实现，不依赖任何第三方库
 */

import ZIPParser from '../../utils/ZIPParser.js';

/**
 * WPS演示解析器类
 */
export class DPSParser {
  /**
   * 构造函数
   */
  constructor() {
    this.sharedStrings = [];
    this.presentation = null;
    this.dpsFiles = {};
  }

  /**
   * 解析WPS演示文件
   * @param {ArrayBuffer} fileData - .DPS文件二进制数据
   * @returns {Promise<Object>} 解析结果
   */
  async parse(fileData) {
    try {
      // 1. 解压ZIP文件
      await this.parseZIP(fileData);
      
      // 2. 解析演示文稿
      if (this.dpsFiles['Presentation.xml'] || this.dpsFiles['1.xml']) {
        this.presentation = this.parsePresentation(this.dpsFiles['Presentation.xml'] || this.dpsFiles['1.xml']);
      }
      
      // 3. 解析共享字符串表
      if (this.dpsFiles['SharedStrings.xml']) {
        await this.parseSharedStrings(this.dpsFiles['SharedStrings.xml']);
      }
      
      // 4. 解析幻灯片
      const slides = [];
      const slideFiles = this.getSlideFiles();
      
      for (const slideInfo of slideFiles) {
        const slideData = await this.parseSlide(slideInfo.xmlData);
        slides.push({
          id: slideInfo.id,
          name: slideInfo.name,
          data: slideData
        });
      }
      
      // 5. 解析媒体文件
      const media = this.parseMedia();
      
      // 6. 返回解析结果
      return {
        type: 'wps-presentation',
        version: 'dps',
        slides: slides,
        media: media,
        metadata: {
          slideCount: slides.length,
          hasSharedStrings: this.sharedStrings.length > 0,
          hasMedia: media.length > 0
        }
      };
      
    } catch (error) {
      console.error('WPS演示解析失败:', error);
      throw new Error(`WPS演示解析失败: ${error.message}`);
    }
  }

  /**
   * 解析ZIP文件
   * @param {ArrayBuffer} fileData - .DPS文件二进制数据
   * @returns {Promise<void>}
   */
  async parseZIP(fileData) {
    const zipParser = new ZIPParser();
    const zipResult = await zipParser.parse(fileData);
    
    // 转换为文件名映射
    this.dpsFiles = {};
    for (const fileInfo of zipResult.files) {
      try {
        const content = await zipParser.readFile(fileInfo.name);
        this.dpsFiles[fileInfo.name] = content.buffer;
      } catch (error) {
        console.warn(`读取ZIP文件失败: ${fileInfo.name}`, error);
      }
    }
  }

  /**
   * 获取幻灯片文件列表
   * @returns {Array} 幻灯片信息数组
   */
  getSlideFiles() {
    const slides = [];
    
    if (this.presentation && this.presentation.slides) {
      for (const slide of this.presentation.slides) {
        const fileName = slide.fileName;
        if (this.dpsFiles[fileName]) {
          slides.push({
            id: slide.id,
            name: slide.name,
            fileName: slide.fileName,
            xmlData: this.dpsFiles[fileName]
          });
        }
      }
    }
    
    return slides;
  }

  /**
   * 解析演示文稿
   * @param {ArrayBuffer} xmlData - Presentation.xml数据
   * @returns {Object} 演示文稿信息
   */
  parsePresentation(xmlData) {
    const text = this.decodeXML(xmlData);
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'application/xml');
    
    const slides = [];
    const slideElements = doc.getElementsByTagName('slide');
    
    for (let i = 0; i < slideElements.length; i++) {
      const slide = slideElements[i];
      const id = slide.getAttribute('id') || (i + 1);
      const fileName = slide.getAttribute('filename') || `${i + 2}.xml`;
      const name = slide.getAttribute('name') || `幻灯片${i + 1}`;
      
      slides.push({
        id: parseInt(id),
        name: name,
        fileName: fileName
      });
    }
    
    return { slides };
  }

  /**
   * 解析幻灯片
   * @param {ArrayBuffer} xmlData - 幻灯片XML数据
   * @returns {Object} 幻灯片数据
   */
  async parseSlide(xmlData) {
    const text = this.decodeXML(xmlData);
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'application/xml');
    
    const slide = {
      elements: [],
      shapes: [],
      texts: []
    };
    
    // 解析形状元素
    const shapeElements = doc.getElementsByTagName('shape');
    for (let i = 0; i < shapeElements.length; i++) {
      const shape = this.parseShape(shapeElements[i]);
      if (shape) {
        slide.shapes.push(shape);
      }
    }
    
    // 解析文本元素
    const textElements = doc.getElementsByTagName('text');
    for (let i = 0; i < textElements.length; i++) {
      const textEl = textElements[i];
      const textNode = textEl.getElementsByTagName('t')[0];
      if (textNode) {
        const textContent = textNode.textContent;
        
        // 解析共享字符串引用
        let displayText = textContent;
        if (textContent.startsWith('#') && this.sharedStrings.length > 0) {
          const index = parseInt(textContent.substring(1));
          displayText = this.sharedStrings[index] || textContent;
        }
        
        slide.texts.push({
          content: displayText,
          position: { x: 0, y: 0 },
          style: null
        });
      }
    }
    
    // 解析图片引用
    const imageElements = doc.getElementsByTagName('image');
    for (let i = 0; i < imageElements.length; i++) {
      const image = this.parseImage(imageElements[i]);
      if (image) {
        slide.elements.push(image);
      }
    }
    
    return slide;
  }

  /**
   * 解析形状
   * @param {Element} shapeElement - 形状DOM元素
   * @returns {Object} 形状数据
   */
  parseShape(shapeElement) {
    const id = shapeElement.getAttribute('id');
    const type = shapeElement.getAttribute('type') || 'rectangle';
    
    return {
      id: id,
      type: type,
      position: {
        x: parseInt(shapeElement.getAttribute('x') || '0'),
        y: parseInt(shapeElement.getAttribute('y') || '0')
      },
      size: {
        width: parseInt(shapeElement.getAttribute('width') || '100'),
        height: parseInt(shapeElement.getAttribute('height') || '100')
      }
    };
  }

  /**
   * 解析图片
   * @param {Element} imageElement - 图片DOM元素
   * @returns {Object} 图片数据
   */
  parseImage(imageElement) {
    const ref = imageElement.getAttribute('ref');
    const position = {
      x: parseInt(imageElement.getAttribute('x') || '0'),
      y: parseInt(imageElement.getAttribute('y') || '0')
    };
    
    return {
      type: 'image',
      ref: ref,
      position: position
    };
  }

  /**
   * 解析媒体文件
   * @returns {Array<Object>} 媒体文件列表
   */
  parseMedia() {
    const media = [];
    
    // 遍历ZIP文件，查找media目录
    for (const fileName of Object.keys(this.dpsFiles)) {
      if (fileName.startsWith('media/')) {
        const fileData = this.dpsFiles[fileName];
        const mediaType = this.getMediaType(fileName);
        
        // 转换为Base64
        const base64 = this.arrayBufferToBase64(fileData);
        
        media.push({
          fileName: fileName,
          type: mediaType,
          data: base64,
          size: fileData.byteLength
        });
      }
    }
    
    return media;
  }

  /**
   * 获取媒体类型
   * @param {string} fileName - 文件名
   * @returns {string} 媒体类型
   */
  getMediaType(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const typeMap = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'bmp': 'image/bmp'
    };
    return typeMap[ext] || 'image';
  }

  /**
   * ArrayBuffer转Base64
   * @param {ArrayBuffer} buffer - 二进制数据
   * @returns {string} Base64字符串
   */
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
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
   * @returns {boolean} 是否为有效的.DPS文件
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
      format: 'DPS',
      mimeType: 'application/vnd.ms-powerpoint',
      size: fileData.byteLength
    };
  }
}
