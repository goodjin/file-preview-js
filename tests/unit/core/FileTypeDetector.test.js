/**
 * FileTypeDetector 单元测试
 * 
 * @description 测试文件类型检测器的功能
 * @version 1.0.0
 */

import { describe, it, expect, vi } from 'vitest';
import { FileTypeDetector } from '../../../src/core/FileTypeDetector.js';

describe('FileTypeDetector', () => {
  describe('扩展名检测', () => {
    it('应该能够从文件名中提取扩展名', () => {
      expect(FileTypeDetector.getExtension('test.docx')).toBe('docx');
      expect(FileTypeDetector.getExtension('test.pdf')).toBe('pdf');
      expect(FileTypeDetector.getExtension('test.jpg')).toBe('jpg');
    });

    it('应该能够处理没有扩展名的文件', () => {
      expect(FileTypeDetector.getExtension('test')).toBe(null);
      expect(FileTypeDetector.getExtension('test.')).toBe(null);
    });

    it('应该能够处理空文件名', () => {
      expect(FileTypeDetector.getExtension('')).toBe(null);
      expect(FileTypeDetector.getExtension(null)).toBe(null);
    });

    it('应该能够处理多个点的文件名', () => {
      expect(FileTypeDetector.getExtension('test.file.v1.docx')).toBe('docx');
    });
  });

  describe('文件类型检测', () => {
    it('应该能够检测Word文档', () => {
      const file = { name: 'test.docx' };
      expect(FileTypeDetector.detect(file)).toBe('docx');
    });

    it('应该能够检测Excel文档', () => {
      const file = { name: 'test.xlsx' };
      expect(FileTypeDetector.detect(file)).toBe('xlsx');
    });

    it('应该能够检测PDF文档', () => {
      const file = { name: 'test.pdf' };
      expect(FileTypeDetector.detect(file)).toBe('pdf');
    });

    it('应该能够检测图片', () => {
      expect(FileTypeDetector.detect({ name: 'test.jpg' })).toBe('jpg');
      expect(FileTypeDetector.detect({ name: 'test.png' })).toBe('png');
      expect(FileTypeDetector.detect({ name: 'test.gif' })).toBe('gif');
    });

    it('应该能够检测音频', () => {
      expect(FileTypeDetector.detect({ name: 'test.mp3' })).toBe('mp3');
      expect(FileTypeDetector.detect({ name: 'test.wav' })).toBe('wav');
    });

    it('应该能够检测视频', () => {
      expect(FileTypeDetector.detect({ name: 'test.mp4' })).toBe('mp4');
      expect(FileTypeDetector.detect({ name: 'test.webm' })).toBe('webm');
    });

    it('应该能够检测压缩包', () => {
      expect(FileTypeDetector.detect({ name: 'test.zip' })).toBe('zip');
      expect(FileTypeDetector.detect({ name: 'test.7z' })).toBe('7z');
    });
  });

  describe('支持的类型检查', () => {
    it('应该能够检查文件类型是否支持', () => {
      expect(FileTypeDetector.isSupported('docx')).toBe(true);
      expect(FileTypeDetector.isSupported('pdf')).toBe(true);
      expect(FileTypeDetector.isSupported('jpg')).toBe(true);
      expect(FileTypeDetector.isSupported('unknown')).toBe(false);
    });
  });

  describe('文件分类', () => {
    it('应该能够获取文件分类', () => {
      expect(FileTypeDetector.getCategory('docx')).toBe('office');
      expect(FileTypeDetector.getCategory('pdf')).toBe('document');
      expect(FileTypeDetector.getCategory('jpg')).toBe('image');
      expect(FileTypeDetector.getCategory('mp3')).toBe('media');
      expect(FileTypeDetector.getCategory('zip')).toBe('archive');
      expect(FileTypeDetector.getCategory('unknown')).toBe(null);
    });
  });

  describe('获取支持的类型', () => {
    it('应该能够返回所有支持的文件类型', () => {
      const types = FileTypeDetector.getSupportedTypes();

      expect(types).toBeInstanceOf(Array);
      expect(types.length).toBeGreaterThan(40); // 应该有45种类型
      expect(types).toContain('docx');
      expect(types).toContain('pdf');
      expect(types).toContain('jpg');
    });
  });

  describe('错误处理', () => {
    it('应该能够处理无效的文件对象', () => {
      expect(FileTypeDetector.detect(null)).toBe('unknown');
      expect(FileTypeDetector.detect(undefined)).toBe('unknown');
      expect(FileTypeDetector.detect({})).toBe('unknown');
    });

    it('应该能够处理文件名读取错误', () => {
      const file = { name: null };
      expect(FileTypeDetector.detect(file)).toBe('unknown');
    });
  });
});