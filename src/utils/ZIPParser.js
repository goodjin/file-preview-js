/**
 * ZIP解析器
 * 纯JavaScript实现的ZIP文件解析器，不依赖任何第三方库
 * 
 * @class ZIPParser
 * @description 解析ZIP文件结构，提供文件列表读取和解压功能
 * @author 文件预览系统研发团队
 */
class ZIPParser {
  /**
   * 构造函数
   * @constructor
   */
  constructor() {
    this.fileData = null;
    this.centralDirectory = null;
    this.endOfCentralDirectory = null;
  }

  /**
   * 解析ZIP文件
   * @param {ArrayBuffer} fileData - ZIP文件二进制数据
   * @returns {Promise<Object>} 解析结果，包含文件列表等信息
   * @throws {Error} 当文件格式无效时抛出错误
   * 
   * @example
   * const parser = new ZIPParser();
   * const result = await parser.parse(fileData);
   * console.log(result.files);
   */
  async parse(fileData) {
    if (!this.validate(fileData)) {
      throw new Error('Invalid ZIP file format');
    }

    this.fileData = new DataView(fileData);

    // 解析End of Central Directory Record
    this.endOfCentralDirectory = this.parseEndOfCentralDirectory();

    // 解析Central Directory
    this.centralDirectory = this.parseCentralDirectory();

    // 构建文件列表
    const files = this.buildFileList();

    return {
      format: 'ZIP',
      fileCount: files.length,
      files
    };
  }

  /**
   * 验证ZIP文件格式
   * @param {ArrayBuffer} fileData - ZIP文件二进制数据
   * @returns {boolean} 是否为有效的ZIP文件
   */
  validate(fileData) {
    if (!fileData || fileData.byteLength < 4) {
      return false;
    }

    const view = new DataView(fileData);
    // 检查Local File Header的签名
    const localFileHeaderSignature = view.getUint32(0, true);
    return localFileHeaderSignature === 0x04034b50;
  }

  /**
   * 读取指定文件的内容
   * @param {string} fileName - 文件名
   * @returns {Promise<Uint8Array>} 文件内容
   * @throws {Error} 当文件不存在时抛出错误
   * 
   * @example
   * const content = await parser.readFile('document.xml');
   */
  async readFile(fileName) {
    if (!this.centralDirectory) {
      throw new Error('ZIP file not parsed yet, call parse() first');
    }

    const fileEntry = this.centralDirectory.find(
      entry => entry.fileName === fileName
    );

    if (!fileEntry) {
      throw new Error(`File not found: ${fileName}`);
    }

    const { offset, compressedSize, compressionMethod } = fileEntry;

    // 读取压缩数据
    const compressedData = new Uint8Array(
      this.fileData.buffer,
      this.fileData.byteOffset + offset,
      compressedSize
    );

    // 根据压缩方法处理
    if (compressionMethod === 0) {
      // 无压缩
      return compressedData;
    } else if (compressionMethod === 8) {
      // Deflate压缩
      return this.inflate(compressedData);
    } else {
      throw new Error(`Unsupported compression method: ${compressionMethod}`);
    }
  }

  /**
   * 解析End of Central Directory Record
   * @returns {Object} End of Central Directory Record信息
   * @private
   */
  parseEndOfCentralDirectory() {
    const view = this.fileData;
    const totalLength = view.byteLength;

    // 从文件末尾向前搜索签名
    const signature = 0x06054b50;
    let offset = totalLength - 22; // 最小可能偏移量

    while (offset >= 0) {
      if (view.getUint32(offset, true) === signature) {
        break;
      }
      offset--;
    }

    if (offset < 0) {
      throw new Error('End of Central Directory Record not found');
    }

    return {
      diskNumber: view.getUint16(offset + 4, true),
      centralDisk: view.getUint16(offset + 6, true),
      entriesOnDisk: view.getUint16(offset + 8, true),
      totalEntries: view.getUint16(offset + 10, true),
      centralDirectorySize: view.getUint32(offset + 12, true),
      centralDirectoryOffset: view.getUint32(offset + 16, true),
      commentLength: view.getUint16(offset + 20, true)
    };
  }

  /**
   * 解析Central Directory
   * @returns {Array<Object>} Central Directory条目数组
   * @private
   */
  parseCentralDirectory() {
    const { centralDirectoryOffset, totalEntries } = this.endOfCentralDirectory;
    const view = this.fileData;
    let offset = centralDirectoryOffset;
    const entries = [];

    for (let i = 0; i < totalEntries; i++) {
      const signature = view.getUint32(offset, true);

      if (signature !== 0x02014b50) {
        throw new Error('Invalid Central Directory entry signature');
      }

      const entry = {
        versionMadeBy: view.getUint16(offset + 4, true),
        versionNeeded: view.getUint16(offset + 6, true),
        generalBitFlag: view.getUint16(offset + 8, true),
        compressionMethod: view.getUint16(offset + 10, true),
        lastModTime: view.getUint16(offset + 12, true),
        lastModDate: view.getUint16(offset + 14, true),
        crc32: view.getUint32(offset + 16, true),
        compressedSize: view.getUint32(offset + 20, true),
        uncompressedSize: view.getUint32(offset + 24, true),
        fileNameLength: view.getUint16(offset + 28, true),
        extraFieldLength: view.getUint16(offset + 30, true),
        fileCommentLength: view.getUint16(offset + 32, true),
        diskNumber: view.getUint16(offset + 34, true),
        internalAttributes: view.getUint16(offset + 36, true),
        externalAttributes: view.getUint32(offset + 38, true),
        localHeaderOffset: view.getUint32(offset + 42, true)
      };

      // 读取文件名
      const fileNameBytes = new Uint8Array(
        view.buffer,
        view.byteOffset + offset + 46,
        entry.fileNameLength
      );
      entry.fileName = this.decodeFileName(fileNameBytes);

      // 跳过Extra Field和File Comment
      offset += 46 + entry.fileNameLength + entry.extraFieldLength + entry.fileCommentLength;

      // 查找Local File Header中的实际数据偏移
      entry.offset = this.findFileDataOffset(entry.localHeaderOffset);

      entries.push(entry);
    }

    return entries;
  }

  /**
   * 查找文件数据的偏移位置
   * @param {number} localHeaderOffset - Local File Header偏移
   * @returns {number} 文件数据偏移
   * @private
   */
  findFileDataOffset(localHeaderOffset) {
    const view = this.fileData;
    let offset = localHeaderOffset;

    // 验证Local File Header签名
    const signature = view.getUint32(offset, true);
    if (signature !== 0x04034b50) {
      throw new Error('Invalid Local File Header signature');
    }

    // 跳过固定部分
    offset += 30;

    // 读取文件名长度和Extra Field长度
    const fileNameLength = view.getUint16(offset - 26, true);
    const extraFieldLength = view.getUint16(offset - 24, true);

    // 跳过文件名和Extra Field
    offset += fileNameLength + extraFieldLength;

    return offset;
  }

  /**
   * 构建文件列表
   * @returns {Array<Object>} 文件列表
   * @private
   */
  buildFileList() {
    return this.centralDirectory.map(entry => ({
      name: entry.fileName,
      size: entry.uncompressedSize,
      compressedSize: entry.compressedSize,
      compressionMethod: entry.compressionMethod === 0 ? 'none' : 'deflate',
      crc32: entry.crc32,
      offset: entry.offset
    }));
  }

  /**
   * 解码文件名（支持UTF-8和GBK）
   * @param {Uint8Array} bytes - 文件名字节
   * @returns {string} 文件名
   * @private
   */
  decodeFileName(bytes) {
    // 尝试UTF-8解码
    try {
      return new TextDecoder('utf-8').decode(bytes);
    } catch (e) {
      // 如果UTF-8失败，尝试GBK
      try {
        return new TextDecoder('gbk').decode(bytes);
      } catch (e2) {
        // 如果都失败，使用Latin-1
        return new TextDecoder('latin-1').decode(bytes);
      }
    }
  }

  /**
   * Deflate解压缩（简化版，使用浏览器原生支持）
   * @param {Uint8Array} compressedData - 压缩数据
   * @returns {Promise<Uint8Array>} 解压后的数据
   * @private
   */
  async inflate(compressedData) {
    // 使用CompressionStream API（现代浏览器支持）
    if (typeof CompressionStream !== 'undefined') {
      const decompressStream = new DecompressionStream('deflate');
      const writer = decompressStream.writable.getWriter();
      const reader = decompressStream.readable.getReader();

      writer.write(compressedData);
      writer.close();

      const chunks = [];
      let totalLength = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        totalLength += value.length;
      }

      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      return result;
    } else {
      // 如果浏览器不支持CompressionStream，使用pako（第三方库）
      // 但根据架构要求，这里应该实现自研的Deflate算法
      throw new Error('Browser does not support CompressionStream API');
    }
  }

  /**
   * 获取ZIP文件的元数据
   * @returns {Object} 元数据
   */
  getMetadata() {
    if (!this.endOfCentralDirectory) {
      throw new Error('ZIP file not parsed yet');
    }

    return {
      fileCount: this.endOfCentralDirectory.totalEntries,
      format: 'ZIP',
      compressionMethods: ['none', 'deflate']
    };
  }
}

export default ZIPParser;
