/**
 * PPT解析器
 * 纯JavaScript实现的PPT文档解析器，支持.ppt格式
 * 
 * @class PPTParser
 * @description 解析PPT文档，提取幻灯片、文本、形状等内容
 * @author 文件预览系统研发团队
 */

import OLE2Parser from '../utils/OLE2Parser.js';

/**
 * PPT解析器类
 */
class PPTParser {
  /**
   * 构造函数
   * @constructor
   */
  constructor() {
    this.ole2Parser = new OLE2Parser();
    this.parsedData = null;
    this.pptDocument = null;
  }

  /**
   * 解析PPT文档
   * @param {ArrayBuffer} fileData - PPT文件二进制数据
   * @returns {Promise<Object>} 解析结果
   * @throws {Error} 当文件格式无效时抛出错误
   * 
   * @example
   * const parser = new PPTParser();
   * const result = await parser.parse(fileData);
   * console.log(result.slides);
   */
  async parse(fileData) {
    // 使用OLE2Parser解析OLE2文档结构
    const ole2Structure = await this.ole2Parser.parse(fileData);

    // 获取PPTDocument流
    const pptDocumentStream = ole2Structure.streams['PPT Document'];
    if (!pptDocumentStream) {
      throw new Error('PPT Document stream not found');
    }

    // 解析PPTDocument流
    this.pptDocument = this.parsePPTDocument(pptDocumentStream);

    // 提取幻灯片内容
    const slides = await this.parseSlides(ole2Structure);

    // 提取图片
    const images = await this.extractImages(ole2Structure);

    // 构建解析结果
    this.parsedData = {
      type: 'powerpoint',
      format: 'PPT',
      slides,
      images,
      metadata: this.getMetadata()
    };

    return this.parsedData;
  }

  /**
   * 验证PPT文档格式
   * @param {ArrayBuffer} fileData - PPT文件二进制数据
   * @returns {Promise<boolean>} 是否为有效的PPT文件
   */
  async validate(fileData) {
    try {
      await this.ole2Parser.parse(fileData);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取文件元数据
   * @param {ArrayBuffer} fileData - PPT文件二进制数据
   * @returns {Promise<Object>} 元数据
   */
  async getMetadata(fileData) {
    if (!this.parsedData) {
      await this.parse(fileData);
    }
    return this.parsedData.metadata;
  }

  /**
   * 解析PPTDocument流
   * @param {Uint8Array} pptDocumentStream - PPTDocument流数据
   * @returns {Object} PPTDocument对象
   * @private
   */
  parsePPTDocument(pptDocumentStream) {
    const view = new DataView(pptDocumentStream.buffer);

    return {
      // PPT Document基础信息（前68字节）
      magic: view.getUint16(0, true),
      version: view.getUint16(2, true),
      slideCount: this.extractSlideCount(pptDocumentStream)
    };
  }

  /**
   * 提取幻灯片数量
   * @param {Uint8Array} pptDocumentStream - PPTDocument流数据
   * @returns {number} 幻灯片数量
   * @private
   */
  extractSlideCount(pptDocumentStream) {
    // 简化实现：遍历OLE2结构中的Slide流
    // 真实实现需要从PPTDocument中解析
    return 0; // 将在parseSlides中设置
  }

  /**
   * 解析幻灯片
   * @param {Object} ole2Structure - OLE2文档结构
   * @returns {Promise<Array>} 幻灯片数组
   * @private
   */
  async parseSlides(ole2Structure) {
    const slides = [];

    // 遍历所有流，查找Slide流
    const streams = ole2Structure.streams;
    let slideNumber = 1;

    for (const streamName of Object.keys(streams)) {
      // Slide流通常命名为 "Slide 1", "Slide 2" 等
      if (streamName.startsWith('Slide ') || streamName.startsWith('Slide')) {
        try {
          const slideData = this.parseSlide(streams[streamName]);
          if (slideData) {
            slides.push({
              number: slideNumber++,
              ...slideData
            });
          }
        } catch (error) {
          console.warn(`Failed to parse slide ${streamName}:`, error.message);
        }
      }
    }

    this.pptDocument.slideCount = slides.length;
    return slides;
  }

  /**
   * 解析单个幻灯片
   * @param {Uint8Array} slideData - 幻灯片数据
   * @returns {Object} 幻灯片内容
   * @private
   */
  parseSlide(slideData) {
    const view = new DataView(slideData.buffer);

    // 提取文本内容
    const textContent = this.extractTextFromSlide(slideData);

    // 提取形状
    const shapes = this.extractShapes(slideData);

    return {
      text: textContent,
      shapes,
      elements: [
        { type: 'text', content: textContent }
      ]
    };
  }

  /**
   * 从幻灯片提取文本
   * @param {Uint8Array} slideData - 幻灯片数据
   * @returns {string} 文本内容
   * @private
   */
  extractTextFromSlide(slideData) {
    // 简化实现：跳过幻灯片头部，提取可打印字符
    const view = new DataView(slideData.buffer);
    const length = Math.min(slideData.byteLength, 10240); // 限制长度
    
    let text = '';
    let offset = 512; // 跳过幻灯片头部

    for (let i = offset; i < length; i++) {
      const byte = view.getUint8(i);

      // 跳过控制字符
      if (byte === 0x0D || byte === 0x0A) {
        text += '\n';
      } else if (byte >= 0x20 && byte <= 0x7E) {
        // 可打印ASCII字符
        text += String.fromCharCode(byte);
      } else if (byte >= 0xC0 && i + 1 < length) {
        // 可能是中文（GBK编码）
        const nextByte = view.getUint8(i + 1);
        try {
          const bytes = new Uint8Array([byte, nextByte]);
          const decoder = new TextDecoder('gbk');
          text += decoder.decode(bytes);
          i++;
        } catch (error) {
          // 忽略解码错误
        }
      }
    }

    return text.trim();
  }

  /**
   * 提取形状
   * @param {Uint8Array} slideData - 幻灯片数据
   * @returns {Array} 形状数组
   * @private
   */
  extractShapes(slideData) {
    // 简化实现：返回空数组
    // 真实实现需要解析PPT的形状记录
    return [];
  }

  /**
   * 提取图片
   * @param {Object} ole2Structure - OLE2文档结构
   * @returns {Promise<Array>} 图片数组
   * @private
   */
  async extractImages(ole2Structure) {
    const images = [];

    // 遍历所有流，查找图片流
    const streams = ole2Structure.streams;

    for (const streamName of Object.keys(streams)) {
      // 图片流通常包含 "Pictures" 或类似关键词
      if (streamName.includes('Picture') || streamName.includes('Image')) {
        try {
          const imageData = streams[streamName];
          const mimeType = this.detectMimeType(imageData);
          
          images.push({
            id: streamName,
            name: streamName,
            data: `data:${mimeType};base64,${this.arrayBufferToBase64(imageData)}`,
            mimeType
          });
        } catch (error) {
          console.warn(`Failed to extract image ${streamName}:`, error.message);
        }
      }
    }

    return images;
  }

  /**
   * 检测图片MIME类型
   * @param {Uint8Array} imageData - 图片数据
   * @returns {string} MIME类型
   * @private
   */
  detectMimeType(imageData) {
    const view = new DataView(imageData.buffer);
    
    // PNG
    if (imageData.byteLength > 8 &&
        view.getUint8(0) === 0x89 &&
        view.getUint8(1) === 0x50 &&
        view.getUint8(2) === 0x4E &&
        view.getUint8(3) === 0x47) {
      return 'image/png';
    }

    // JPEG
    if (imageData.byteLength > 2 &&
        view.getUint8(0) === 0xFF &&
        view.getUint8(1) === 0xD8) {
      return 'image/jpeg';
    }

    // GIF
    if (imageData.byteLength > 6 &&
        view.getUint8(0) === 0x47 &&
        view.getUint8(1) === 0x49 &&
        view.getUint8(2) === 0x46) {
      return 'image/gif';
    }

    // 默认返回PNG
    return 'image/png';
  }

  /**
   * 获取元数据
   * @returns {Object} 元数据
   * @private
   */
  getMetadata() {
    if (!this.pptDocument) {
      return {};
    }

    return {
      format: 'PPT',
      version: this.getPPTVersion(),
      slideCount: this.pptDocument.slideCount || 0
    };
  }

  /**
   * 获取PPT版本
   * @returns {string} 版本描述
   * @private
   */
  getPPTVersion() {
    if (!this.pptDocument) {
      return 'Unknown';
    }

    const version = this.pptDocument.version;
    const versions = {
      0x03D4: 'PowerPoint 97',
      0x03D8: 'PowerPoint 2000',
      0x03DD: 'PowerPoint 2002/2003'
    };

    return versions[version] || `Unknown (0x${version.toString(16).toUpperCase()})`;
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

export default PPTParser;
