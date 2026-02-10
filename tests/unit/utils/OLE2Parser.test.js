/**
 * OLE2解析器单元测试
 * 
 * @description 测试OLE2解析器的核心功能
 * @author 文件预览系统研发团队
 */

import OLE2Parser from '../../src/utils/OLE2Parser.js';

describe('OLE2Parser', () => {
  let parser;

  beforeEach(() => {
    parser = new OLE2Parser();
  });

  describe('validate', () => {
    test('应该接受有效的OLE2文件', () => {
      const validData = new ArrayBuffer(512);
      const view = new DataView(validData);
      
      // 写入OLE2签名
      const signature = [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1];
      for (let i = 0; i < 8; i++) {
        view.setUint8(i, signature[i]);
      }

      expect(parser.validate(validData)).toBe(true);
    });

    test('应该拒绝无效的OLE2文件', () => {
      const invalidData = new ArrayBuffer(512);
      const view = new DataView(invalidData);
      view.setUint8(0, 0x00);

      expect(parser.validate(invalidData)).toBe(false);
    });

    test('应该拒绝过小的数据', () => {
      const smallData = new ArrayBuffer(100);
      expect(parser.validate(smallData)).toBe(false);
    });

    test('应该拒绝null', () => {
      expect(parser.validate(null)).toBe(false);
    });
  });

  describe('parseHeader', () => {
    test('应该正确解析文件头', () => {
      const testData = new ArrayBuffer(512);
      const view = new DataView(testData);
      
      // 写入签名
      const signature = [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1];
      for (let i = 0; i < 8; i++) {
        view.setUint8(i, signature[i]);
      }
      
      // 写入其他字段
      view.setUint16(24, 0x003E, true); // minorVersion
      view.setUint16(26, 0x0003, true); // majorVersion
      view.setUint16(28, 0xFFFE, true); // byteOrder
      view.setUint16(30, 0x0009, true); // sectorShift
      view.setUint32(44, 10, true);    // totalSectors

      parser.fileData = testData;
      parser.view = view;
      const header = parser.parseHeader();

      expect(header.minorVersion).toBe(0x003E);
      expect(header.majorVersion).toBe(0x0003);
      expect(header.byteOrder).toBe('little');
      expect(header.sectorShift).toBe(0x0009);
      expect(header.totalSectors).toBe(10);
    });
  });

  describe('readSector', () => {
    test('应该正确读取扇区数据', () => {
      const testData = new ArrayBuffer(2048); // 4个扇区
      const view = new DataView(testData);
      
      // 写入签名
      const signature = [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1];
      for (let i = 0; i < 8; i++) {
        view.setUint8(i, signature[i]);
      }

      // 在扇区1写入测试数据
      const testValue = 0x12345678;
      const sector1Offset = 512 + 1 * 512; // 扇区0是文件头
      view.setUint32(sector1Offset, testValue, true);

      parser.fileData = testData;
      parser.view = view;

      const sectorData = parser.readSector(1);
      const sectorView = new DataView(sectorData);
      
      expect(sectorView.getUint32(0, true)).toBe(testValue);
    });
  });

  describe('parseDirectoryEntry', () => {
    test('应该解析有效的目录条目', () => {
      const sectorData = new Uint8Array(128);
      const view = new DataView(sectorData.buffer);

      // 设置名称（UTF-16LE: "Test"）
      view.setUint16(0, 0x0054, true); // 'T'
      view.setUint16(2, 0x0065, true); // 'e'
      view.setUint16(4, 0x0073, true); // 's'
      view.setUint16(6, 0x0074, true); // 't'
      
      // 设置名称长度
      view.setUint16(64, 8, true); // 8字节（4字符 * 2字节）
      
      // 设置类型
      view.setUint8(66, 2); // Stream
      
      // 设置起始扇区
      view.setUint32(116, 0, true);
      
      // 设置流大小
      view.setUint32(120, 1024, true);

      const entry = parser.parseDirectoryEntry(sectorData, 0);

      expect(entry).not.toBeNull();
      expect(entry.name).toBe('Test');
      expect(entry.type).toBe(2);
      expect(entry.streamSize).toBe(1024);
    });

    test('应该返回null对于空条目', () => {
      const sectorData = new Uint8Array(128);
      
      const entry = parser.parseDirectoryEntry(sectorData, 0);

      expect(entry).toBeNull();
    });
  });

  describe('parseSAT', () => {
    test('应该解析SAT', () => {
      const testData = new ArrayBuffer(512 * 110); // 文件头 + 109个SAT扇区
      const view = new DataView(testData);
      
      // 写入签名
      const signature = [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1];
      for (let i = 0; i < 8; i++) {
        view.setUint8(i, signature[i]);
      }

      // 设置FAT扇区数
      view.setUint32(46, 1, true);

      // 设置第一个FAT扇区
      view.setUint32(76, 1, true);

      parser.fileData = testData;
      parser.view = view;
      parser.header = { fatSectors: 1 };

      const sat = parser.parseSAT();

      expect(Array.isArray(sat)).toBe(true);
    });
  });

  describe('buildStructure', () => {
    test('应该构建文档结构', () => {
      const entries = [
        { type: 5, name: 'Root Entry', startingSector: 0, streamSize: 4096 },
        { type: 2, name: 'WordDocument', startingSector: 1, streamSize: 1024 }
      ];

      const sat = [-2, -2, -2]; // 简化的SAT
      const ssat = [];

      const structure = parser.buildStructure(entries, sat, ssat);

      expect(structure.root).toBeDefined();
      expect(structure.streams['WordDocument']).toBeDefined();
    });
  });

  describe('readSignature', () => {
    test('应该读取签名', () => {
      const testData = new ArrayBuffer(512);
      const view = new DataView(testData);
      
      const signature = [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1];
      for (let i = 0; i < 8; i++) {
        view.setUint8(i, signature[i]);
      }

      parser.view = view;
      const readSignature = parser.readSignature();

      expect(readSignature).toEqual(signature);
    });
  });
});
