/**
 * FileTypeDetector 单元测试
 */

import FileTypeDetector, { EXTENSION_MAP, MAGIC_NUMBERS } from './FileTypeDetector.js';

describe('FileTypeDetector', () => {
  let detector;

  beforeEach(() => {
    detector = new FileTypeDetector();
    detector.clearCache();
  });

  describe('detectByFileName', () => {
    test('应该正确检测常见文件类型', () => {
      expect(detector.detectByFileName('test.xlsx')).toBe('xlsx');
      expect(detector.detectByFileName('document.pdf')).toBe('pdf');
      expect(detector.detectByFileName('image.png')).toBe('png');
      expect(detector.detectByFileName('photo.jpg')).toBe('jpg');
      expect(detector.detectByFileName('archive.zip')).toBe('zip');
    });

    test('应该忽略大小写', () => {
      expect(detector.detectByFileName('test.XLSX')).toBe('xlsx');
      expect(detector.detectByFileName('document.PDF')).toBe('pdf');
    });

    test('应该处理多个点的情况', () => {
      expect(detector.detectByFileName('my.document.pdf')).toBe('pdf');
    });

    test('无扩展名的文件应该返回null', () => {
      expect(detector.detectByFileName('noextension')).toBeNull();
    });

    test('不支持的扩展名应该返回null', () => {
      expect(detector.detectByFileName('file.xyz')).toBeNull();
    });
  });

  describe('detectByMagicNumber', () => {
    test('应该检测PDF文件', () => {
      const pdfBuffer = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34]);
      return detector.detectByMagicNumber(pdfBuffer).then(type => {
        expect(type).toBe('pdf');
      });
    });

    test('应该检测PNG图片', () => {
      const pngBuffer = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      return detector.detectByMagicNumber(pngBuffer).then(type => {
        expect(type).toBe('png');
      });
    });

    test('应该检测JPEG图片', () => {
      const jpegBuffer = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]);
      return detector.detectByMagicNumber(jpegBuffer).then(type => {
        expect(type).toBe('jpg');
      });
    });

    test('应该检测Office文档（ZIP格式）', () => {
      const zipBuffer = new Uint8Array([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]);
      return detector.detectByMagicNumber(zipBuffer).then(type => {
        expect(type).toBe('xlsx'); // 返回第一个匹配的Office类型
      });
    });

    test('应该检测MP3文件', () => {
      const mp3Buffer = new Uint8Array([0xFF, 0xFB, 0x90, 0x44]);
      return detector.detectByMagicNumber(mp3Buffer).then(type => {
        expect(type).toBe('mp3');
      });
    });

    test('应该检测WAV文件', () => {
      const wavBuffer = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45]);
      return detector.detectByMagicNumber(wavBuffer).then(type => {
        expect(type).toBe('wav');
      });
    });

    test('空ArrayBuffer应该返回null', () => {
      const emptyBuffer = new Uint8Array([]);
      return detector.detectByMagicNumber(emptyBuffer).then(type => {
        expect(type).toBeNull();
      });
    });

    test('未知文件类型应该返回null', () => {
      const unknownBuffer = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
      return detector.detectByMagicNumber(unknownBuffer).then(type => {
        expect(type).toBeNull();
      });
    });

    test('应该处理File对象', async () => {
      const fileContent = '%PDF-1.4';
      const file = new File([fileContent], 'test.pdf', { type: 'application/pdf' });
      
      const type = await detector.detectByMagicNumber(file);
      expect(type).toBe('pdf');
    });
  });

  describe('validate', () => {
    test('应该验证正确的PDF文件', async () => {
      const fileContent = '%PDF-1.4';
      const file = new File([fileContent], 'test.pdf', { type: 'application/pdf' });
      
      const result = await detector.validate(file);
      expect(result.isValid).toBe(true);
      expect(result.extensionType).toBe('pdf');
      expect(result.detectedType).toBe('pdf');
    });

    test('应该验证PNG文件', async () => {
      const pngHeader = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      const file = new File([pngHeader], 'test.png', { type: 'image/png' });
      
      const result = await detector.validate(file);
      expect(result.isValid).toBe(true);
      expect(result.extensionType).toBe('png');
      expect(result.detectedType).toBe('png');
    });

    test('应该检测扩展名与实际类型不匹配', async () => {
      // PDF文件但扩展名是.txt
      const fileContent = '%PDF-1.4';
      const file = new File([fileContent], 'test.txt', { type: 'text/plain' });
      
      const result = await detector.validate(file);
      expect(result.isValid).toBe(false);
      expect(result.extensionType).toBe('txt');
      expect(result.detectedType).toBe('pdf');
    });

    test('应该处理无扩展名的文件', async () => {
      const fileContent = '%PDF-1.4';
      const file = new File([fileContent], 'test', { type: 'application/pdf' });
      
      const result = await detector.validate(file);
      expect(result.extensionType).toBeNull();
      expect(result.detectedType).toBe('pdf');
    });

    test('应该处理无Magic Number的文件类型', async () => {
      const file = new File(['plain text'], 'test.txt', { type: 'text/plain' });
      
      const result = await detector.validate(file);
      expect(result.extensionType).toBe('txt');
      expect(result.detectedType).toBeNull();
      expect(result.isValid).toBe(true);
    });
  });

  describe('detect', () => {
    test('应该优先使用扩展名', async () => {
      const file = new File(['%PDF-1.4'], 'test.pdf');
      
      // Mock detectByMagicNumber来验证它是否被调用
      const spy = jest.spyOn(detector, 'detectByMagicNumber');
      spy.mockResolvedValue('pdf');
      
      const type = await detector.detect(file);
      
      expect(type).toBe('pdf');
      expect(spy).toHaveBeenCalled();
      
      spy.mockRestore();
    });

    test('应该使用Magic Number作为验证', async () => {
      const file = new File(['%PDF-1.4'], 'test.pdf');
      
      const type = await detector.detect(file);
      expect(type).toBe('pdf');
    });

    test('应该缓存检测结果', async () => {
      const file = new File(['test content'], 'test.txt');
      
      // 第一次调用
      const type1 = await detector.detect(file);
      
      // 第二次调用应该从缓存获取
      const type2 = await detector.detect(file);
      
      expect(type1).toBe(type2);
    });

    test('无效的File对象应该抛出错误', async () => {
      await expect(detector.detect(null)).rejects.toThrow('Invalid file object');
      await expect(detector.detect({})).rejects.toThrow('Invalid file object');
    });
  });

  describe('clearCache', () => {
    test('应该清除缓存', async () => {
      const file = new File(['test content'], 'test.txt');
      
      await detector.detect(file);
      detector.clearCache();
      
      // 再次调用应该重新检测
      const spy = jest.spyOn(detector, 'detectByFileName');
      const type = await detector.detect(file);
      
      expect(spy).toHaveBeenCalled();
      expect(type).toBe('txt');
      
      spy.mockRestore();
    });
  });

  describe('EXTENSION_MAP', () => {
    test('应该包含所有支持的扩展名', () => {
      expect(EXTENSION_MAP['.xlsx']).toBe('xlsx');
      expect(EXTENSION_MAP['.pdf']).toBe('pdf');
      expect(EXTENSION_MAP['.png']).toBe('png');
      expect(EXTENSION_MAP['.jpg']).toBe('jpg');
      expect(EXTENSION_MAP['.jpeg']).toBe('jpeg');
    });
  });

  describe('MAGIC_NUMBERS', () => {
    test('应该包含所有支持的Magic Number', () => {
      expect(MAGIC_NUMBERS.pdf).toEqual([0x25, 0x50, 0x44, 0x46]);
      expect(MAGIC_NUMBERS.png).toEqual([0x89, 0x50, 0x4E, 0x47]);
      expect(MAGIC_NUMBERS.jpg).toEqual([0xFF, 0xD8, 0xFF]);
      expect(MAGIC_NUMBERS.xlsx).toEqual([0x50, 0x4B, 0x03, 0x04]);
    });

    test('文本类文件应该没有Magic Number', () => {
      expect(MAGIC_NUMBERS.txt).toBeNull();
      expect(MAGIC_NUMBERS.md).toBeNull();
      expect(MAGIC_NUMBERS.json).toBeNull();
    });
  });
});
