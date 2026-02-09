/**
 * Flate解压算法实现
 * 基于RFC 1951规范实现DEFLATE解压算法
 */

/**
 * 自定义解压错误类
 */
export class DecompressionError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'DecompressionError';
    this.code = code;
  }
}

/**
 * 位读取器类 - 用于按位读取数据
 */
class BitReader {
  constructor(data) {
    this.data = new Uint8Array(data);
    this.position = 0;
    this.bitBuffer = 0;
    this.bitCount = 0;
  }

  /**
   * 读取指定位数
   * @param {number} bits - 位数
   * @returns {number} 读取的值
   */
  readBits(bits) {
    while (this.bitCount < bits) {
      if (this.position >= this.data.length) {
        throw new DecompressionError('数据不足', 'INSUFFICIENT_DATA');
      }
      this.bitBuffer |= this.data[this.position++] << this.bitCount;
      this.bitCount += 8;
    }

    const result = this.bitBuffer & ((1 << bits) - 1);
    this.bitBuffer >>= bits;
    this.bitCount -= bits;

    return result;
  }

  /**
   * 读取一个字节
   * @returns {number} 读取的字节
   */
  readByte() {
    return this.readBits(8);
  }

  /**
   * 对齐到字节边界
   */
  alignToByte() {
    this.bitCount = 0;
    this.bitBuffer = 0;
  }
}

/**
 * Huffman树节点
 */
class HuffmanNode {
  constructor(symbol = null, left = null, right = null) {
    this.symbol = symbol;
    this.left = left;
    this.right = right;
  }
}

/**
 * Flate解压器
 */
export class FlateDecode {
  /**
   * 解压数据
   * @param {ArrayBuffer} compressedData - 压缩数据
   * @returns {Uint8Array} 解压后的数据
   */
  static decompress(compressedData) {
    const reader = new BitReader(compressedData);
    const output = [];

    // 读取BFINAL和BTYPE
    const bfinal = reader.readBits(1);
    const btype = reader.readBits(2);

    try {
      if (btype === 0) {
        // 无压缩
        this.decompressUncompressed(reader, output);
      } else if (btype === 1) {
        // 固定Huffman编码
        this.decompressFixed(reader, output);
      } else if (btype === 2) {
        // 动态Huffman编码
        this.decompressDynamic(reader, output);
      } else {
        throw new DecompressionError('无效的压缩类型', 'INVALID_COMPRESSION');
      }
    } catch (e) {
      throw new DecompressionError(`解压失败: ${e.message}`, e.code || 'DECOMPRESSION_FAILED');
    }

    return new Uint8Array(output);
  }

  /**
   * 解压无压缩块
   * @param {BitReader} reader - 位读取器
   * @param {Array} output - 输出数组
   */
  static decompressUncompressed(reader, output) {
    reader.alignToByte();
    
    const len = reader.readByte() | (reader.readByte() << 8);
    const nlen = reader.readByte() | (reader.readByte() << 8);

    // 验证长度
    if ((len ^ 0xFFFF) !== nlen) {
      throw new DecompressionError('长度校验失败', 'LENGTH_CHECK_FAILED');
    }

    for (let i = 0; i < len; i++) {
      output.push(reader.readByte());
    }
  }

  /**
   * 解压固定Huffman编码块
   * @param {BitReader} reader - 位读取器
   * @param {Array} output - 输出数组
   */
  static decompressFixed(reader, output) {
    // 构建固定的Huffman树
    const literalTree = this.buildFixedLiteralTree();
    const distanceTree = this.buildFixedDistanceTree();

    this.decompressBlock(reader, literalTree, distanceTree, output);
  }

  /**
   * 解压动态Huffman编码块
   * @param {BitReader} reader - 位读取器
   * @param {Array} output - 输出数组
   */
  static decompressDynamic(reader, output) {
    // 读取HLIT, HDIST, HCLEN
    const hlit = reader.readBits(5) + 257;
    const hdist = reader.readBits(5) + 1;
    const hclen = reader.readBits(4) + 4;

    // 读取代码长度编码
    const codeLengthOrder = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
    const codeLengths = new Array(19).fill(0);

    for (let i = 0; i < hclen; i++) {
      codeLengths[codeLengthOrder[i]] = reader.readBits(3);
    }

    // 构建代码长度树
    const codeLengthTree = this.buildHuffmanTree(codeLengths, 19);

    // 读取字面量/长度编码
    const literalLengths = this.decodeCodeLengths(reader, codeLengthTree, hlit);

    // 读取距离编码
    const distanceLengths = this.decodeCodeLengths(reader, codeLengthTree, hdist);

    // 构建Huffman树
    const literalTree = this.buildHuffmanTree(literalLengths, hlit);
    const distanceTree = this.buildHuffmanTree(distanceLengths, hdist);

    // 解压块
    this.decompressBlock(reader, literalTree, distanceTree, output);
  }

  /**
   * 解码编码长度
   * @param {BitReader} reader - 位读取器
   * @param {HuffmanNode} codeLengthTree - 代码长度树
   * @param {number} count - 数量
   * @returns {Array} 编码长度数组
   */
  static decodeCodeLengths(reader, codeLengthTree, count) {
    const lengths = [];
    let i = 0;

    while (i < count) {
      const symbol = this.decodeSymbol(reader, codeLengthTree);

      if (symbol < 16) {
        lengths.push(symbol);
        i++;
      } else {
        let repeat = 0;
        let prev = 0;

        if (symbol === 16) {
          prev = lengths[i - 1];
          repeat = 3 + reader.readBits(2);
        } else if (symbol === 17) {
          prev = 0;
          repeat = 3 + reader.readBits(3);
        } else if (symbol === 18) {
          prev = 0;
          repeat = 11 + reader.readBits(7);
        }

        for (let j = 0; j < repeat; j++) {
          lengths.push(prev);
          i++;
        }
      }
    }

    return lengths;
  }

  /**
   * 构建固定字面量Huffman树
   * @returns {HuffmanNode} Huffman树
   */
  static buildFixedLiteralTree() {
    const lengths = [];
    for (let i = 0; i < 144; i++) lengths.push(8);
    for (let i = 144; i < 256; i++) lengths.push(9);
    for (let i = 256; i < 280; i++) lengths.push(7);
    for (let i = 280; i < 288; i++) lengths.push(8);
    return this.buildHuffmanTree(lengths, 288);
  }

  /**
   * 构建固定距离Huffman树
   * @returns {HuffmanNode} Huffman树
   */
  static buildFixedDistanceTree() {
    const lengths = new Array(30).fill(5);
    return this.buildHuffmanTree(lengths, 30);
  }

  /**
   * 构建Huffman树
   * @param {Array} lengths - 编码长度数组
   * @param {number} maxSymbol - 最大符号值
   * @returns {HuffmanNode} Huffman树
   */
  static buildHuffmanTree(lengths, maxSymbol) {
    // 计算每个长度的代码数量
    const blCount = new Array(16).fill(0);
    for (let i = 0; i < maxSymbol; i++) {
      if (lengths[i] > 0) {
        blCount[lengths[i]]++;
      }
    }

    // 计算起始代码
    const code = new Array(16).fill(0);
    let nextCode = 0;
    for (let bits = 1; bits < 16; bits++) {
      nextCode = (nextCode + blCount[bits - 1]) << 1;
      code[bits] = nextCode;
    }

    // 为每个符号分配代码
    const codes = new Array(maxSymbol);
    for (let i = 0; i < maxSymbol; i++) {
      if (lengths[i] > 0) {
        codes[i] = { code: code[lengths[i]]++, len: lengths[i] };
      }
    }

    // 构建Huffman树
    const root = new HuffmanNode();
    for (let i = 0; i < maxSymbol; i++) {
      if (!codes[i]) continue;

      let node = root;
      for (let j = codes[i].len - 1; j >= 0; j--) {
        const bit = (codes[i].code >> j) & 1;
        if (bit === 0) {
          if (!node.left) node.left = new HuffmanNode();
          node = node.left;
        } else {
          if (!node.right) node.right = new HuffmanNode();
          node = node.right;
        }
      }
      node.symbol = i;
    }

    return root;
  }

  /**
   * 从Huffman树解码符号
   * @param {BitReader} reader - 位读取器
   * @param {HuffmanNode} tree - Huffman树
   * @returns {number} 解码的符号
   */
  static decodeSymbol(reader, tree) {
    let node = tree;
    while (node.symbol === null) {
      const bit = reader.readBits(1);
      if (bit === 0) {
        node = node.left;
      } else {
        node = node.right;
      }
      if (!node) {
        throw new DecompressionError('无效的Huffman编码', 'INVALID_HUFFMAN');
      }
    }
    return node.symbol;
  }

  /**
   * 解压块
   * @param {BitReader} reader - 位读取器
   * @param {HuffmanNode} literalTree - 字面量树
   * @param {HuffmanNode} distanceTree - 距离树
   * @param {Array} output - 输出数组
   */
  static decompressBlock(reader, literalTree, distanceTree, output) {
    while (true) {
      const symbol = this.decodeSymbol(reader, literalTree);

      if (symbol < 256) {
        // 字面量
        output.push(symbol);
      } else if (symbol === 256) {
        // 块结束
        break;
      } else {
        // 长度和距离对
        const length = this.decodeLength(reader, symbol);
        const distance = this.decodeDistance(reader, distanceTree);

        // 复制数据
        const start = output.length - distance;
        for (let i = 0; i < length; i++) {
          output.push(output[start + i]);
        }
      }
    }
  }

  /**
   * 解码长度
   * @param {BitReader} reader - 位读取器
   * @param {number} symbol - 符号
   * @returns {number} 长度
   */
  static decodeLength(reader, symbol) {
    const base = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
    const extraBits = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
    
    const index = symbol - 257;
    let length = base[index];
    
    if (extraBits[index] > 0) {
      length += reader.readBits(extraBits[index]);
    }
    
    return length;
  }

  /**
   * 解码距离
   * @param {BitReader} reader - 位读取器
   * @param {HuffmanNode} distanceTree - 距离树
   * @returns {number} 距离
   */
  static decodeDistance(reader, distanceTree) {
    const symbol = this.decodeSymbol(reader, distanceTree);
    
    const base = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
    const extraBits = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
    
    let distance = base[symbol];
    
    if (extraBits[symbol] > 0) {
      distance += reader.readBits(extraBits[symbol]);
    }
    
    return distance;
  }

  /**
   * 解压ZLIB格式数据（包含头部和校验和）
   * @param {ArrayBuffer} zlibData - ZLIB格式数据
   * @returns {Uint8Array} 解压后的数据
   */
  static decompressZLIB(zlibData) {
    const data = new Uint8Array(zlibData);
    const cmf = data[0];
    const flg = data[1];

    // 验证ZLIB头部
    if ((cmf << 8 | flg) % 31 !== 0) {
      throw new DecompressionError('无效的ZLIB头部', 'INVALID_ZLIB_HEADER');
    }

    const compressionMethod = cmf & 0x0F;
    if (compressionMethod !== 8) {
      throw new DecompressionError('不支持的压缩方法', 'UNSUPPORTED_COMPRESSION');
    }

    // 跳过ZLIB头部（2字节），解压数据
    const compressedData = data.slice(2, data.length - 4);
    const result = this.decompress(compressedData.buffer);

    return result;
  }
}
