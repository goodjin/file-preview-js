/**
 * 文件类型检测器
 * 快速检测文件类型（目标：<100ms）
 * 
 * @description 优先从扩展名判断，对可疑文件读取文件头魔数判断
 * @module FileTypeDetector
 * @version 1.0.0
 */

/**
 * 文件类型到扩展名的映射
 * @type {Object}
 */
const FILE_TYPE_MAP = {
  // Office文档类
  'doc': 'office',
  'docx': 'office',
  'xls': 'office',
  'xlsx': 'office',
  'ppt': 'office',
  'pptx': 'office',
  'csv': 'office',
  'wps': 'office',
  'et': 'office',
  'dps': 'office',
  
  // 文档类
  'pdf': 'document',
  'ofd': 'document',
  'rtf': 'document',
  'txt': 'document',
  'md': 'document',
  'xml': 'document',
  'json': 'document',
  'epub': 'document',
  
  // 图片类
  'jpg': 'image',
  'jpeg': 'image',
  'png': 'image',
  'gif': 'image',
  'bmp': 'image',
  'svg': 'image',
  'tif': 'image',
  'tiff': 'image',
  'webp': 'image',
  'psd': 'image',
  
  // 音视频类
  'mp3': 'media',
  'wav': 'media',
  'mp4': 'media',
  'flv': 'media',
  'avi': 'media',
  'mkv': 'media',
  'webm': 'media',
  
  // 压缩包类
  'zip': 'archive',
  'rar': 'archive',
  '7z': 'archive',
  'tar': 'archive',
  'gz': 'archive',
  'gzip': 'archive',
  'jar': 'archive',
  
  // 其他格式
  'xmind': 'other',
  'bpmn': 'other',
  'drawio': 'other',
  'eml': 'other',
  'dcm': 'other'
};

/**
 * 文件头魔数（用于识别真实文件类型）
 * @type {Object}
 */
const MAGIC_NUMBERS = {
  // PDF
  'pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
  
  // ZIP（包括docx, xlsx, pptx等）
  'zip': [0x50, 0x4B, 0x03, 0x04], // PK
  
  // RAR
  'rar': [0x52, 0x61, 0x72, 0x21], // Rar!
  
  // PNG
  'png': [0x89, 0x50, 0x4E, 0x47], // .PNG
  
  // JPEG
  'jpeg': [0xFF, 0xD8, 0xFF],
  
  // GIF
  'gif': [0x47, 0x49, 0x46, 0x38], // GIF8
  
  // BMP
  'bmp': [0x42, 0x4D] // BM
};

/**
 * 文件类型检测器类
 * @class FileTypeDetector
 */
export class FileTypeDetector {
  /**
   * 检测文件类型
   * @param {File} file - 文件对象
   * @returns {string} 文件类型（扩展名）
   */
  static detect(file) {
    // 1. 优先从扩展名判断（<10ms）
    const ext = this.getExtension(file.name);
    if (ext && FILE_TYPE_MAP[ext]) {
      return ext;
    }
    
    // 2. 对可疑文件读取文件头魔数判断（<100ms）
    return this.detectByMagicNumber(file);
  }

  /**
   * 获取文件扩展名
   * @param {string} fileName - 文件名
   * @returns {string|null} 扩展名（小写）
   */
  static getExtension(fileName) {
    if (!fileName || typeof fileName !== 'string') {
      return null;
    }
    
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === fileName.length - 1) {
      return null;
    }
    
    return fileName.substring(lastDotIndex + 1).toLowerCase();
  }

  /**
   * 通过文件头魔数检测类型
   * @param {File} file - 文件对象
   * @returns {Promise<string>} 文件类型
   */
  static async detectByMagicNumber(file) {
    try {
      // 读取前16字节
      const buffer = await this.readFileHeader(file, 16);
      const signature = Array.from(new Uint8Array(buffer));
      
      // 根据魔数判断文件类型
      for (const [type, magic] of Object.entries(MAGIC_NUMBERS)) {
        if (this.matchSignature(signature, magic)) {
          return type;
        }
      }
      
      // 无法识别，返回unknown
      return 'unknown';
    } catch (error) {
      console.error('Error detecting file type by magic number:', error);
      return 'unknown';
    }
  }

  /**
   * 读取文件头
   * @param {File} file - 文件对象
   * @param {number} bytes - 读取字节数
   * @returns {Promise<ArrayBuffer>} 文件头数据
   */
  static readFileHeader(file, bytes) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      
      // 读取前N个字节
      const slice = file.slice(0, bytes);
      reader.readAsArrayBuffer(slice);
    });
  }

  /**
   * 匹配魔数签名
   * @param {Array<number>} signature - 文件签名
   * @param {Array<number>} magic - 魔数
   * @returns {boolean} 是否匹配
   */
  static matchSignature(signature, magic) {
    if (signature.length < magic.length) {
      return false;
    }
    
    for (let i = 0; i < magic.length; i++) {
      if (signature[i] !== magic[i]) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 检查是否支持该文件类型
   * @param {string} fileType - 文件类型
   * @returns {boolean} 是否支持
   */
  static isSupported(fileType) {
    return FILE_TYPE_MAP[fileType] !== undefined;
  }

  /**
   * 获取文件分类
   * @param {string} fileType - 文件类型
   * @returns {string|null} 文件分类
   */
  static getCategory(fileType) {
    return FILE_TYPE_MAP[fileType] || null;
  }

  /**
   * 获取所有支持的文件类型
   * @returns {Array<string>} 文件类型列表
   */
  static getSupportedTypes() {
    return Object.keys(FILE_TYPE_MAP);
  }
}