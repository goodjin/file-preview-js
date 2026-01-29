/**
 * docx子模块主入口单元测试
 */
import { DocxPreview } from '../index.js';

// 模拟DocxParser
jest.mock('../DocxParser.js', () => {
  return jest.fn().mockImplementation(() => ({
    parse: jest.fn().mockResolvedValue({
      html: '<p>Test content</p>',
      rawText: 'Test content',
      warnings: [{ type: 'warning', message: 'Test warning' }],
      errors: []
    }),
    getParsedData: jest.fn(() => ({
      html: '<p>Test content</p>',
      rawText: 'Test content',
      warnings: [{ type: 'warning', message: 'Test warning' }],
      errors: []
    })),
    clear: jest.fn()
  }));
});

// 模拟DocxRenderer
jest.mock('../DocxRenderer.js', () => {
  return jest.fn().mockImplementation(() => ({
    render: jest.fn(),
    setZoom: jest.fn(),
    getZoom: jest.fn(() => 1.0),
    update: jest.fn(),
    clear: jest.fn()
  }));
});

describe('DocxPreview (index.js)', () => {
  let preview;
  let mockContainer;

  beforeEach(() => {
    preview = new DocxPreview();
    mockContainer = document.createElement('div');
    document.body.appendChild(mockContainer);
  });

  afterEach(() => {
    if (mockContainer.parentNode) {
      document.body.removeChild(mockContainer);
    }
  });

  describe('构造函数', () => {
    test('应该创建preview实例', () => {
      expect(preview).toBeInstanceOf(DocxPreview);
      expect(preview.isLoaded).toBe(false);
      expect(preview.currentFile).toBeNull();
      expect(preview.container).toBeNull();
    });

    test('应该创建Parser和Renderer实例', () => {
      expect(preview.parser).toBeDefined();
      expect(preview.renderer).toBeDefined();
    });
  });

  describe('parse', () => {
    test('应该成功解析docx文件', async () => {
      const mockFile = new File([''], 'test.docx');
      const result = await preview.parse(mockFile);

      expect(result.html).toBe('<p>Test content</p>');
      expect(result.rawText).toBe('Test content');
      expect(preview.isLoaded).toBe(true);
      expect(preview.currentFile).toBe(mockFile);
    });

    test('应该处理解析错误', async () => {
      preview.parser.parse.mockRejectedValue(new Error('Parse error'));
      const mockFile = new File([''], 'test.docx');

      await expect(preview.parse(mockFile)).rejects.toThrow('Parse error');
      expect(preview.isLoaded).toBe(false);
    });

    test('应该传递选项到parser', async () => {
      const mockFile = new File([''], 'test.docx');
      const options = { styleMap: [] };

      await preview.parse(mockFile, options);

      expect(preview.parser.parse).toHaveBeenCalledWith(mockFile, options);
    });
  });

  describe('render', () => {
    test('应该成功渲染到容器', async () => {
      const mockFile = new File([''], 'test.docx');
      await preview.parse(mockFile);

      const result = preview.render(mockContainer);

      expect(preview.renderer.render).toHaveBeenCalledWith(
        '<p>Test content</p>',
        mockContainer,
        {}
      );
      expect(result.warnings).toHaveLength(1);
    });

    test('应该传递渲染选项', async () => {
      const mockFile = new File([''], 'test.docx');
      await preview.parse(mockFile);

      const options = { zoom: 1.5, width: '800px' };
      preview.render(mockContainer, options);

      expect(preview.renderer.render).toHaveBeenCalledWith(
        '<p>Test content</p>',
        mockContainer,
        options
      );
    });

    test('如果没有解析数据应该抛出错误', () => {
      expect(() => {
        preview.render(mockContainer);
      }).toThrow('No parsed data available. Call parse() first.');
    });
  });

  describe('rerender', () => {
    test('应该重新渲染内容', async () => {
      const mockFile = new File([''], 'test.docx');
      await preview.parse(mockFile);
      preview.render(mockContainer);

      preview.rerender();

      expect(preview.renderer.update).toHaveBeenCalledWith('<p>Test content</p>');
    });

    test('如果没有解析数据应该抛出错误', () => {
      expect(() => {
        preview.rerender();
      }).toThrow('No parsed data available. Call parse() first.');
    });
  });

  describe('setZoom', () => {
    test('应该设置缩放级别', () => {
      preview.setZoom(1.5);

      expect(preview.renderer.setZoom).toHaveBeenCalledWith(1.5);
    });
  });

  describe('getZoom', () => {
    test('应该返回当前缩放级别', () => {
      const zoom = preview.getZoom();

      expect(zoom).toBe(1.0);
      expect(preview.renderer.getZoom).toHaveBeenCalled();
    });
  });

  describe('getFileInfo', () => {
    test('应该返回文件信息', async () => {
      const mockFile = new File(['Test content'], 'test.docx');
      await preview.parse(mockFile);

      const info = preview.getFileInfo();

      expect(info.fileName).toBe('test.docx');
      expect(info.fileType).toBe('docx');
      expect(info.wordCount).toBe(2); // 'Test content' = 2 words
      expect(info.charCount).toBe(12);
    });

    test('如果没有文件应该返回null', () => {
      const info = preview.getFileInfo();

      expect(info).toBeNull();
    });

    test('应该计算字数', async () => {
      const mockFile = new File(['This is a test document'], 'test.docx');
      preview.parser.getParsedData.mockReturnValue({
        html: '<p>Test</p>',
        rawText: 'This is a test document',
        warnings: [],
        errors: []
      });
      await preview.parse(mockFile);

      const info = preview.getFileInfo();

      expect(info.wordCount).toBe(5);
    });

    test('应该处理空文本', async () => {
      const mockFile = new File([''], 'test.docx');
      preview.parser.getParsedData.mockReturnValue({
        html: '',
        rawText: '',
        warnings: [],
        errors: []
      });
      await preview.parse(mockFile);

      const info = preview.getFileInfo();

      expect(info.wordCount).toBe(0);
      expect(info.charCount).toBe(0);
    });
  });

  describe('getRawText', () => {
    test('应该返回原始文本', async () => {
      const mockFile = new File([''], 'test.docx');
      await preview.parse(mockFile);

      const text = preview.getRawText();

      expect(text).toBe('Test content');
    });

    test('如果没有解析应该返回空字符串', () => {
      const text = preview.getRawText();

      expect(text).toBe('');
    });
  });

  describe('getWarnings', () => {
    test('应该返回警告列表', async () => {
      const mockFile = new File([''], 'test.docx');
      await preview.parse(mockFile);

      const warnings = preview.getWarnings();

      expect(warnings).toHaveLength(1);
      expect(warnings[0].message).toBe('Test warning');
    });

    test('如果没有解析应该返回空数组', () => {
      const warnings = preview.getWarnings();

      expect(warnings).toEqual([]);
    });
  });

  describe('getErrors', () => {
    test('应该返回错误列表', async () => {
      const mockFile = new File([''], 'test.docx');
      preview.parser.getParsedData.mockReturnValue({
        html: '<p>Test</p>',
        rawText: 'Test',
        warnings: [],
        errors: [{ type: 'error', message: 'Test error' }]
      });
      await preview.parse(mockFile);

      const errors = preview.getErrors();

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('Test error');
    });

    test('如果没有解析应该返回空数组', () => {
      const errors = preview.getErrors();

      expect(errors).toEqual([]);
    });
  });

  describe('destroy', () => {
    test('应该清理所有资源', async () => {
      const mockFile = new File([''], 'test.docx');
      await preview.parse(mockFile);
      preview.render(mockContainer);

      preview.destroy();

      expect(preview.renderer.clear).toHaveBeenCalled();
      expect(preview.parser.clear).toHaveBeenCalled();
      expect(preview.isLoaded).toBe(false);
      expect(preview.container).toBeNull();
      expect(preview.currentFile).toBeNull();
    });
  });

  describe('工作流程集成测试', () => {
    test('完整的工作流程：解析 -> 渲染 -> 设置缩放 -> 销毁', async () => {
      const mockFile = new File([''], 'test.docx');

      // 解析
      await preview.parse(mockFile);
      expect(preview.isLoaded).toBe(true);

      // 渲染
      const result = preview.render(mockContainer, { zoom: 1.2 });
      expect(preview.renderer.render).toHaveBeenCalled();
      expect(result.warnings).toHaveLength(1);

      // 设置缩放
      preview.setZoom(1.5);
      expect(preview.renderer.setZoom).toHaveBeenCalledWith(1.5);

      // 获取文件信息
      const info = preview.getFileInfo();
      expect(info.fileName).toBe('test.docx');

      // 销毁
      preview.destroy();
      expect(preview.renderer.clear).toHaveBeenCalled();
    });
  });
});
