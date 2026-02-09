/**
 * WpsPreviewer 单元测试
 * 
 * @description 测试WPS预览器的功能
 * @version 1.0.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WpsPreviewer } from '../../../../src/previewers/WpsPreviewer.js';
import { EventBus } from '../../../../src/core/EventBus.js';

describe('WpsPreviewer', () => {
  let previewer;
  let eventBus;
  let mockFile;

  beforeEach(() => {
    eventBus = new EventBus();
    previewer = new WpsPreviewer({
      eventBus,
      stateManager: vi.fn()
    });

    mockFile = {
      name: 'test.wps',
      size: 1024 * 50,
      type: 'application/wps'
    };
  });

  afterEach(() => {
    if (previewer) {
      previewer.destroy();
    }
  });

  describe('基础功能', () => {
    it('应该能够创建WPS预览器实例', () => {
      expect(previewer).toBeInstanceOf(WpsPreviewer);
    });

    it('应该能够加载WPS文件', async () => {
      const result = await previewer.load(mockFile);

      expect(result.type).toBe('wps');
      expect(result.ext).toBe('wps');
      expect(result.pages).toBeInstanceOf(Array);
      expect(result.pages.length).toBeGreaterThan(0);
      expect(result.numPages).toBe(result.pages.length);
    });
  });

  describe('渲染功能', () => {
    it('应该能够渲染WPS预览', async () => {
      const result = await previewer.load(mockFile);

      const container = document.createElement('div');

      await previewer.render(container, result);

      const previewElement = container.querySelector('.wps-preview');
      expect(previewElement).toBeTruthy();
    });
  });

  describe('页面导航', () => {
    it('应该能够获取总页数', async () => {
      const result = await previewer.load(mockFile);

      expect(previewer.getTotalPages()).toBe(result.numPages);
    });

    it('应该能够获取当前页码', async () => {
      const result = await previewer.load(mockFile);

      expect(previewer.getCurrentPage()).toBe(1);
    });
  });

  describe('事件触发', () => {
    it('应该在加载时触发进度事件', async () => {
      const progressCallback = vi.fn();
      eventBus.on('file:load:progress', progressCallback);

      await previewer.load(mockFile);

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({ progress: expect.any(Number) })
      );
    });

    it('应该在加载完成时触发完成事件', async () => {
      const loadedCallback = vi.fn();
      eventBus.on('file:loaded', loadedCallback);

      await previewer.load(mockFile);

      expect(loadedCallback).toHaveBeenCalled();
    });
  });
});