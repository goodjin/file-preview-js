/**
 * DOC解析器单元测试
 * 
 * @description 测试DOC解析器的核心功能
 * @author 文件预览系统研发团队
 */

import DOCParser from '../../src/parsers/DOCParser.js';

// Mock OLE2Parser
jest.mock('../../src/utils/OLE2Parser.js');

describe('DOCParser', () => {
  let parser;
  let mockFileData;

  beforeEach(() => {
    parser = new DOCParser();
    mockFileData = new ArrayBuffer(10000);
  });

  describe('parse', () => {
    test('应该解析DOC文件并返回内容', async () => {
      // Mock OLE2Parser.parse返回值
      const mockWordDocumentStream = new Uint8Array(2048);
      parser.ole2Parser.parse = jest.fn().mockResolvedValue({
        streams: {
          'WordDocument': mockWordDocumentStream
        }
      });

      const result = await parser.parse(mockFileData);

      expect(result.type).toBe('word');
      expect(result.format).toBe('DOC');
      expect(result.content).toBeDefined();
    });

    test('应该抛出错误当WordDocument流不存在时', async () => {
      parser.ole2Parser.parse = jest.fn().mockResolvedValue({
        streams: {}
      });

      await expect(parser.parse(mockFileData)).rejects.toThrow('WordDocument stream not found');
    });
  });

  describe('validate', () => {
    test('应该验证有效的DOC文件', async () => {
      parser.ole2Parser.parse = jest.fn().mockResolvedValue({
        streams: {}
      });

      const isValid = await parser.validate(mockFileData);

      expect(isValid).toBe(true);
    });

    test('应该拒绝无效的DOC文件', async () => {
      parser.ole2Parser.parse = jest.fn().mockRejectedValue(
        new Error('Invalid OLE2 file')
      );

      const isValid = await parser.validate(mockFileData);

      expect(isValid).toBe(false);
    });
  });

  describe('getMetadata', () => {
    test('应该返回元数据', async () => {
      const mockMetadata = {
        format: 'DOC',
        version: 'Word 97',
        magic: '0xA5EC'
      };

      parser.ole2Parser.parse = jest.fn().mockResolvedValue({
        streams: {
          'WordDocument': new Uint8Array(2048)
        }
      });

      const metadata = await parser.getMetadata(mockFileData);

      expect(metadata).toBeDefined();
      expect(metadata.format).toBe('DOC');
    });
  });

  describe('parseFIB', () => {
    test('应该正确解析FIB', () => {
      const mockStream = new Uint8Array(2048);
      const view = new DataView(mockStream.buffer);

      // 设置FIB字段
      view.setUint16(0, 0xA5EC, true); // magic
      view.setUint16(2, 0x00C5, true); // version (Word 97)
      view.setUint16(4, 0x0006, true); // flags

      const fib = parser.parseFIB(mockStream);

      expect(fib.magic).toBe(0xA5EC);
      expect(fib.version).toBe(0x00C5);
      expect(fib.flags).toBe(0x0006);
    });
  });

  describe('parseContent', () => {
    test('应该解析文档内容', () => {
      const mockStream = new Uint8Array(2048);
      const view = new DataView(mockStream.buffer);

      // 设置FIB
      view.setUint16(0, 0xA5EC, true);
      view.setUint16(2, 0x00C5, true);

      // 在偏移1024处写入文本
      const text = 'Hello World';
      for (let i = 0; i < text.length; i++) {
        view.setUint8(1024 + i, text.charCodeAt(i));
      }

      const content = parser.parseContent(mockStream);

      expect(content).toBeDefined();
      expect(Array.isArray(content)).toBe(true);
    });
  });

  describe('extractText', () => {
    test('应该提取文本内容', () => {
      const mockStream = new Uint8Array(2048);
      const view = new DataView(mockStream.buffer);

      // 在偏移1024处写入文本
      const text = 'Test Document';
      for (let i = 0; i < text.length; i++) {
        view.setUint8(1024 + i, text.charCodeAt(i));
      }

      const extractedText = parser.extractText(mockStream);

      expect(extractedText).toContain('Test Document');
    });

    test('应该处理换行符', () => {
      const mockStream = new Uint8Array(2048);
      const view = new DataView(mockStream.buffer);

      view.setUint8(1024, 0x0D); // CR
      view.setUint8(1025, 0x0A); // LF
      view.setUint8(1026, 65);   // 'A'

      const extractedText = parser.extractText(mockStream);

      expect(extractedText).toContain('\n');
      expect(extractedText).toContain('A');
    });

    test('应该跳过控制字符', () => {
      const mockStream = new Uint8Array(2048);
      const view = new DataView(mockStream.buffer);

      view.setUint8(1024, 0x01); // 控制字符
      view.setUint8(1025, 65);   // 'A'

      const extractedText = parser.extractText(mockStream);

      expect(extractedText).not.toContain('\x01');
      expect(extractedText).toContain('A');
    });
  });

  describe('decodeGBK', () => {
    test('应该解码GBK字符', () => {
      // 测试简单情况
      const result = parser.decodeGBK(0xC4, 0xE3);
      expect(typeof result).toBe('string');
    });

    test('应该返回?对于无法解码的字符', () => {
      const result = parser.decodeGBK(0xFF, 0xFF);
      expect(result).toBe('?');
    });
  });

  describe('getFIBMetadata', () => {
    test('应该返回FIB元数据', () => {
      parser.fib = {
        magic: 0xA5EC,
        version: 0x00C5,
        flags: 0x0006
      };

      const metadata = parser.getFIBMetadata();

      expect(metadata).toBeDefined();
      expect(metadata.format).toBe('DOC');
      expect(metadata.version).toContain('Word 97');
      expect(metadata.magic).toBe('0xA5EC');
    });

    test('应该处理未知版本', () => {
      parser.fib = {
        magic: 0xA5EC,
        version: 0xFFFF,
        flags: 0x0000
      };

      const metadata = parser.getFIBMetadata();

      expect(metadata.version).toContain('Unknown');
    });

    test('应该返回空对象当FIB不存在时', () => {
      parser.fib = null;

      const metadata = parser.getFIBMetadata();

      expect(metadata).toEqual({});
    });
  });

  describe('getFIBVersion', () => {
    test('应该识别Word 97', () => {
      parser.fib = { version: 0x00C5 };
      const version = parser.getFIBVersion();
      expect(version).toContain('Word 97');
    });

    test('应该识别Word 2000', () => {
      parser.fib = { version: 0x00C6 };
      const version = parser.getFIBVersion();
      expect(version).toContain('Word 2000');
    });

    test('应该识别Word 2002/2003', () => {
      parser.fib = { version: 0x00C7 };
      const version = parser.getFIBVersion();
      expect(version).toContain('Word 2002/2003');
    });

    test('应该识别Word 2007', () => {
      parser.fib = { version: 0x00C8 };
      const version = parser.getFIBVersion();
      expect(version).toContain('Word 2007');
    });

    test('应该返回未知对于未知版本', () => {
      parser.fib = { version: 0x1234 };
      const version = parser.getFIBVersion();
      expect(version).toContain('Unknown');
    });
  });
});
