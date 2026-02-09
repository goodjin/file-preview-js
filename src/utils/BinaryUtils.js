/**
 * 二进制数据工具类
 * 用于处理ArrayBuffer和DataView的读写操作
 */
export class BinaryUtils {
  /**
   * 读取8位整数
   * @param {ArrayBuffer} buffer - 数据缓冲区
   * @param {number} offset - 偏移量
   * @param {boolean} littleEndian - 是否小端序
   * @returns {number} 读取的值
   */
  static readInt8(buffer, offset, littleEndian = true) {
    const view = new DataView(buffer, offset, 1);
    return view.getInt8(0);
  }

  /**
   * 读取8位无符号整数
   * @param {ArrayBuffer} buffer - 数据缓冲区
   * @param {number} offset - 偏移量
   * @returns {number} 读取的值
   */
  static readUInt8(buffer, offset) {
    const view = new DataView(buffer, offset, 1);
    return view.getUint8(0);
  }

  /**
   * 读取16位整数
   * @param {ArrayBuffer} buffer - 数据缓冲区
   * @param {number} offset - 偏移量
   * @param {boolean} littleEndian - 是否小端序
   * @returns {number} 读取的值
   */
  static readInt16(buffer, offset, littleEndian = true) {
    const view = new DataView(buffer, offset, 2);
    return view.getInt16(0, littleEndian);
  }

  /**
   * 读取16位无符号整数
   * @param {ArrayBuffer} buffer - 数据缓冲区
   * @param {number} offset - 偏移量
   * @param {boolean} littleEndian - 是否小端序
   * @returns {number} 读取的值
   */
  static readUInt16(buffer, offset, littleEndian = true) {
    const view = new DataView(buffer, offset, 2);
    return view.getUint16(0, littleEndian);
  }

  /**
   * 读取32位整数
   * @param {ArrayBuffer} buffer - 数据缓冲区
   * @param {number} offset - 偏移量
   * @param {boolean} littleEndian - 是否小端序
   * @returns {number} 读取的值
   */
  static readInt32(buffer, offset, littleEndian = true) {
    const view = new DataView(buffer, offset, 4);
    return view.getInt32(0, littleEndian);
  }

  /**
   * 读取32位无符号整数
   * @param {ArrayBuffer} buffer - 数据缓冲区
   * @param {number} offset - 偏移量
   * @param {boolean} littleEndian - 是否小端序
   * @returns {number} 读取的值
   */
  static readUInt32(buffer, offset, littleEndian = true) {
    const view = new DataView(buffer, offset, 4);
    return view.getUint32(0, littleEndian);
  }

  /**
   * 读取64位整数
   * @param {ArrayBuffer} buffer - 数据缓冲区
   * @param {number} offset - 偏移量
   * @param {boolean} littleEndian - 是否小端序
   * @returns {number} 读取的值
   */
  static readInt64(buffer, offset, littleEndian = true) {
    const view = new DataView(buffer, offset, 8);
    return view.getBigInt64(0, littleEndian);
  }

  /**
   * 读取64位无符号整数
   * @param {ArrayBuffer} buffer - 数据缓冲区
   * @param {number} offset - 偏移量
   * @param {boolean} littleEndian - 是否小端序
   * @returns {number} 读取的值
   */
  static readUInt64(buffer, offset, littleEndian = true) {
    const view = new DataView(buffer, offset, 8);
    return view.getBigUint64(0, littleEndian);
  }

  /**
   * 读取32位浮点数
   * @param {ArrayBuffer} buffer - 数据缓冲区
   * @param {number} offset - 偏移量
   * @param {boolean} littleEndian - 是否小端序
   * @returns {number} 读取的值
   */
  static readFloat32(buffer, offset, littleEndian = true) {
    const view = new DataView(buffer, offset, 4);
    return view.getFloat32(0, littleEndian);
  }

  /**
   * 读取64位浮点数
   * @param {ArrayBuffer} buffer - 数据缓冲区
   * @param {number} offset - 偏移量
   * @param {boolean} littleEndian - 是否小端序
   * @returns {number} 读取的值
   */
  static readFloat64(buffer, offset, littleEndian = true) {
    const view = new DataView(buffer, offset, 8);
    return view.getFloat64(0, littleEndian);
  }

  /**
   * 读取字符串
   * @param {ArrayBuffer} buffer - 数据缓冲区
   * @param {number} offset - 偏移量
   * @param {number} length - 字符串长度
   * @param {string} encoding - 编码方式（'utf-8' | 'ascii'）
   * @returns {string} 读取的字符串
   */
  static readString(buffer, offset, length, encoding = 'utf-8') {
    const bytes = new Uint8Array(buffer, offset, length);
    return new TextDecoder(encoding).decode(bytes);
  }

  /**
   * 读取以null结尾的字符串
   * @param {ArrayBuffer} buffer - 数据缓冲区
   * @param {number} offset - 偏移量
   * @param {string} encoding - 编码方式
   * @returns {Object} { string, nextOffset }
   */
  static readNullTerminatedString(buffer, offset, encoding = 'utf-8') {
    const bytes = new Uint8Array(buffer, offset);
    let length = 0;
    while (length < bytes.length && bytes[length] !== 0) {
      length++;
    }
    const string = new TextDecoder(encoding).decode(bytes.slice(0, length));
    return { string, nextOffset: offset + length + 1 };
  }

  /**
   * 读取Magic Number（文件标识）
   * @param {ArrayBuffer} buffer - 数据缓冲区
   * @param {number} offset - 偏移量
   * @param {number} length - Magic Number长度
   * @returns {string} Magic Number字符串
   */
  static readMagicNumber(buffer, offset = 0, length = 8) {
    const bytes = new Uint8Array(buffer, offset, length);
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, '0').toUpperCase();
    }
    return hex;
  }

  /**
   * 比较Magic Number
   * @param {ArrayBuffer} buffer - 数据缓冲区
   * @param {string} expectedMagic - 期望的Magic Number
   * @param {number} offset - 偏移量
   * @returns {boolean} 是否匹配
   */
  static matchMagicNumber(buffer, expectedMagic, offset = 0) {
    const actual = this.readMagicNumber(buffer, offset, expectedMagic.length / 2);
    return actual === expectedMagic.toUpperCase();
  }

  /**
   * 写入8位整数
   * @param {ArrayBuffer} buffer - 数据缓冲区
   * @param {number} value - 要写入的值
   * @param {number} offset - 偏移量
   */
  static writeInt8(buffer, value, offset) {
    const view = new DataView(buffer, offset, 1);
    view.setInt8(0, value);
  }

  /**
   * 写入32位整数
   * @param {ArrayBuffer} buffer - 数据缓冲区
   * @param {number} value - 要写入的值
   * @param {number} offset - 偏移量
   * @param {boolean} littleEndian - 是否小端序
   */
  static writeInt32(buffer, value, offset, littleEndian = true) {
    const view = new DataView(buffer, offset, 4);
    view.setInt32(0, value, littleEndian);
  }

  /**
   * 将ArrayBuffer转换为字符串
   * @param {ArrayBuffer} buffer - 数据缓冲区
   * @param {string} encoding - 编码方式
   * @returns {string} 字符串
   */
  static bufferToString(buffer, encoding = 'utf-8') {
    return new TextDecoder(encoding).decode(buffer);
  }

  /**
   * 将字符串转换为ArrayBuffer
   * @param {string} str - 字符串
   * @param {string} encoding - 编码方式
   * @returns {ArrayBuffer} 数据缓冲区
   */
  static stringToBuffer(str, encoding = 'utf-8') {
    const encoder = new TextEncoder();
    return encoder.encode(str).buffer;
  }

  /**
   * 创建指定大小的空ArrayBuffer
   * @param {number} size - 大小（字节）
   * @returns {ArrayBuffer} 数据缓冲区
   */
  static createBuffer(size) {
    return new ArrayBuffer(size);
  }

  /**
   * 拼接多个ArrayBuffer
   * @param {ArrayBuffer[]} buffers - 缓冲区数组
   * @returns {ArrayBuffer} 合并后的缓冲区
   */
  static concatBuffers(buffers) {
    const totalLength = buffers.reduce((sum, buf) => sum + buf.byteLength, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const buffer of buffers) {
      result.set(new Uint8Array(buffer), offset);
      offset += buffer.byteLength;
    }
    return result.buffer;
  }

  /**
   * 截取ArrayBuffer
   * @param {ArrayBuffer} buffer - 数据缓冲区
   * @param {number} start - 起始位置
   * @param {number} end - 结束位置（不包含）
   * @returns {ArrayBuffer} 截取后的缓冲区
   */
  static sliceBuffer(buffer, start, end) {
    return buffer.slice(start, end);
  }
}
