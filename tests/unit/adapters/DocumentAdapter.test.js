/**
 * DocumentAdapter 单元测试
 */

import DocumentAdapter from '../../../src/adapters/DocumentAdapter.js';

describe('DocumentAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new DocumentAdapter();
  });

  describe('canHandle', () => {
    test('should support pdf files', () => {
      expect(adapter.canHandle('pdf')).toBe(true);
      expect(adapter.canHandle('PDF')).toBe(true);
    });

    test('should support txt files', () => {
      expect(adapter.canHandle('txt')).toBe(true);
    });

    test('should support md files', () => {
      expect(adapter.canHandle('md')).toBe(true);
    });

    test('should support json files', () => {
      expect(adapter.canHandle('json')).toBe(true);
    });

    test('should support xml files', () => {
      expect(adapter.canHandle('xml')).toBe(true);
    });

    test('should support ofd files', () => {
      expect(adapter.canHandle('ofd')).toBe(true);
    });

    test('should support rtf files', () => {
      expect(adapter.canHandle('rtf')).toBe(true);
    });

    test('should support epub files', () => {
      expect(adapter.canHandle('epub')).toBe(true);
    });

    test('should not support image files', () => {
      expect(adapter.canHandle('jpg')).toBe(false);
      expect(adapter.canHandle('png')).toBe(false);
    });

    test('should not support office files', () => {
      expect(adapter.canHandle('docx')).toBe(false);
      expect(adapter.canHandle('xlsx')).toBe(false);
    });
  });

  describe('getSupportedTypes', () => {
    test('should return all supported types', () => {
      const types = adapter.getSupportedTypes();
      expect(types).toEqual(expect.arrayContaining([
        'pdf', 'txt', 'md', 'json', 'xml', 'ofd', 'rtf', 'epub'
      ]));
      expect(types.length).toBe(8);
    });
  });

  describe('validateFile', () => {
    test('should validate valid file object', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      expect(() => adapter.validateFile(file)).not.toThrow();
    });

    test('should throw error for null file', () => {
      expect(() => adapter.validateFile(null)).toThrow('File is required');
    });

    test('should throw error for invalid file object', () => {
      expect(() => adapter.validateFile({})).toThrow('Invalid file object');
    });
  });

  describe('getFileExtension', () => {
    test('should extract file extension correctly', () => {
      expect(adapter.getFileExtension('document.pdf')).toBe('pdf');
      expect(adapter.getFileExtension('data.json')).toBe('json');
      expect(adapter.getFileExtension('notes.md')).toBe('md');
    });

    test('should handle uppercase extensions', () => {
      expect(adapter.getFileExtension('DOCUMENT.PDF')).toBe('pdf');
      expect(adapter.getFileExtension('Data.JSON')).toBe('json');
    });

    test('should handle files without extension', () => {
      expect(adapter.getFileExtension('Makefile')).toBe('');
    });
  });

  describe('parse', () => {
    test('should parse txt file', async () => {
      const content = 'Hello, World!';
      const file = new File([content], 'test.txt', { type: 'text/plain' });

      const result = await adapter.parse(file);

      expect(result.fileType).toBe('txt');
      expect(result.fileName).toBe('test.txt');
      expect(result.content).toBe(content);
      expect(result.fileSize).toBe(content.length);
    });

    test('should parse md file', async () => {
      const content = '# Title\n\nHello, World!';
      const file = new File([content], 'test.md', { type: 'text/markdown' });

      const result = await adapter.parse(file);

      expect(result.fileType).toBe('md');
      expect(result.content).toBe(content);
    });

    test('should parse json file', async () => {
      const content = '{"key": "value"}';
      const file = new File([content], 'test.json', { type: 'application/json' });

      const result = await adapter.parse(file);

      expect(result.fileType).toBe('json');
      expect(result.content).toEqual({ key: 'value' });
    });

    test('should parse xml file', async () => {
      const content = '<root><item>value</item></root>';
      const file = new File([content], 'test.xml', { type: 'text/xml' });

      const result = await adapter.parse(file);

      expect(result.fileType).toBe('xml');
      expect(result.content).toBe(content);
    });

    test('should parse pdf file', async () => {
      const content = new ArrayBuffer(1024);
      const file = new File([content], 'test.pdf', { type: 'application/pdf' });

      const result = await adapter.parse(file);

      expect(result.fileType).toBe('pdf');
      expect(result.data).toBeInstanceOf(ArrayBuffer);
    });

    test('should throw error for unsupported file type', async () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      await expect(adapter.parse(file)).rejects.toThrow('Unsupported file type');
    });

    test('should throw error for invalid json', async () => {
      const content = '{invalid json}';
      const file = new File([content], 'test.json', { type: 'application/json' });

      await expect(adapter.parse(file)).rejects.toThrow('Invalid JSON file');
    });
  });

  describe('render', () => {
    test('should render txt content', () => {
      const data = {
        fileType: 'txt',
        content: 'Hello, World!'
      };

      const result = adapter.render(data);

      expect(result.tagName).toBe('DIV');
      expect(result.className).toBe('document-preview');
      expect(result.innerHTML).toContain('Hello, World!');
    });

    test('should render md content', () => {
      const data = {
        fileType: 'md',
        content: '# Title\n\nHello'
      };

      const result = adapter.render(data);

      expect(result.innerHTML).toContain('<h1>Title</h1>');
      expect(result.innerHTML).toContain('Hello');
    });

    test('should render json content', () => {
      const data = {
        fileType: 'json',
        content: { key: 'value' }
      };

      const result = adapter.render(data);

      expect(result.innerHTML).toContain('key');
      expect(result.innerHTML).toContain('value');
    });

    test('should render xml content', () => {
      const data = {
        fileType: 'xml',
        content: '<root>value</root>'
      };

      const result = adapter.render(data);

      expect(result.innerHTML).toContain('&lt;root&gt;value&lt;/root&gt;');
    });

    test('should render binary file placeholder', () => {
      const data = {
        fileType: 'pdf'
      };

      const result = adapter.render(data);

      expect(result.innerHTML).toContain('PDF file');
      expect(result.innerHTML).toContain('specialized previewer');
    });

    test('should escape HTML in txt content', () => {
      const data = {
        fileType: 'txt',
        content: '<script>alert("xss")</script>'
      };

      const result = adapter.render(data);

      expect(result.innerHTML).not.toContain('<script>');
      expect(result.innerHTML).toContain('&lt;script&gt;');
    });
  });

  describe('render Markdown', () => {
    test('should render h1', () => {
      const data = {
        fileType: 'md',
        content: '# Title 1'
      };

      const result = adapter.render(data);
      expect(result.innerHTML).toContain('<h1>Title 1</h1>');
    });

    test('should render h2', () => {
      const data = {
        fileType: 'md',
        content: '## Title 2'
      };

      const result = adapter.render(data);
      expect(result.innerHTML).toContain('<h2>Title 2</h2>');
    });

    test('should render h3', () => {
      const data = {
        fileType: 'md',
        content: '### Title 3'
      };

      const result = adapter.render(data);
      expect(result.innerHTML).toContain('<h3>Title 3</h3>');
    });

    test('should render bold', () => {
      const data = {
        fileType: 'md',
        content: '**bold**'
      };

      const result = adapter.render(data);
      expect(result.innerHTML).toContain('<strong>bold</strong>');
    });

    test('should render italic', () => {
      const data = {
        fileType: 'md',
        content: '*italic*'
      };

      const result = adapter.render(data);
      expect(result.innerHTML).toContain('<em>italic</em>');
    });

    test('should render code', () => {
      const data = {
        fileType: 'md',
        content: '`code`'
      };

      const result = adapter.render(data);
      expect(result.innerHTML).toContain('<code>code</code>');
    });
  });
});
