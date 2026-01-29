/**
 * DocxParser单元测试
 */
import DocxParser from '../DocxParser.js';

// 模拟mammoth.js库
global.mammoth = {
  convertToHtml: jest.fn(),
  extractRawText: jest.fn()
};

describe('DocxParser', () => {
  let parser;

  beforeEach(() => {
    parser = new DocxParser();
    jest.clearAllMocks();
  });

  describe('构造函数', () => {
    test('应该创建parser实例', () => {
      expect(parser).toBeInstanceOf(DocxParser);
      expect(parser.mammoth).toBeNull();
      expect(parser.isLoaded).toBe(false);
      expect(parser.parsedData).toBeNull();
    });
  });

  describe('loadLibrary', () => {
    test('应该成功加载mammoth.js库', async () => {
      // Mock fetch和eval
      global.fetch = jest.fn(() =>
        Promise.resolve({
          text: () => Promise.resolve('window.mammoth = {};')
        })
      );

      await parser.loadLibrary();

      expect(parser.isLoaded).toBe(true);
      expect(parser.mammoth).toBeDefined();
    });

    test('如果已加载，不应该重复加载', async () => {
      parser.isLoaded = true;
      parser.mammoth = {};

      await parser.loadLibrary();

      expect(parser.isLoaded).toBe(true);
      expect(fetch).not.toHaveBeenCalled();
    });

    test('应该处理加载失败', async () => {
      global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

      await expect(parser.loadLibrary()).rejects.toThrow('Failed to load mammoth.js library');
    });
  });

  describe('parse', () => {
    test('应该成功解析docx文件', async () => {
      parser.isLoaded = true;
      parser.mammoth = global.mammoth;

      const mockFile = new File([''], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      mockFile.arrayBuffer = jest.fn(() => Promise.resolve(new ArrayBuffer(100)));

      global.mammoth.convertToHtml.mockResolvedValue({
        value: '<p>Test content</p>',
        messages: []
      });

      global.mammoth.extractRawText.mockResolvedValue({
        value: 'Test content',
        messages: []
      });

      const result = await parser.parse(mockFile);

      expect(result).toBeDefined();
      expect(result.html).toBe('<p>Test content</p>');
      expect(result.rawText).toBe('Test content');
      expect(result.warnings).toEqual([]);
      expect(result.errors).toEqual([]);
      expect(parser.parsedData).toBe(result);
    });

    test('应该处理ArrayBuffer输入', async () => {
      parser.isLoaded = true;
      parser.mammoth = global.mammoth;

      const arrayBuffer = new ArrayBuffer(100);

      global.mammoth.convertToHtml.mockResolvedValue({
        value: '<p>Test</p>',
        messages: []
      });

      global.mammoth.extractRawText.mockResolvedValue({
        value: 'Test',
        messages: []
      });

      const result = await parser.parse(arrayBuffer);

      expect(result.html).toBe('<p>Test</p>');
    });

    test('应该处理Uint8Array输入', async () => {
      parser.isLoaded = true;
      parser.mammoth = global.mammoth;

      const uint8Array = new Uint8Array(100);

      global.mammoth.convertToHtml.mockResolvedValue({
        value: '<p>Test</p>',
        messages: []
      });

      global.mammoth.extractRawText.mockResolvedValue({
        value: 'Test',
        messages: []
      });

      const result = await parser.parse(uint8Array);

      expect(result.html).toBe('<p>Test</p>');
    });

    test('应该处理无效的文件类型', async () => {
      parser.isLoaded = true;

      await expect(parser.parse('invalid')).rejects.toThrow('Invalid file type');
    });

    test('应该处理解析错误', async () => {
      parser.isLoaded = true;
      parser.mammoth = global.mammoth;

      const mockFile = new File([''], 'test.docx');
      mockFile.arrayBuffer = jest.fn(() => Promise.resolve(new ArrayBuffer(100)));

      global.mammoth.convertToHtml.mockRejectedValue(new Error('Parse error'));

      await expect(parser.parse(mockFile)).rejects.toThrow('Failed to parse docx file');
    });

    test('应该过滤警告和错误消息', async () => {
      parser.isLoaded = true;
      parser.mammoth = global.mammoth;

      const mockFile = new File([''], 'test.docx');
      mockFile.arrayBuffer = jest.fn(() => Promise.resolve(new ArrayBuffer(100)));

      global.mammoth.convertToHtml.mockResolvedValue({
        value: '<p>Test</p>',
        messages: [
          { type: 'warning', message: 'Style not found' },
          { type: 'error', message: 'Image corrupted' },
          { type: 'info', message: 'Processed' }
        ]
      });

      global.mammoth.extractRawText.mockResolvedValue({
        value: 'Test',
        messages: []
      });

      const result = await parser.parse(mockFile);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toBe('Style not found');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Image corrupted');
    });
  });

  describe('getParsedData', () => {
    test('应该返回解析后的数据', () => {
      const mockData = { html: '<p>Test</p>' };
      parser.parsedData = mockData;

      expect(parser.getParsedData()).toBe(mockData);
    });

    test('如果未解析应该返回null', () => {
      expect(parser.getParsedData()).toBeNull();
    });
  });

  describe('clear', () => {
    test('应该清理解析数据', () => {
      parser.parsedData = { html: '<p>Test</p>' };
      parser.clear();

      expect(parser.parsedData).toBeNull();
    });
  });
});
