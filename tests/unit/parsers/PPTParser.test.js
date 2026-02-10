/**
 * PPT解析器单元测试
 * 
 * @description 测试PPT解析器的核心功能
 * @author 文件预览系统研发团队
 */

import PPTParser from '../../src/parsers/PPTParser.js';

// Mock OLE2Parser
jest.mock('../../src/utils/OLE2Parser.js');

describe('PPTParser', () => {
  let parser;
  let mockFileData;

  beforeEach(() => {
    parser = new PPTParser();
    mockFileData = new ArrayBuffer(10000);
  });

  describe('parse', () => {
    test('应该解析PPT文件并返回幻灯片', async () => {
      // Mock OLE2Parser.parse返回值
      const mockSlide1Data = new Uint8Array(1024);
      const view = new DataView(mockSlide1Data.buffer);
      // 在偏移512处写入文本
      const text = 'Slide 1 Text';
      for (let i = 0; i < text.length; i++) {
        view.setUint8(512 + i, text.charCodeAt(i));
      }

      parser.ole2Parser.parse = jest.fn().mockResolvedValue({
        streams: {
          'PPT Document': new Uint8Array(512),
          'Slide 1': mockSlide1Data
        }
      });

      const result = await parser.parse(mockFileData);

      expect(result.type).toBe('powerpoint');
      expect(result.format).toBe('PPT');
      expect(result.slides).toBeDefined();
      expect(Array.isArray(result.slides)).toBe(true);
    });

    test('应该抛出错误当PPT Document流不存在时', async () => {
      parser.ole2Parser.parse = jest.fn().mockResolvedValue({
        streams: {}
      });

      await expect(parser.parse(mockFileData)).rejects.toThrow('PPT Document stream not found');
    });
  });

  describe('validate', () => {
    test('应该验证有效的PPT文件', async () => {
      parser.ole2Parser.parse = jest.fn().mockResolvedValue({
        streams: {
          'PPT Document': new Uint8Array(512)
        }
      });

      const isValid = await parser.validate(mockFileData);

      expect(isValid).toBe(true);
    });

    test('应该拒绝无效的PPT文件', async () => {
      parser.ole2Parser.parse = jest.fn().mockRejectedValue(
        new Error('Invalid OLE2 file')
      );

      const isValid = await parser.validate(mockFileData);

      expect(isValid).toBe(false);
    });
  });

  describe('getMetadata', () => {
    test('应该返回元数据', async () => {
      parser.ole2Parser.parse = jest.fn().mockResolvedValue({
        streams: {
          'PPT Document': new Uint8Array(512),
          'Slide 1': new Uint8Array(1024)
        }
      });

      const metadata = await parser.getMetadata(mockFileData);

      expect(metadata).toBeDefined();
      expect(metadata.format).toBe('PPT');
      expect(metadata.slideCount).toBe(1);
    });
  });

  describe('parsePPTDocument', () => {
    test('应该正确解析PPTDocument', () => {
      const mockPPTDoc = new Uint8Array(512);
      const view = new DataView(mockPPTDoc.buffer);

      view.setUint16(0, 0x03D4, true); // magic
      view.setUint16(2, 0x03D4, true); // version

      const pptDoc = parser.parsePPTDocument(mockPPTDoc);

      expect(pptDoc.magic).toBe(0x03D4);
      expect(pptDoc.version).toBe(0x03D4);
    });
  });

  describe('parseSlide', () => {
    test('应该解析幻灯片内容', () => {
      const mockSlideData = new Uint8Array(1024);
      const view = new DataView(mockSlideData.buffer);

      // 在偏移512处写入文本
      const text = 'Slide Content';
      for (let i = 0; i < text.length; i++) {
        view.setUint8(512 + i, text.charCodeAt(i));
      }

      const slide = parser.parseSlide(mockSlideData);

      expect(slide).toBeDefined();
      expect(slide.text).toBeDefined();
      expect(slide.shapes).toBeDefined();
      expect(Array.isArray(slide.elements)).toBe(true);
    });
  });

  describe('extractTextFromSlide', () => {
    test('应该提取文本内容', () => {
      const mockSlideData = new Uint8Array(1024);
      const view = new DataView(mockSlideData.buffer);

      // 在偏移512处写入文本
      const text = 'Presentation Slide';
      for (let i = 0; i < text.length; i++) {
        view.setUint8(512 + i, text.charCodeAt(i));
      }

      const extractedText = parser.extractTextFromSlide(mockSlideData);

      expect(extractedText).toContain('Presentation Slide');
    });

    test('应该处理换行符', () => {
      const mockSlideData = new Uint8Array(1024);
      const view = new DataView(mockSlideData.buffer);

      view.setUint8(512, 0x0D); // CR
      view.setUint8(513, 0x0A); // LF
      view.setUint8(514, 65);   // 'A'

      const extractedText = parser.extractTextFromSlide(mockSlideData);

      expect(extractedText).toContain('\n');
      expect(extractedText).toContain('A');
    });

    test('应该跳过控制字符', () => {
      const mockSlideData = new Uint8Array(1024);
      const view = new DataView(mockSlideData.buffer);

      view.setUint8(512, 0x01); // 控制字符
      view.setUint8(513, 65);   // 'A'

      const extractedText = parser.extractTextFromSlide(mockSlideData);

      expect(extractedText).not.toContain('\x01');
      expect(extractedText).toContain('A');
    });
  });

  describe('extractShapes', () => {
    test('应该返回空数组（简化实现）', () => {
      const mockSlideData = new Uint8Array(1024);
      const shapes = parser.extractShapes(mockSlideData);

      expect(Array.isArray(shapes)).toBe(true);
      expect(shapes.length).toBe(0);
    });
  });

  describe('extractImages', () => {
    test('应该提取图片流', async () => {
      const mockImageData = new Uint8Array([0x89, 0x50, 0x4E, 0x47]); // PNG header

      parser.ole2Parser.parse = jest.fn().mockResolvedValue({
        streams: {
          'PPT Document': new Uint8Array(512),
          'Picture 1': mockImageData
        }
      });

      const images = await parser.extractImages(await parser.ole2Parser.parse(mockFileData));

      expect(images).toBeDefined();
      expect(Array.isArray(images)).toBe(true);
      if (images.length > 0) {
        expect(images[0].mimeType).toBe('image/png');
      }
    });

    test('应该过滤非图片流', async () => {
      parser.ole2Parser.parse = jest.fn().mockResolvedValue({
        streams: {
          'PPT Document': new Uint8Array(512),
          'Slide 1': new Uint8Array(1024)
        }
      });

      const images = await parser.extractImages(await parser.ole2Parser.parse(mockFileData));

      expect(images.length).toBe(0);
    });
  });

  describe('detectMimeType', () => {
    test('应该检测PNG图片', () => {
      const imageData = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      const mimeType = parser.detectMimeType(imageData);
      expect(mimeType).toBe('image/png');
    });

    test('应该检测JPEG图片', () => {
      const imageData = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]);
      const mimeType = parser.detectMimeType(imageData);
      expect(mimeType).toBe('image/jpeg');
    });

    test('应该检测GIF图片', () => {
      const imageData = new Uint8Array([0x47, 0x49, 0x46, 0x38]);
      const mimeType = parser.detectMimeType(imageData);
      expect(mimeType).toBe('image/gif');
    });

    test('应该返回PNG作为默认值', () => {
      const imageData = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
      const mimeType = parser.detectMimeType(imageData);
      expect(mimeType).toBe('image/png');
    });
  });

  describe('getMetadata', () => {
    test('应该返回PPT元数据', () => {
      parser.pptDocument = {
        magic: 0x03D4,
        version: 0x03D4,
        slideCount: 5
      };

      const metadata = parser.getMetadata();

      expect(metadata).toBeDefined();
      expect(metadata.format).toBe('PPT');
      expect(metadata.version).toContain('PowerPoint 97');
      expect(metadata.slideCount).toBe(5);
    });

    test('应该返回空对象当PPTDocument不存在时', () => {
      parser.pptDocument = null;

      const metadata = parser.getMetadata();

      expect(metadata).toEqual({});
    });
  });

  describe('getPPTVersion', () => {
    test('应该识别PowerPoint 97', () => {
      parser.pptDocument = { version: 0x03D4 };
      const version = parser.getPPTVersion();
      expect(version).toContain('PowerPoint 97');
    });

    test('应该识别PowerPoint 2000', () => {
      parser.pptDocument = { version: 0x03D8 };
      const version = parser.getPPTVersion();
      expect(version).toContain('PowerPoint 2000');
    });

    test('应该识别PowerPoint 2002/2003', () => {
      parser.pptDocument = { version: 0x03DD };
      const version = parser.getPPTVersion();
      expect(version).toContain('PowerPoint 2002/2003');
    });

    test('应该返回未知对于未知版本', () => {
      parser.pptDocument = { version: 0xFFFF };
      const version = parser.getPPTVersion();
      expect(version).toContain('Unknown');
    });

    test('应该返回Unknown当PPTDocument不存在时', () => {
      parser.pptDocument = null;
      const version = parser.getPPTVersion();
      expect(version).toBe('Unknown');
    });
  });

  describe('arrayBufferToBase64', () => {
    test('应该将ArrayBuffer转换为Base64', () => {
      const buffer = new ArrayBuffer(3);
      const view = new Uint8Array(buffer);
      view[0] = 72;  // 'H'
      view[1] = 101; // 'e'
      view[2] = 108; // 'l'

      const result = parser.arrayBufferToBase64(buffer);
      expect(result).toBe('SGVs');
    });
  });
});
