/**
 * EPUB解析器
 * 纯JavaScript实现的EPUB电子书文件解析器，不依赖任何第三方库
 * 
 * @class EPUBParser
 * @description 解析EPUB格式电子书，提取文本、图片、章节结构等
 * @author 文件预览系统研发团队
 * @extends BaseParser
 */
import { BaseParser } from '../BaseParser.js';
import ZIPParser from '../../utils/ZIPParser.js';

export class EPUBParser extends BaseParser {
  /**
   * 构造函数
   * @constructor
   */
  constructor() {
    super();
    this.zipParser = null;
    this.containerPath = null;
    this.opfPath = null;
    this.opfData = null;
    this.ncxPath = null;
  }

  /**
   * 解析EPUB文件
   * @param {ArrayBuffer} fileData - EPUB文件二进制数据
   * @returns {Promise<Object>} 解析结果，包含元数据、章节、图片等
   * @throws {Error} 当文件格式无效时抛出错误
   * 
   * @example
   * const parser = new EPUBParser();
   * const result = await parser.parse(fileData);
   * console.log(result.metadata.title);
   */
  async parse(fileData) {
    if (!this.validate(fileData)) {
      throw new Error('Invalid EPUB file format');
    }

    // 使用ZIPParser解析EPUB（EPUB本质是ZIP）
    this.zipParser = new ZIPParser();
    const zipResult = await this.zipParser.parse(fileData);

    // 解析container.xml获取OPF文件路径
    await this.parseContainer();

    // 解析OPF文件
    await this.parseOPF();

    // 解析NCX文件（目录）
    const toc = await this.parseNCX();

    // 提取章节内容
    const chapters = await this.extractChapters();

    // 提取图片
    const images = await this.extractImages();

    // 获取元数据
    const metadata = this.getMetadata();

    return {
      format: 'EPUB',
      metadata,
      toc,
      chapters,
      images,
      fileCount: zipResult.fileCount
    };
  }

  /**
   * 验证EPUB文件格式
   * @param {ArrayBuffer} fileData - EPUB文件二进制数据
   * @returns {boolean} 是否为有效的EPUB文件
   */
  validate(fileData) {
    if (!fileData || fileData.byteLength < 4) {
      return false;
    }
    
    // EPUB本质是ZIP，验证ZIP格式
    this.zipParser = new ZIPParser();
    return this.zipParser.validate(fileData);
  }

  /**
   * 解析container.xml文件
   * @returns {Promise<void>}
   * @private
   */
  async parseContainer() {
    const containerXml = await this.zipParser.readFile('META-INF/container.xml');
    const containerText = new TextDecoder('utf-8').decode(containerXml);
    
    // 使用DOMParser解析XML
    const parser = new DOMParser();
    const doc = parser.parseFromString(containerText, 'text/xml');
    
    // 查找rootfile元素的full-path属性
    const rootfile = doc.querySelector('rootfile');
    if (!rootfile) {
      throw new Error('Invalid EPUB container.xml: rootfile not found');
    }
    
    this.opfPath = rootfile.getAttribute('full-path');
    if (!this.opfPath) {
      throw new Error('Invalid EPUB container.xml: full-path attribute missing');
    }
  }

  /**
   * 解析OPF文件
   * @returns {Promise<void>}
   * @private
   */
  async parseOPF() {
    const opfXml = await this.zipParser.readFile(this.opfPath);
    this.opfData = new TextDecoder('utf-8').decode(opfXml);
    
    // 使用DOMParser解析XML
    const parser = new DOMParser();
    const doc = parser.parseFromString(this.opfData, 'text/xml');
    
    // 查找ncx文件路径（在spine的toc属性中）
    const spine = doc.querySelector('spine');
    if (spine) {
      const ncxId = spine.getAttribute('toc');
      if (ncxId) {
        // 在manifest中查找对应的href
        const manifest = doc.querySelector('manifest');
        if (manifest) {
          const ncxItem = manifest.querySelector(`item[id="${ncxId}"]`);
          if (ncxItem) {
            const ncxHref = ncxItem.getAttribute('href');
            // OPF文件路径可能与NCX文件路径在不同目录
            const opfDir = this.opfPath.substring(0, this.opfPath.lastIndexOf('/') + 1);
            this.ncxPath = opfDir + ncxHref;
          }
        }
      }
    }
  }

  /**
   * 解析NCX文件（目录）
   * @returns {Promise<Array>} 目录结构数组
   * @private
   */
  async parseNCX() {
    if (!this.ncxPath) {
      return [];
    }

    try {
      const ncxXml = await this.zipParser.readFile(this.ncxPath);
      const ncxText = new TextDecoder('utf-8').decode(ncxXml);
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(ncxText, 'text/xml');
      
      const toc = [];
      const navPoints = doc.querySelectorAll('navPoint');
      
      navPoints.forEach(navPoint => {
        const navLabel = navPoint.querySelector('navLabel text');
        const content = navPoint.querySelector('content');
        
        if (navLabel && content) {
          const label = navLabel.textContent.trim();
          const src = content.getAttribute('src');
          
          toc.push({
            title: label,
            src: src,
            children: this.parseSubNavPoints(navPoint)
          });
        }
      });
      
      return toc;
    } catch (error) {
      console.warn('Failed to parse NCX:', error);
      return [];
    }
  }

  /**
   * 解析子导航点（递归）
   * @param {Element} parentNavPoint - 父navPoint元素
   * @returns {Array} 子目录数组
   * @private
   */
  parseSubNavPoints(parentNavPoint) {
    const children = [];
    const subNavPoints = parentNavPoint.querySelectorAll(':scope > navPoint');
    
    subNavPoints.forEach(navPoint => {
      const navLabel = navPoint.querySelector('navLabel text');
      const content = navPoint.querySelector('content');
      
      if (navLabel && content) {
        const label = navLabel.textContent.trim();
        const src = content.getAttribute('src');
        
        children.push({
          title: label,
          src: src,
          children: this.parseSubNavPoints(navPoint)
        });
      }
    });
    
    return children;
  }

  /**
   * 提取章节内容
   * @returns {Promise<Array>} 章节数组
   * @private
   */
  async extractChapters() {
    const parser = new DOMParser();
    const doc = parser.parseFromString(this.opfData, 'text/xml');
    
    const spine = doc.querySelector('spine');
    if (!spine) {
      return [];
    }
    
    const opfDir = this.opfPath.substring(0, this.opfPath.lastIndexOf('/') + 1);
    const chapters = [];
    
    // 获取manifest用于查找文件路径
    const manifest = doc.querySelector('manifest');
    const manifestMap = new Map();
    if (manifest) {
      const items = manifest.querySelectorAll('item');
      items.forEach(item => {
        const id = item.getAttribute('id');
        const href = item.getAttribute('href');
        if (id && href) {
          manifestMap.set(id, opfDir + href);
        }
      });
    }
    
    // 遍历spine中的itemref
    const itemrefs = spine.querySelectorAll('itemref');
    for (const itemref of itemrefs) {
      const idref = itemref.getAttribute('idref');
      const filePath = manifestMap.get(idref);
      
      if (filePath) {
        try {
          const fileData = await this.zipParser.readFile(filePath);
          const contentText = new TextDecoder('utf-8').decode(fileData);
          
          // 提取标题
          const contentDoc = parser.parseFromString(contentText, 'text/html');
          const title = contentDoc.querySelector('title')?.textContent || '';
          
          // 提取文本内容（移除HTML标签）
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = contentText;
          const plainText = tempDiv.textContent || tempDiv.innerText || '';
          
          chapters.push({
            title: title,
            content: plainText,
            html: contentText,
            filePath: filePath
          });
        } catch (error) {
          console.warn(`Failed to read chapter: ${filePath}`, error);
        }
      }
    }
    
    return chapters;
  }

  /**
   * 提取图片
   * @returns {Promise<Array>} 图片数组
   * @private
   */
  async extractImages() {
    const parser = new DOMParser();
    const doc = parser.parseFromString(this.opfData, 'text/xml');
    
    const manifest = doc.querySelector('manifest');
    if (!manifest) {
      return [];
    }
    
    const opfDir = this.opfPath.substring(0, this.opfPath.lastIndexOf('/') + 1);
    const images = [];
    
    // 查找所有图片类型的item
    const imageItems = manifest.querySelectorAll('item[media-type^="image/"]');
    
    for (const item of imageItems) {
      const href = item.getAttribute('href');
      const mediaType = item.getAttribute('media-type');
      const id = item.getAttribute('id');
      const filePath = opfDir + href;
      
      try {
        const imageData = await this.zipParser.readFile(filePath);
        const base64 = this.arrayBufferToBase64(imageData);
        
        images.push({
          id: id,
          fileName: href.split('/').pop(),
          filePath: filePath,
          mediaType: mediaType,
          data: base64,
          size: imageData.length
        });
      } catch (error) {
        console.warn(`Failed to read image: ${filePath}`, error);
      }
    }
    
    return images;
  }

  /**
   * 获取EPUB元数据
   * @returns {Object} 元数据
   */
  getMetadata() {
    if (!this.opfData) {
      return {};
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(this.opfData, 'text/xml');
    
    const metadata = doc.querySelector('metadata');
    if (!metadata) {
      return {};
    }
    
    // 提取标准元数据
    const title = metadata.querySelector('title')?.textContent || '';
    const creator = metadata.querySelector('creator')?.textContent || '';
    const language = metadata.querySelector('language')?.textContent || '';
    const publisher = metadata.querySelector('publisher')?.textContent || '';
    const date = metadata.querySelector('date')?.textContent || '';
    const identifier = metadata.querySelector('identifier')?.textContent || '';
    const description = metadata.querySelector('description')?.textContent || '';
    
    return {
      title: title,
      author: creator,
      language: language,
      publisher: publisher,
      publishDate: date,
      identifier: identifier,
      description: description,
      format: 'EPUB'
    };
  }

  /**
   * ArrayBuffer转Base64
   * @param {ArrayBuffer} buffer - ArrayBuffer数据
   * @returns {string} Base64字符串
   * @private
   */
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const len = bytes.byteLength;
    
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    
    return btoa(binary);
  }
}

export default EPUBParser;
