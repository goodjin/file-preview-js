/**
 * PreviewerFactory 单元测试
 * 
 * @description 测试预览器工厂的功能
 * @version 1.0.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventBus } from '../../../src/core/EventBus.js';
import { StateManager } from '../../../src/core/StateManager.js';
import { PreviewerFactory } from '../../../src/core/PreviewerFactory.js';

// 模拟预览器类
class MockPreviewer {
  constructor(options = {}) {
    this.eventBus = options.eventBus;
    this.stateManager = options.stateManager;
  }

  async load(file) {
    return { type: 'mock', ext: 'mock' };
  }

  async render(container, data) {
    return;
  }

  destroy() {
    return;
  }

  getTotalPages() {
    return 1;
  }
}

describe('PreviewerFactory', () => {
  let eventBus;
  let stateManager;
  let previewerFactory;

  beforeEach(() => {
    eventBus = new EventBus();
    stateManager = new StateManager(eventBus);
    previewerFactory = PreviewerFactory;
  });

  afterEach(() => {
    previewerFactory.clear();
  });

  describe('注册预览器', () => {
    it('应该能够注册预览器', () => {
      previewerFactory.register('test', MockPreviewer);

      expect(PreviewerFactory.isRegistered('test')).toBe(true);
    });

    it('应该能够批量注册预览器', () => {
      previewerFactory.registerMultiple({
        test1: MockPreviewer,
        test2: MockPreviewer,
        test3: MockPreviewer
      });

      expect(PreviewerFactory.isRegistered('test1')).toBe(true);
      expect(PreviewerFactory.isRegistered('test2')).toBe(true);
      expect(PreviewerFactory.isRegistered('test3')).toBe(true);
    });

    it('应该能够获取所有已注册的类型', () => {
      previewerFactory.register('test', MockPreviewer);
      const types = PreviewerFactory.getRegisteredTypes();

      expect(types).toContain('test');
    });
  });

  describe('取消注册预览器', () => {
    it('应该能够取消注册预览器', () => {
      previewerFactory.register('test', MockPreviewer);
      expect(PreviewerFactory.isRegistered('test')).toBe(true);

      previewerFactory.unregister('test');
      expect(PreviewerFactory.isRegistered('test')).toBe(false);
    });
  });

  describe('创建预览器', () => {
    it('应该能够根据文件类型创建预览器', () => {
      previewerFactory.register('test', MockPreviewer);
      const file = { name: 'test.test' };

      const previewer = previewerFactory.create(file, {
        eventBus,
        stateManager
      });

      expect(previewer).toBeInstanceOf(MockPreviewer);
    });

    it('应该能够为不支持的文件类型抛出错误', () => {
      const file = { name: 'test.unknown' };

      expect(() => {
        previewerFactory.create(file, {
          eventBus,
          stateManager
        });
      }).toThrow('Unsupported file type: unknown');
    });
  });

  describe('获取预览器类', () => {
    it('应该能够获取已注册的预览器类', () => {
      previewerFactory.register('test', MockPreviewer);

      const PreviewerClass = previewerFactory.getPreviewerClass('test');

      expect(PreviewerClass).toBe(MockPreviewer);
    });

    it('应该为未注册的文件类型抛出错误', () => {
      expect(() => {
        previewerFactory.getPreviewerClass('unknown');
      }).toThrow('No previewer registered for file type: unknown');
    });
  });

  describe('清除所有预览器', () => {
    it('应该能够清除所有预览器', () => {
      previewerFactory.register('test1', MockPreviewer);
      previewerFactory.register('test2', MockPreviewer);

      previewerFactory.clear();

      expect(PreviewerFactory.getRegisteredTypes().length).toBe(0);
    });
  });

  describe('预览器选项', () => {
    it('应该能够传递选项给预览器', () => {
      previewerFactory.register('test', MockPreviewer);
      const file = { name: 'test.test' };
      const options = {
        eventBus,
        stateManager,
        customOption: 'custom'
      };

      const previewer = previewerFactory.create(file, options);

      expect(previewer.eventBus).toBe(eventBus);
      expect(previewer.stateManager).toBe(stateManager);
    });
  });
});