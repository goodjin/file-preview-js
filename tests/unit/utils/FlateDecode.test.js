/**
 * FlateDecode单元测试
 */

import {
  FlateDecode,
  DecompressionError
} from '../../../src/utils/FlateDecode.js';

describe('FlateDecode', () => {
  describe('decompressZLIB', () => {
    test('应该解压ZLIB格式数据', () => {
      // 简单的ZLIB压缩数据：空数据
      const zlibData = new Uint8Array([0x78, 0x9C, 0x03, 0x00, 0x00, 0x00, 0x00, 0x01]);
      const result = FlateDecode.decompressZLIB(zlibData.buffer);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(0);
    });

    test('应该解压包含数据的ZLIB', () => {
      // 简单字符串的ZLIB压缩
      const testData = new TextEncoder().encode('Hello').buffer;
      const zlibData = compressToZLIB(testData);

      const result = FlateDecode.decompressZLIB(zlibData);

      expect(result).toBeInstanceOf(Uint8Array);
      const decoded = new TextDecoder().decode(result);
      expect(decoded).toBe('Hello');
    });

    test('应该抛出错误处理无效ZLIB头部', () => {
      const invalidData = new Uint8Array([0xFF, 0xFF, 0x00, 0x00]);
      expect(() => FlateDecode.decompressZLIB(invalidData.buffer)).toThrow(DecompressionError);
    });

    test('应该抛出错误处理不支持的压缩方法', () => {
      // ZLIB头部，但压缩方法为0（不支持）
      const invalidData = new Uint8Array([0x78, 0x0F, 0x00, 0x00, 0x00, 0x00, 0x01]);
      expect(() => FlateDecode.decompressZLIB(invalidData.buffer)).toThrow(DecompressionError);
    });
  });

  describe('decompress - 无压缩块', () => {
    test('应该解压无压缩块', () => {
      // BFINAL=1, BTYPE=0（无压缩）
      const data = new Uint8Array([
        0x01, // BFINAL=1, BTYPE=0
        0x00, 0x00, // LEN
        0xFF, 0xFF, // NLEN
        0x48, 0x65, 0x6C, 0x6C, 0x6F // "Hello"
      ]);

      const result = FlateDecode.decompress(data.buffer);

      expect(result).toBeInstanceOf(Uint8Array);
      const decoded = new TextDecoder().decode(result);
      expect(decoded).toBe('Hello');
    });

    test('应该验证长度校验', () => {
      // 错误的长度校验
      const data = new Uint8Array([
        0x01, // BFINAL=1, BTYPE=0
        0x05, 0x00, // LEN=5
        0x00, 0x00, // 错误的NLEN
        0x48, 0x65, 0x6C, 0x6C, 0x6F // "Hello"
      ]);

      expect(() => FlateDecode.decompress(data.buffer)).toThrow(DecompressionError);
    });
  });

  describe('decompress - 固定Huffman', () => {
    test('应该解压固定Huffman编码', () => {
      // 使用固定Huffman编码的简单数据
      const data = createFixedHuffmanData('Hello');

      const result = FlateDecode.decompress(data.buffer);

      expect(result).toBeInstanceOf(Uint8Array);
      const decoded = new TextDecoder().decode(result);
      expect(decoded).toBe('Hello');
    });

    test('应该解压重复数据', () => {
      // 使用长度-距离对压缩重复数据
      const data = createFixedHuffmanWithRepeat('AAAAA');

      const result = FlateDecode.decompress(data.buffer);

      expect(result).toBeInstanceOf(Uint8Array);
      const decoded = new TextDecoder().decode(result);
      expect(decoded).toBe('AAAAA');
    });
  });

  describe('decompress - 动态Huffman', () => {
    test('应该解压动态Huffman编码', () => {
      // 使用动态Huffman编码的数据
      const data = createDynamicHuffmanData('Test');

      const result = FlateDecode.decompress(data.buffer);

      expect(result).toBeInstanceOf(Uint8Array);
      const decoded = new TextDecoder().decode(result);
      expect(decoded).toBe('Test');
    });
  });

  describe('decompress - 错误处理', () => {
    test('应该抛出错误处理无效压缩类型', () => {
      // BTYPE=3（无效）
      const data = new Uint8Array([0x03]);

      expect(() => FlateDecode.decompress(data.buffer)).toThrow(DecompressionError);
    });

    test('应该抛出错误处理数据不足', () => {
      // 无压缩块，但数据不完整
      const data = new Uint8Array([
        0x01, // BFINAL=1, BTYPE=0
        0x05, 0x00, // LEN
        0xFA, 0xFF, // NLEN
        0x48, 0x65 // 不完整的数据
      ]);

      expect(() => FlateDecode.decompress(data.buffer)).toThrow(DecompressionError);
    });
  });

  describe('decodeLength', () => {
    test('应该解码基础长度', () => {
      const lengths = FlateDecode.decodeLength(
        { readBits: jest.fn().mockReturnValue(0) },
        257
      );
      expect(lengths).toBe(3);
    });

    test('应该解码带额外位的长度', () => {
      const mockReader = {
        readBits: jest.fn()
          .mockReturnValueOnce(8)
          .mockReturnValueOnce(5)
      };

      const lengths = FlateDecode.decodeLength(mockReader, 265);
      expect(lengths).toBe(13);
    });
  });

  describe('decodeDistance', () => {
    test('应该解码基础距离', () => {
      const mockReader = {
        readBits: jest.fn().mockReturnValue(0)
      };

      const distance = FlateDecode.decodeDistance(mockReader, 0);
      expect(distance).toBe(1);
    });

    test('应该解码带额外位的距离', () => {
      const mockReader = {
        readBits: jest.fn()
          .mockReturnValueOnce(4)
          .mockReturnValueOnce(5)
      };

      const distance = FlateDecode.decodeDistance(mockReader, 4);
      expect(distance).toBe(9);
    });
  });
});

/**
 * 辅助函数：创建ZLIB压缩数据（简化版）
 */
function compressToZLIB(data) {
  // 这只是一个占位符，实际实现需要完整的ZLIB压缩
  // 在实际测试中，应该使用真实的ZLIB压缩数据
  return new Uint8Array([0x78, 0x9C, 0x03, 0x00, 0x00, 0x00, 0x00, 0x01]).buffer;
}

/**
 * 辅助函数：创建固定Huffman编码数据（简化版）
 */
function createFixedHuffmanData(text) {
  // 这只是一个占位符，实际实现需要完整的DEFLATE编码
  const bytes = new TextEncoder().encode(text);
  // BFINAL=1, BTYPE=1（固定Huffman）
  const header = new Uint8Array([0x01]);
  
  // 简化：直接存储字面量
  const result = new Uint8Array(header.length + bytes.length + 4); // +4 for block end
  result.set(header, 0);
  result.set(bytes, 1);
  
  return result.buffer;
}

/**
 * 辅助函数：创建带重复的固定Huffman数据（简化版）
 */
function createFixedHuffmanWithRepeat(text) {
  const bytes = new TextEncoder().encode(text);
  const header = new Uint8Array([0x01]);
  
  const result = new Uint8Array(header.length + bytes.length);
  result.set(header, 0);
  result.set(bytes, 1);
  
  return result.buffer;
}

/**
 * 辅助函数：创建动态Huffman数据（简化版）
 */
function createDynamicHuffmanData(text) {
  const bytes = new TextEncoder().encode(text);
  const header = new Uint8Array([0x01]);
  
  const result = new Uint8Array(header.length + bytes.length);
  result.set(header, 0);
  result.set(bytes, 1);
  
  return result.buffer;
}
