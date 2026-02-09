/**
 * PDF文件解析器
 * 纯前端自研实现，不依赖任何第三方库
 */
import { BaseParser } from '../BaseParser.js';
import { PDFUtils, PDFObjectType, ParserError } from '../../utils/PDFUtils.js';
import { FlateDecode, DecompressionError } from '../../utils/FlateDecode.js';
import { PDFFont, StandardFonts } from '../../utils/PDFFont.js';

/**
 * PDF解析器类
 */
export class PDFParser extends BaseParser {
  /**
   * 解析PDF文件
   * @param {ArrayBuffer} fileData - PDF文件二进制数据
   * @returns {Promise<Object>} 解析结果
   */
  async parse(fileData) {
    // 验证PDF文件
    if (!PDFUtils.validatePDF(fileData)) {
      throw new ParserError('无效的PDF文件', 'INVALID_PDF');
    }

    try {
      // 获取PDF版本
      const version = PDFUtils.getPDFVersion(fileData);

      // 检查加密
      if (this.isEncrypted(fileData)) {
        throw new ParserError('暂不支持加密PDF', 'ENCRYPTED_PDF');
      }

      // 解析文件结构
      const fileStructure = this.parseFileStructure(fileData);

      // 解析页面树
      const pages = this.parsePageTree(fileData, fileStructure);

      // 提取元数据
      const metadata = this.extractMetadata(fileStructure);

      return {
        type: 'pdf',
        version,
        pages,
        metadata
      };
    } catch (error) {
      if (error instanceof ParserError || error instanceof DecompressionError) {
        throw error;
      }
      throw new ParserError(`PDF解析失败: ${error.message}`, 'PARSE_FAILED');
    }
  }

  /**
   * 验证PDF文件格式
   * @param {ArrayBuffer} fileData - PDF文件二进制数据
   * @returns {boolean} 是否有效
   */
  validate(fileData) {
    return PDFUtils.validatePDF(fileData);
  }

  /**
   * 获取文件元数据
   * @param {ArrayBuffer} fileData - PDF文件二进制数据
   * @returns {Object} 元数据
   */
  getMetadata(fileData) {
    try {
      const fileStructure = this.parseFileStructure(fileData);
      return this.extractMetadata(fileStructure);
    } catch (error) {
      return { pageCount: 0, title: '', author: '' };
    }
  }

  /**
   * 检查PDF是否加密
   * @param {ArrayBuffer} fileData - PDF文件数据
   * @returns {boolean} 是否加密
   */
  isEncrypted(fileData) {
    const trailer = PDFUtils.parseTrailer(fileData);
    return trailer.Encrypt !== undefined;
  }

  /**
   * 解析PDF文件结构
   * @param {ArrayBuffer} fileData - PDF文件数据
   * @returns {Object} 文件结构
   */
  parseFileStructure(fileData) {
    // 查找xref位置
    const startxref = PDFUtils.findFileStart(fileData);
    const xrefOffset = PDFUtils.findXRefPosition(fileData);

    // 解析xref表
    const xref = PDFUtils.parseXRef(fileData, xrefOffset);

    // 解析trailer
    const trailer = PDFUtils.parseTrailer(fileData);

    // 获取根对象（Catalog）
    const rootRef = trailer.Root;
    const rootObj = this.resolveObject(fileData, xref, rootRef);

    return { xref, trailer, root: rootObj };
  }

  /**
   * 解析页面树
   * @param {ArrayBuffer} fileData - PDF文件数据
   * @param {Object} fileStructure - 文件结构
   * @returns {Array} 页面数组
   */
  parsePageTree(fileData, fileStructure) {
    const { xref, root } = fileStructure;

    // 获取Pages节点
    const pagesRef = root.value.Pages;
    const pagesObj = this.resolveObject(fileData, xref, pagesRef);

    // 获取页面数量
    const count = pagesObj.value.Count?.value || 0;

    const result = [];

    // 递归解析页面
    const parsePages = (pagesNode) => {
      const pageRef = pagesNode.value.Kids;

      if (Array.isArray(pageRef)) {
        // 有子节点，继续递归
        for (const ref of pageRef) {
          const childObj = this.resolveObject(fileData, xref, ref);
          if (childObj.value?.Type?.value === 'Pages') {
            parsePages(childObj);
          } else if (childObj.value?.Type?.value === 'Page') {
            // 解析单个页面
            const page = this.parsePage(fileData, xref, childObj);
            result.push(page);
          }
        }
      }
    };

    parsePages(pagesObj);

    return result;
  }

  /**
   * 解析单个页面
   * @param {ArrayBuffer} fileData - PDF文件数据
   * @param {Object} xref - xref表
   * @param {Object} pageObj - 页面对象
   * @returns {Object} 页面数据
   */
  parsePage(fileData, xref, pageObj) {
    const pageDict = pageObj.value;

    // 获取页面尺寸
    const mediaBox = pageDict.MediaBox?.value || [0, 0, 612, 792];
    const width = Math.round(mediaBox[2] - mediaBox[0]);
    const height = Math.round(mediaBox[3] - mediaBox[1]);

    // 获取页面内容
    const contentsRef = pageDict.Contents;
    let contents = '';

    if (contentsRef) {
      contents = this.getPageContents(fileData, xref, contentsRef);
    }

    // 解析页面元素
    const elements = this.parsePageContents(contents, pageDict);

    // 获取页面编号
    const pageNumber = this.getPageNumber(pageDict);

    return {
      number: pageNumber,
      width,
      height,
      elements
    };
  }

  /**
   * 获取页面内容流
   * @param {ArrayBuffer} fileData - PDF文件数据
   * @param {Object} xref - xref表
   * @param {Object} contentsRef - 内容引用
   * @returns {string} 解压后的内容
   */
  getPageContents(fileData, xref, contentsRef) {
    if (Array.isArray(contentsRef)) {
      // 多个内容流
      let result = '';
      for (const ref of contentsRef) {
        result += this.getPageContents(fileData, xref, ref) + '\n';
      }
      return result;
    }

    const contentsObj = this.resolveObject(fileData, xref, contentsRef);

    if (contentsObj.type === PDFObjectType.STREAM) {
      return this.decodeStream(contentsObj);
    } else {
      return contentsObj.content || '';
    }
  }

  /**
   * 解码流数据
   * @param {Object} streamObj - 流对象
   * @returns {string} 解码后的文本
   */
  decodeStream(streamObj) {
    const { dict, data } = streamObj;

    // 检查压缩算法
    const filter = dict.value.Filter?.value || dict.value.Filter;

    if (filter === 'FlateDecode') {
      const decompressed = FlateDecode.decompressZLIB(data);
      return new TextDecoder('latin1').decode(decompressed);
    }

    // 无压缩，直接返回
    return new TextDecoder('latin1').decode(new Uint8Array(data));
  }

  /**
   * 解析页面内容
   * @param {string} contents - 页面内容
   * @param {Object} pageDict - 页面字典
   * @returns {Array} 元素数组
   */
  parsePageContents(contents, pageDict) {
    const elements = [];

    // 简化处理：提取文本操作
    const lines = contents.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // 文本操作 Tj / TJ
      if (line.endsWith('Tj')) {
        const text = line.substring(0, line.length - 2).trim();
        elements.push({
          type: 'text',
          text: this.decodeTextString(text),
          x: 0,
          y: 0,
          font: {}
        });
      }

      // 图片显示 Do
      if (line.match(/Do$/)) {
        const parts = line.split(/\s+/);
        const imageName = parts[parts.length - 2];
        elements.push({
          type: 'image',
          name: imageName,
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          data: ''
        });
      }
    }

    return elements;
  }

  /**
   * 解码文本字符串
   * @param {string} text - PDF文本字符串
   * @returns {string} 解码后的文本
   */
  decodeTextString(text) {
    // 移除括号
    text = text.replace(/^\(/, '').replace(/\)$/, '');

    // 解析转义字符
    const result = [];
    let i = 0;
    while (i < text.length) {
      if (text[i] === '\\' && i + 1 < text.length) {
        const next = text[i + 1];
        if (next === 'n') {
          result.push('\n');
          i += 2;
        } else if (next === 'r') {
          result.push('\r');
          i += 2;
        } else if (next === 't') {
          result.push('\t');
          i += 2;
        } else if (next === '(' || next === ')' || next === '\\') {
          result.push(next);
          i += 2;
        } else if (next >= '0' && next <= '7') {
          // 八进制转义
          let octal = next;
          let j = i + 2;
          while (j < i + 4 && j < text.length && text[j] >= '0' && text[j] <= '7') {
            octal += text[j];
            j++;
          }
          result.push(String.fromCharCode(parseInt(octal, 8)));
          i = j;
        } else {
          result.push(next);
          i += 2;
        }
      } else {
        result.push(text[i]);
        i++;
      }
    }
    return result.join('');
  }

  /**
   * 解析间接对象
   * @param {ArrayBuffer} fileData - PDF文件数据
   * @param {Object} xref - xref表
   * @param {Object} ref - 间接引用
   * @returns {Object} 解析后的对象
   */
  resolveObject(fileData, xref, ref) {
    if (!ref || ref.type !== PDFObjectType.INDIRECT_REFERENCE) {
      return ref;
    }

    const { objNumber, generation } = ref.value;
    const xrefEntry = xref[objNumber];

    if (!xrefEntry || xrefEntry.status !== 'n') {
      throw new ParserError(`找不到对象 ${objNumber}`, 'OBJECT_NOT_FOUND');
    }

    // 读取对象
    const indObj = PDFUtils.readIndirectObject(fileData, xrefEntry.offset);

    // 解析对象内容
    let parsedObj = PDFUtils.parseObject(indObj.content);

    // 如果是流对象，解析流
    if (parsedObj.content && parsedObj.content.includes('stream')) {
      parsedObj = PDFUtils.parseStream(indObj.content, fileData, xrefEntry.offset);
    }

    return parsedObj;
  }

  /**
   * 提取元数据
   * @param {Object} fileStructure - 文件结构
   * @returns {Object} 元数据
   */
  extractMetadata(fileStructure) {
    const { root } = fileStructure;
    const info = root.value?.Info;

    let metadata = {
      pageCount: 0,
      title: '',
      author: '',
      subject: '',
      keywords: '',
      creator: '',
      producer: '',
      creationDate: '',
      modDate: ''
    };

    if (info) {
      // 从Info字典提取元数据
      const title = info.value?.Title?.value;
      const author = info.value?.Author?.value;
      const subject = info.value?.Subject?.value;
      const keywords = info.value?.Keywords?.value;
      const creator = info.value?.Creator?.value;
      const producer = info.value?.Producer?.value;
      const creationDate = info.value?.CreationDate?.value;
      const modDate = info.value?.ModDate?.value;

      metadata.title = title ? this.decodePDFString(title) : '';
      metadata.author = author ? this.decodePDFString(author) : '';
      metadata.subject = subject ? this.decodePDFString(subject) : '';
      metadata.keywords = keywords ? this.decodePDFString(keywords) : '';
      metadata.creator = creator ? this.decodePDFString(creator) : '';
      metadata.producer = producer ? this.decodePDFString(producer) : '';
      metadata.creationDate = creationDate ? this.decodePDFString(creationDate) : '';
      metadata.modDate = modDate ? this.decodePDFString(modDate) : '';
    }

    return metadata;
  }

  /**
   * 解码PDF字符串
   * @param {string} str - PDF字符串
   * @returns {string} 解码后的字符串
   */
  decodePDFString(str) {
    if (typeof str !== 'string') {
      return str;
    }
    // 移除括号
    return str.replace(/^\(|\)$/, '');
  }

  /**
   * 获取页面编号
   * @param {Object} pageDict - 页面字典
   * @returns {number} 页面编号
   */
  getPageNumber(pageDict) {
    // 简化处理：从字典中提取或使用默认值
    const pageLabel = pageDict.Label?.value;
    return pageLabel ? parseInt(pageLabel, 10) : 0;
  }
}
