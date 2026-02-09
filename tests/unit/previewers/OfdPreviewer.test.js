/**
 * OfdPreviewer 单元测试
 * 
 * @description 测试OFD预览器的功能
 * @version 1.0.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OfdPreviewer } from '../../../../src/previewers/OfdPreviewer.js';
import { EventBus } from '../../../../src/core/EventBus.js';

describe('OfdPreviewer', () => {
  let previewer;
  let eventBus;
  let mockFile;

  beforeEach(() => {
    eventBus = new EventBus();
    previewer = new OfdPreviewer({
      eventBus,
      stateManager: vi.fn()
    });

    mockFile = {
      name: 'test.ofd',
      size: 1024 * 100,
      type: 'application/ofd'
    };
  });

  afterEach(() => {
    if (previewer) {
      previewer.destroy();
    }
  });

  describe('基础功能', () => {
    it('应该能够创建OFD预览器实例', () => {
      expect(previewer).toBeInstanceOf(OfdPreviewer);
    });

    it('应该能够加载OFD文件', async () => {
      const result = await previewer.load(mockFile);

      expect(result.type).toBe('ofd');
      expect(result.ext).toBe('ofd');
      expect(result.pages).toBeInstanceOf(Array);
      expect(result.pages.length).toBeGreaterThan(0);
      expect(result.numPages).toBe(result.pages.length);
    });
  });

  describe('渲染功能', () => {
    it('应该能够渲染OFD预览', async () => {
      const result = await previewer.load(mockFile);

      const container = document.createElement('div');

      await previewer.render(container, result);

      const previewElement = container.querySelector('.ofd-preview');
      expect(previewElement).toBeTruthy();
    });

    it('应该能够显示OFD标识', async () => {
      const result = await previewer.load(mockFile);
      const container = document.createElement('div');

      await previewer.render(container, result);

      const watermark = container.querySelector('.ofd-page-content .ofd-watermark');
      expect(watermark).toBeTruthy();
      expect(watermark.textContent).toBe('OFD');
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

    it('应该能够切换到指定页面', async () => {
      const result = await previewer.load(mockFile);
      const container = document.createElement('div');

      await previewer.render(container, result);

      previewer.goToPage(3);

      expect(previewer.getCurrentPage()).toBe(3);
    });

    it('应该能够下一页', async () => {
      const result = await previewer.load(mockFile);
      const container = document.createElement('div');

      await previewer.render(container, result);

      previewer.nextPage();

      expect(previewer.getCurrentPage()).toBe(2);
    });

    it('应该能够上一页', async () => {
      const result = await previewer.load(mockFile);
      const container = document.createElement('div');

      await previewer.render(container, result);

      previewer.goToPage(3);
      previewer.previousPage();

      expect(previewer.getCurrentPage()).toBe(2);
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

    it('应该在页码变化时触发页码变化事件', async () => {
      const result = await previewer.load(mockFile);
      const container = document.createElement('div');

      await previewer.render(container, result);

      const pageChangeCallback = vi.fn();
      eventBus.on('page:changed', pageChangeCallback);

      previewer.goToPage(2);

      expect(pageChangeCallback).toHaveBeenCalledWith({
        currentPage: 2,
        totalPages: result.numPages
      });
    });
  });
});