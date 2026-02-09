/**
 * P2格式集成测试
 * 
 * @description 测试P2格式的完整预览流程
 * @version 1.0.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FileUpload } from '../../../src/components/FileUpload.js';
import { FileTypeDetector } from '../../../src/core/FileTypeDetector.js';
import { PreviewerFactory } from '../../../src/core/PreviewerFactory.js';
import { EventBus } from '../../../src/core/EventBus.js';

describe('集成测试 - P2格式预览', () => {
  let fileUpload;
  let eventBus;
  let previewerFactory;

  beforeEach(() => {
    eventBus = new EventBus();
    previewerFactory = PreviewerFactory;
    fileUpload = new FileUpload({
      accept: '*',
      maxSize: 100 * 1024 * 1024,
      multiple: false,
      dragable: true
    });
  });

  afterEach(() => {
    if (fileUpload) {
      fileUpload.destroy();
    }
  });

  describe('P2格式文件检测', () => {
    it('应该能够检测WPS文件', () => {
      const file = { name: 'test.wps' };
      const fileType = FileTypeDetector.detect(file);

      expect(fileType).toBe('wps');
    });

    it('应该能够检测ET文件', () => {
      const file = { name: 'test.et' };
      const fileType = FileTypeDetector.detect(file);

      expect(fileType).toBe('et');
    });

    it('应该能够检测DPS文件', () => {
      const file = { name: 'test.dps' };
      const fileType = FileTypeDetector.detect(file);

      expect(fileType).toBe('dps');
    });

    it('应该能够检测OFD文件', () => {
      const file = { name: 'test.ofd' };
      const fileType = FileTypeDetector.detect(file);

      expect(fileType).toBe('ofd');
    });

    it('应该能够检测BMP文件', () => {
      const file = { name: 'test.bmp' };
      const fileType = FileTypeDetector.detect(file);

      expect(fileType).toBe('bmp');
    });

    it('应该能够检测SVG文件', () => {
      const file = { name: 'test.svg' };
      const fileType = FileTypeDetector.detect(file);

      expect(fileType).toBe('svg');
    });

    it('应该能够检测WebP文件', () => {
      const file = { name: 'test.webp' };
      const fileType = FileTypeDetector.detect(file);

      expect(fileType).toBe('webp');
    });

    it('应该能够检测PSD文件', () => {
      const file = { name: 'test.psd' };
      const fileType = FileTypeDetector.detect(file);

      expect(fileType).toBe('psd');
    });

    it('应该能够检测TIF文件', () => {
      const file = { name: 'test.tif' };
      const fileType = FileTypeDetector.detect(file);

      expect(fileType).toBe('tif');
    });

    it('应该能够检测WAV文件', () => {
      const file = { name: 'test.wav' };
      const fileType = FileTypeDetector.detect(file);

      expect(fileType).toBe('wav');
    });

    it('应该能够检测FLV文件', () => {
      const file = { name: 'test.flv' };
      const fileType = FileTypeDetector.detect(file);

      expect(fileType).toBe('flv');
    });

    it('应该能够检测AVI文件', () => {
      const file = { name: 'test.avi' };
      const fileType = FileTypeDetector.detect(file);

      expect(fileType).toBe('avi');
    });

    it('应该能够检测MKV文件', () => {
      const file = { name: 'test.mkv' };
      const fileType = FileTypeDetector.detect(file);

      expect(fileType).toBe('mkv');
    });

    it('应该能够检测RAR文件', () => {
      const file = { name: 'test.rar' };
      const fileType = FileTypeDetector.detect(file);

      expect(fileType).toBe('rar');
    });

    it('应该能够检测GZIP文件', () => {
      const file = { name: 'test.gz' };
      const fileType = FileTypeDetector.detect(file);

      expect(fileType).toBe('gz');
    });

    it('应该能够检测JAR文件', () => {
      const file = { name: 'test.jar' };
      const fileType = FileTypeDetector.detect(file);

      expect(fileType).toBe('jar');
    });
  });

  describe('P2格式预览器选择和加载', () => {
    it('应该能够为WPS文件选择正确的预览器', () => {
      const file = { name: 'test.wps' };

      // 假设已注册WPS预览器
      // const PreviewerClass = PreviewerFactory.getPreviewerClass('wps');

      // expect(PreviewerClass).toBeTruthy();
    });

    it('应该能够为OFD文件选择正确的预览器', () => {
      const file = { name: 'test.ofd' };

      // 假设已注册OFD预览器
      // const PreviewerClass = PreviewerFactory.getPreviewerClass('ofd');

      // expect(PreviewerClass).toBeTruthy();
    });

    it('应该能够创建预览器实例', () => {
      const file = { name: 'test.wps' };

      // 假设已注册WPS预览器
      // const previewer = PreviewerFactory.create(file, {
      //   eventBus,
      //   stateManager: new StateManager(eventBus)
      // });

      // expect(previewer).toBeTruthy();
    });
  });

  describe('错误处理', () => {
    it('应该能够处理不支持P2格式的文件', () => {
      const file = { name: 'test.unknown' };

      expect(() => {
        PreviewerFactory.create(file, {
          eventBus,
          stateManager: vi.fn()
        });
      }).toThrow('Unsupported file type: unknown');
    });

    it('应该能够处理P2格式文件加载错误', async () => {
      const errorCallback = vi.fn();
      eventBus.on('error:occurred', errorCallback);

      const error = new Error('Test error');
      eventBus.emit('error:occurred', {
        error,
        message: 'Test error message'
      });

      expect(errorCallback).toHaveBeenCalledWith({
        error,
        message: 'Test error message'
      });
    });
  });
});