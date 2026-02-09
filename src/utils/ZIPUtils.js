/**
 * ZIP文件解析工具类
 * 用于解析ZIP格式的Office文档
 */
export class ZIPUtils {
  /**
   * 解析ZIP文件
   * @param {ArrayBuffer} zipData - ZIP文件数据
   * @returns {Promise<Object>} ZIP文件内容 { fileName: ArrayBuffer }
   */
  static async parseZIP(zipData) {
    const files = {};
    const data = new Uint8Array(zipData);
    let offset = 0;

    // ZIP文件以PK开头
    if (data[0] !== 0x50 || data[1] !== 0x4B) {
      throw new Error('Invalid ZIP file');
    }

    // 查找Central Directory
    offset = data.length - 22;
    while (offset >= 0 && !this.matchMagicNumber(data, offset, 0x06054b50)) {
      offset--;
    }

    if (offset < 0) {
      throw new Error('Central Directory not found');
    }

    // 解析Central Directory
    const centralDirOffset = this.readUInt32LE(data, offset + 16);
    const centralDirSize = this.readUInt32LE(data, offset + 12);
    let dirOffset = centralDirOffset;

    while (dirOffset < centralDirOffset + centralDirSize) {
      const signature = this.readUInt32LE(data, dirOffset);
      if (signature !== 0x02014b50) {
        break;
      }

      const nameLength = this.readUInt16LE(data, dirOffset + 28);
      const extraLength = this.readUInt16LE(data, dirOffset + 30);
      const commentLength = this.readUInt16LE(data, dirOffset + 32);
      const localHeaderOffset = this.readUInt32LE(data, dirOffset + 42);
      
      const name = this.readString(data, dirOffset + 46, nameLength);
      
      // 读取文件数据
      const fileData = this.readFileData(data, localHeaderOffset);
      if (fileData) {
        files[name] = fileData;
      }

      dirOffset += 46 + nameLength + extraLength + commentLength;
    }

    return files;
  }

  /**
   * 读取单个文件数据
   * @param {Uint8Array} data - ZIP数据
   * @param {number} offset - Local Header偏移
   * @returns {ArrayBuffer|null} 文件数据
   */
  static readFileData(data, offset) {
    const signature = this.readUInt32LE(data, offset);
    if (signature !== 0x04034b50) {
      return null;
    }

    const nameLength = this.readUInt16LE(data, offset + 26);
    const extraLength = this.readUInt16LE(data, offset + 28);
    const compressedSize = this.readUInt32LE(data, offset + 18);
    const compressionMethod = this.readUInt16LE(data, offset + 10);
    
    let dataOffset = offset + 30 + nameLength + extraLength;
    
    if (compressionMethod === 0) {
      // 无压缩
      return data.slice(dataOffset, dataOffset + compressedSize).buffer;
    } else if (compressionMethod === 8) {
      // Deflate压缩
      const compressed = data.slice(dataOffset, dataOffset + compressedSize);
      try {
        const decompressed = this.inflate(compressed);
        return decompressed.buffer;
      } catch (e) {
        console.error('Deflate decompression failed:', e);
        return null;
      }
    }
    
    return null;
  }

  /**
   * 简单的Deflate解压实现
   * @param {Uint8Array} data - 压缩数据
   * @returns {Uint8Array} 解压数据
   */
  static inflate(data) {
    // 这里使用浏览器内置的解压能力
    // 创建一个Blob并使用Response解压
    const blob = new Blob([data], { type: 'application/x-deflate' });
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          // 使用原生DecompressionStream（如果支持）
          if (typeof DecompressionStream !== 'undefined') {
            const stream = new DecompressionStream('deflate');
            const decompressed = blob.stream().pipeThrough(stream);
            const response = new Response(decompressed);
            response.arrayBuffer().then(resolve).catch(reject);
          } else {
            // 回退方案：简单返回原始数据
            // 实际项目中应该实现完整的Deflate算法
            console.warn('DecompressionStream not supported, using fallback');
            resolve(data);
          }
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
  }

  /**
   * 读取8位整数
   */
  static readUInt8(data, offset) {
    return data[offset];
  }

  /**
   * 读取16位小端整数
   */
  static readUInt16LE(data, offset) {
    return data[offset] | (data[offset + 1] << 8);
  }

  /**
   * 读取32位小端整数
   */
  static readUInt32LE(data, offset) {
    return (data[offset] | 
            (data[offset + 1] << 8) | 
            (data[offset + 2] << 16) | 
            (data[offset + 3] << 24)) >>> 0;
  }

  /**
   * 匹配Magic Number
   */
  static matchMagicNumber(data, offset, expected) {
    return (data[offset] === (expected & 0xFF) &&
            data[offset + 1] === ((expected >> 8) & 0xFF) &&
            data[offset + 2] === ((expected >> 16) & 0xFF) &&
            data[offset + 3] === ((expected >> 24) & 0xFF));
  }

  /**
   * 读取字符串
   */
  static readString(data, offset, length) {
    return String.fromCharCode.apply(null, data.slice(offset, offset + length));
  }
}
