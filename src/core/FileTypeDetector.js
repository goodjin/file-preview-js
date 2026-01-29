/**
 * FileTypeDetector - 文件类型检测器
 * 负责检测文件的实际类型，支持扩展名和Magic Number检测
 */

// Magic Number映射表
const MAGIC_NUMBERS = {
  // PDF
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
  
  // Office文档（ZIP格式）
  docx: [0x50, 0x4B, 0x03, 0x04],
  xlsx: [0x50, 0x4B, 0x03, 0x04],
  pptx: [0x50, 0x4B, 0x03, 0x04],
  doc: [0xD0, 0xCF, 0x11, 0xE0],
  xls: [0xD0, 0xCF, 0x11, 0xE0],
  ppt: [0xD0, 0xCF, 0x11, 0xE0],
  
  // 图片
  png: [0x89, 0x50, 0x4E, 0x47],
  jpg: [0xFF, 0xD8, 0xFF],
  jpeg: [0xFF, 0xD8, 0xFF],
  gif: [0x47, 0x49, 0x46, 0x38],
  bmp: [0x42, 0x4D],
  webp: [0x52, 0x49, 0x46, 0x46],
  tiff: [0x49, 0x49, 0x2A, 0x00],
  
  // 音频
  mp3: [0xFF, 0xFB],
  wav: [0x52, 0x49, 0x46, 0x46],
  ogg: [0x4F, 0x67, 0x67, 0x53],
  
  // 视频
  mp4: [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70],
  avi: [0x52, 0x49, 0x46, 0x46],
  mov: [0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70],
  
  // 压缩包
  zip: [0x50, 0x4B, 0x03, 0x04],
  rar: [0x52, 0x61, 0x72, 0x21],
  '7z': [0x37, 0x7A, 0xBC, 0xAF],
  
  // 文本类（无固定Magic Number）
  txt: null,
  md: null,
  xml: null,
  json: null,
  csv: null,
  html: null,
  css: null,
  js: null,
};

// 扩展名到文件类型的映射
const EXTENSION_MAP = {
  '.xlsx': 'xlsx',
  '.xls': 'xls',
  '.docx': 'docx',
  '.doc': 'doc',
  '.pptx': 'pptx',
  '.ppt': 'ppt',
  '.pdf': 'pdf',
  '.png': 'png',
  '.jpg': 'jpg',
  '.jpeg': 'jpeg',
  '.gif': 'gif',
  '.bmp': 'bmp',
  '.webp': 'webp',
  '.tiff': 'tiff',
  '.mp3': 'mp3',
  '.wav': 'wav',
  '.ogg': 'ogg',
  '.mp4': 'mp4',
  '.avi': 'avi',
  '.mov': 'mov',
  '.zip': 'zip',
  '.rar': 'rar',
  '.7z': '7z',
  '.txt': 'txt',
  '.md': 'md',
  '.xml': 'xml',
  '.json': 'json',
  '.csv': 'csv',
  '.html': 'html',
  '.css': 'css',
  '.js': 'js',
};

class FileTypeDetector {
  constructor() {
    this._cache = new Map(); // 文件检测缓存
  }

  /**
   * 通过文件对象检测类型
   * @param {File} file - 文件对象
   * @returns {Promise<string>} 文件类型
   */
  async detect(file) {
    if (!file || !(file instanceof File)) {
      throw new Error('Invalid file object');
    }

    // 检查缓存
    const cacheKey = `${file.name}-${file.size}`;
    if (this._cache.has(cacheKey)) {
      return this._cache.get(cacheKey);
    }

    // 第一优先级：通过扩展名检测
    let fileType = this.detectByFileName(file.name);

    // 第二优先级：通过Magic Number验证
    if (fileType && MAGIC_NUMBERS[fileType]) {
      try {
        const detectedType = await this.detectByMagicNumber(file);
        
        // 如果Magic Number检测到更精确的类型，使用检测到的类型
        if (detectedType && detectedType !== fileType) {
          fileType = detectedType;
        }
      } catch (error) {
        console.warn('Magic number detection failed:', error);
      }
    }

    // 缓存结果
    this._cache.set(cacheKey, fileType);

    return fileType;
  }

  /**
   * 通过文件名检测类型
   * @param {string} fileName - 文件名
   * @returns {string|null} 文件类型
   */
  detectByFileName(fileName) {
    if (!fileName || typeof fileName !== 'string') {
      return null;
    }

    // 提取扩展名
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return null;
    }

    const extension = fileName.substring(lastDotIndex).toLowerCase();
    return EXTENSION_MAP[extension] || null;
  }

  /**
   * 通过Magic Number检测类型
   * @param {File|ArrayBuffer} file - 文件对象或ArrayBuffer
   * @returns {Promise<string|null>} 文件类型
   */
  async detectByMagicNumber(file) {
    let arrayBuffer;

    if (file instanceof ArrayBuffer) {
      arrayBuffer = file;
    } else if (file instanceof File || file instanceof Blob) {
      try {
        arrayBuffer = await this._readFirstBytes(file, 16);
      } catch (error) {
        throw new Error(`Failed to read file: ${error.message}`);
      }
    } else {
      throw new Error('Invalid input: must be File, Blob, or ArrayBuffer');
    }

    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return null;
    }

    const uint8Array = new Uint8Array(arrayBuffer);

    // 遍历所有Magic Number进行匹配
    for (const [type, magicNumber] of Object.entries(MAGIC_NUMBERS)) {
      if (!magicNumber) continue;

      if (this._matchMagicNumber(uint8Array, magicNumber)) {
        // 特殊处理Office文档，因为它们都是ZIP格式
        if (type === 'xlsx' || type === 'docx' || type === 'pptx') {
          // 可以通过读取内部文件进一步区分，这里简化处理
          return type;
        }
        return type;
      }
    }

    return null;
  }

  /**
   * 验证文件扩展名与实际类型是否匹配
   * @param {File} file - 文件对象
   * @returns {Promise<{isValid: boolean, extensionType: string, detectedType: string|null}>}
   */
  async validate(file) {
    const extensionType = this.detectByFileName(file.name);
    const detectedType = await this.detectByMagicNumber(file);

    // 如果两者都为null，返回无效
    if (!extensionType && !detectedType) {
      return {
        isValid: false,
        extensionType: null,
        detectedType: null
      };
    }

    // 如果只有一个为null，认为有效（可能有多种表示方式）
    if (!extensionType || !detectedType) {
      return {
        isValid: true,
        extensionType,
        detectedType
      };
    }

    // 比较类型是否一致
    const isValid = extensionType === detectedType || 
                   this._areCompatibleTypes(extensionType, detectedType);

    return {
      isValid,
      extensionType,
      detectedType
    };
  }

  /**
   * 读取文件前N字节
   * @private
   */
  _readFirstBytes(file, bytes) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const blob = file.slice(0, bytes);

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.readAsArrayBuffer(blob);
    });
  }

  /**
   * 匹配Magic Number
   * @private
   */
  _matchMagicNumber(uint8Array, magicNumber) {
    if (uint8Array.byteLength < magicNumber.length) {
      return false;
    }

    for (let i = 0; i < magicNumber.length; i++) {
      if (uint8Array[i] !== magicNumber[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * 判断两种文件类型是否兼容
   * @private
   */
  _areCompatibleTypes(type1, type2) {
    const compatiblePairs = [
      ['jpg', 'jpeg'],
      ['tif', 'tiff'],
      ['htm', 'html'],
    ];

    for (const [t1, t2] of compatiblePairs) {
      if ((type1 === t1 && type2 === t2) || (type1 === t2 && type2 === t1)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this._cache.clear();
  }
}

// 导出单例实例
const detector = new FileTypeDetector();
export default detector;
export { FileTypeDetector, MAGIC_NUMBERS, EXTENSION_MAP };
