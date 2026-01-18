/**
 * chrome_save_resource 功能测试
 * 测试批量保存资源功能
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PageActions } from '../../modules/chrome/page_actions.js';

describe('chrome_save_resource 批量保存功能', () => {
  let pageActions;
  let mockTabManager;
  let mockPage;
  let mockCtx;
  let savedImages;

  beforeAll(() => {
    // 模拟 TabManager
    mockPage = {
      url: () => 'https://example.com',
      title: () => Promise.resolve('测试页面'),
      evaluate: async (fn, ...args) => {
        // 模拟页面中的 fetch 操作
        const url = args[0];
        if (url.includes('image1.jpg')) {
          return {
            ok: true,
            data: [255, 216, 255, 224], // JPEG 文件头
            contentType: 'image/jpeg'
          };
        }
        if (url.includes('image2.png')) {
          return {
            ok: true,
            data: [137, 80, 78, 71], // PNG 文件头
            contentType: 'image/png'
          };
        }
        return { ok: false, error: '资源不存在' };
      }
    };

    mockTabManager = {
      getPage: (tabId) => {
        if (tabId === 'valid-tab') return mockPage;
        return null;
      }
    };

    // 模拟上下文和 saveImage 工具
    savedImages = [];
    mockCtx = {
      currentMessage: { id: 'msg-123' },
      agent: { id: 'agent-456' },
      tools: {
        saveImage: async (buffer, metadata) => {
          const filename = `artifact-${savedImages.length}.${metadata.format}`;
          savedImages.push({ buffer, metadata, filename });
          return filename;
        }
      }
    };

    pageActions = new PageActions({
      log: console,
      tabManager: mockTabManager
    });
  });

  afterAll(() => {
    savedImages = [];
  });

  it('应该支持保存单个资源（向后兼容）', async () => {
    const result = await pageActions.saveResource(
      'valid-tab',
      'https://example.com/image1.jpg',
      { ctx: mockCtx }
    );

    expect(result.ok).toBe(true);
    expect(result.artifactIds).toHaveLength(1);
    expect(result.artifactIds[0]).toBe('artifact-0');
    expect(result.images).toHaveLength(1);
    expect(result.images[0]).toBe('artifact-0.jpg');
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(0);
    expect(savedImages).toHaveLength(1);
  });

  it('应该支持保存多个资源', async () => {
    savedImages = []; // 重置
    
    const result = await pageActions.saveResource(
      'valid-tab',
      [
        'https://example.com/image1.jpg',
        'https://example.com/image2.png'
      ],
      { ctx: mockCtx }
    );

    expect(result.ok).toBe(true);
    expect(result.artifactIds).toHaveLength(2);
    expect(result.images).toHaveLength(2);
    expect(result.images[0]).toBe('artifact-0.jpg');
    expect(result.images[1]).toBe('artifact-1.png');
    expect(result.successCount).toBe(2);
    expect(result.failureCount).toBe(0);
    expect(savedImages).toHaveLength(2);
  });

  it('应该处理部分失败的情况', async () => {
    savedImages = []; // 重置
    
    const result = await pageActions.saveResource(
      'valid-tab',
      [
        'https://example.com/image1.jpg',
        'https://example.com/not-exist.jpg',
        'https://example.com/image2.png'
      ],
      { ctx: mockCtx }
    );

    expect(result.ok).toBe(true);
    expect(result.artifactIds).toHaveLength(3);
    expect(result.images).toHaveLength(2);  // 只有成功的
    expect(result.successCount).toBe(2);
    expect(result.failureCount).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].index).toBe(1);
  });

  it('应该处理 data URL', async () => {
    savedImages = []; // 重置
    
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    const result = await pageActions.saveResource(
      'valid-tab',
      [dataUrl],
      { ctx: mockCtx }
    );

    expect(result.ok).toBe(true);
    expect(result.artifactIds).toHaveLength(1);
    expect(result.images).toHaveLength(1);
    expect(result.successCount).toBe(1);
  });

  it('应该在空数组时返回错误', async () => {
    const result = await pageActions.saveResource(
      'valid-tab',
      [],
      { ctx: mockCtx }
    );

    expect(result.error).toBe('empty_urls');
  });

  it('应该在没有上下文时返回错误', async () => {
    const result = await pageActions.saveResource(
      'valid-tab',
      ['https://example.com/image1.jpg'],
      {}
    );

    expect(result.error).toBe('context_required');
  });

  it('应该在标签页不存在时返回错误', async () => {
    const result = await pageActions.saveResource(
      'invalid-tab',
      ['https://example.com/image1.jpg'],
      { ctx: mockCtx }
    );

    expect(result.error).toBe('tab_not_found');
  });
});
