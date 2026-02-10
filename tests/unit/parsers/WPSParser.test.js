/**
 * WPS解析器单元测试
 * 
 * @description 测试WPS解析器的核心功能
 * @author 文件预览系统研发团队
 */

import WPSParser from '../../src/parsers/WPSParser.js';

// Mock ZIPParser
jest.mock('../../src/utils/ZIPParser.js');

describe('WPSParser', () => {
  let parser;
  let mockFileData;

  beforeEach(() => {
    parser = new WPSParser();
    mockFileData = new ArrayBuffer(1000);
  });

  describe('parse', () => {
    test('应该解析WPS文件并返回内容', async () => {
      // Mock ZIPParser.parse返回值
      parser.zipParser.parse = jest.fn().mockResolvedValue({
        format: 'ZIP',
        fileCount: 5,
        files: [
          { name: 'document.xml', size: 1000 }
        ]
      });

      // Mock ZIPParser.readFile返回document.xml内容
      const mockDocumentXml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <document xmlns:w="http://www.wps.cn/office/word">
          <body>
            <p>
              <t>测试文本</t>
            </p>
          </body>
        </document>
      `;
      parser.zipParser.readFile = jest.fn().mockImplementation((path) => {
        if (path === 'document.xml') {
          return Promise.resolve(new TextEncoder().encode(mockDocumentXml));
        }
        return Promise.reject(new Error('File not found'));
      });

      const result = await parser.parse(mockFileData);

      expect(result.type).toBe('wps');
      expect(result.format).toBe('WPS');
      expect(result.content).toBeDefined();
    });

    test('应该处理没有内容的情况', async () => {
      parser.zipParser.parse = jest.fn().mockResolvedValue({
        format: 'ZIP',
        fileCount: 1,
        files: []
      });

      const mockDocumentXml = `
        <?xml version="1.0"?>
        <document><body><p></p></body></document>
      `;
      parser.zipParser.readFile = jest.fn().mockResolvedValue(
        new TextEncoder().encode(mockDocumentXml)
      );

      const result = await parser.parse(mockFileData);

      expect(result.content).toBeDefined();
    });
  });

  describe('validate', () => {
    test('应该验证有效的WPS文件', async () => {
      parser.zipParser.parse = jest.fn().mockResolvedValue({
        format: 'ZIP',
        fileCount: 5
      });

      const isValid = await parser.validate(mockFileData);

      expect(isValid).toBe(true);
    });

    test('应该拒绝无效的WPS文件', async () => {
      parser.zipParser.parse = jest.fn().mockRejectedValue(
        new Error('Invalid ZIP file')
      );

      const isValid = await parser.validate(mockFileData);

      expect(isValid).toBe(false);
    });
  });

  describe('getMetadata', () => {
    test('应该返回元数据', async () => {
      const mockMetadata = {
        fileCount: 5,
        format: 'ZIP',
        compressionMethods: ['none', 'deflate']
      };

      parser.zipParser.parse = jest.fn().mockResolvedValue({
        format: 'ZIP',
        fileCount: 5,
        files: []
      });

      parser.zipParser.readFile = jest.fn().mockResolvedValue(
        new TextEncoder().encode('<document><body><p><t>文本</t></p></body></document>')
      );

      parser.zipParser.getMetadata = jest.fn().mockReturnValue(mockMetadata);

      const metadata = await parser.getMetadata(mockFileData);

      expect(metadata).toEqual(mockMetadata);
    });
  });

  describe('parseParagraph', () => {
    test('应该解析包含文本的段落', () => {
      const mockParagraph = document.createElement('p');
      
      const mockText = document.createElement('t');
      mockText.textContent = '测试文本';
      mockParagraph.appendChild(mockText);

      const result = parser.parseParagraph(mockParagraph);

      expect(result).not.toBeNull();
      expect(result.type).toBe('paragraph');
      expect(result.text).toBe('测试文本');
    });

    test('应该返回null对于空段落', () => {
      const mockParagraph = document.createElement('p');

      const result = parser.parseParagraph(mockParagraph);

      expect(result).toBeNull();
    });
  });

  describe('extractTextFromElement', () => {
    test('应该提取元素中的文本', () => {
      const mockElement = document.createElement('p');
      
      const mockText = document.createElement('t');
      mockText.textContent = '文本内容';
      mockElement.appendChild(mockText);

      const result = parser.extractTextFromElement(mockElement);

      expect(result).toEqual(['文本内容']);
    });

    test('应该处理多个t元素', () => {
      const mockElement = document.createElement('p');
      
      const mockText1 = document.createElement('t');
      mockText1.textContent = '文本1';
      mockElement.appendChild(mockText1);
      
      const mockText2 = document.createElement('t');
      mockText2.textContent = '文本2';
      mockElement.appendChild(mockText2);

      const result = parser.extractTextFromElement(mockElement);

      expect(result).toEqual(['文本1', '文本2']);
    });

    test('应该直接获取文本内容当没有t元素时', () => {
      const mockElement = document.createElement('p');
      mockElement.textContent = '直接文本';

      const result = parser.extractTextFromElement(mockElement);

      expect(result).toEqual(['直接文本']);
    });
  });

  describe('parseTable', () => {
    test('应该解析表格', () => {
      const mockTable = document.createElement('table');
      
      const mockRow = document.createElement('row');
      
      const mockCell = document.createElement('cell');
      const mockCellText = document.createElement('t');
      mockCellText.textContent = '单元格文本';
      mockCell.appendChild(mockCellText);
      mockRow.appendChild(mockCell);
      mockTable.appendChild(mockRow);

      const result = parser.parseTable(mockTable);

      expect(result).not.toBeNull();
      expect(result.type).toBe('table');
      expect(result.rows).toBeDefined();
      expect(result.rows[0].cells).toContain('单元格文本');
    });

    test('应该返回null对于空表格', () => {
      const mockTable = document.createElement('table');

      const result = parser.parseTable(mockTable);

      expect(result).toBeNull();
    });
  });

  describe('parseParagraphStyles', () => {
    test('应该解析对齐方式', () => {
      const mockParagraph = document.createElement('p');
      mockParagraph.setAttribute('align', 'center');

      const styles = parser.parseParagraphStyles(mockParagraph);

      expect(styles.align).toBe('center');
    });

    test('应该处理不同的对齐属性名', () => {
      const mockParagraph = document.createElement('p');
      mockParagraph.setAttribute('w:jc', 'right');

      const styles = parser.parseParagraphStyles(mockParagraph);

      expect(styles.align).toBe('right');
    });
  });

  describe('parseStyles', () => {
    test('应该解析样式文件', async () => {
      const mockStylesXml = `
        <?xml version="1.0"?>
        <styles>
          <style id="Normal" font-size="12" font-family="Arial"/>
          <style id="Heading1" font-size="18" font-weight="bold"/>
        </styles>
      `;
      parser.zipParser.readFile = jest.fn().mockImplementation((path) => {
        if (path === 'styles.xml') {
          return Promise.resolve(new TextEncoder().encode(mockStylesXml));
        }
        return Promise.reject(new Error('File not found'));
      });

      const styles = await parser.parseStyles();

      expect(styles).toBeDefined();
      expect(styles.Normal).toBeDefined();
      expect(styles.Normal.name).toBe('Normal');
    });

    test('应该优雅处理样式文件不存在', async () => {
      parser.zipParser.readFile = jest.fn().mockRejectedValue(
        new Error('File not found')
      );

      const styles = await parser.parseStyles();

      expect(styles).toEqual({});
    });
  });

  describe('extractImages', () => {
    test('应该提取图片', async () => {
      parser.zipParser.parse = jest.fn().mockResolvedValue({
        files: [
          { name: 'image1.png', size: 1000 },
          { name: 'document.xml', size: 2000 }
        ]
      });

      parser.zipParser.readFile = jest.fn().mockImplementation((path) => {
        if (path === 'image1.png') {
          return Promise.resolve(new Uint8Array([137, 80, 78, 71]));
        }
        return Promise.reject(new Error('File not found'));
      });

      const images = await parser.extractImages();

      expect(images).toBeDefined();
      expect(images.length).toBeGreaterThan(0);
      expect(images[0].mimeType).toBe('image/png');
    });

    test('应该过滤非图片文件', async () => {
      parser.zipParser.parse = jest.fn().mockResolvedValue({
        files: [
          { name: 'document.xml', size: 2000 },
          { name: 'styles.xml', size: 1000 }
        ]
      });

      const images = await parser.extractImages();

      expect(images).toEqual([]);
    });
  });

  describe('isImageFile', () => {
    test('应该识别PNG文件', () => {
      expect(parser.isImageFile('image.png')).toBe(true);
      expect(parser.isImageFile('image.PNG')).toBe(true);
    });

    test('应该识别JPEG文件', () => {
      expect(parser.isImageFile('image.jpg')).toBe(true);
      expect(parser.isImageFile('image.jpeg')).toBe(true);
    });

    test('应该识别GIF文件', () => {
      expect(parser.isImageFile('image.gif')).toBe(true);
    });

    test('应该拒绝非图片文件', () => {
      expect(parser.isImageFile('document.xml')).toBe(false);
      expect(parser.isImageFile('styles.css')).toBe(false);
    });
  });

  describe('getMimeTypeFromFileName', () => {
    test('应该返回PNG的MIME类型', () => {
      const result = parser.getMimeTypeFromFileName('image.png');
      expect(result).toBe('image/png');
    });

    test('应该返回JPEG的MIME类型', () => {
      const result = parser.getMimeTypeFromFileName('image.jpg');
      expect(result).toBe('image/jpeg');
    });

    test('应该返回GIF的MIME类型', () => {
      const result = parser.getMimeTypeFromFileName('image.gif');
      expect(result).toBe('image/gif');
    });

    test('对于未知扩展名应该返回PNG', () => {
      const result = parser.getMimeTypeFromFileName('image.xyz');
      expect(result).toBe('image/png');
    });
  });

  describe('arrayBufferToBase64', () => {
    test('应该将ArrayBuffer转换为Base64', () => {
      const buffer = new ArrayBuffer(3);
      const view = new Uint8Array(buffer);
      view[0] = 72;  // 'H'
      view[1] = 101; // 'e'
      view[2] = 108; // 'l'

      const result = parser.arrayBufferToBase64(buffer);
      expect(result).toBe('SGVs');
    });
  });

  describe('extractStyleAttributes', () => {
    test('应该提取样式属性', () => {
      const mockStyle = document.createElement('style');
      mockStyle.setAttribute('font-size', '12');
      mockStyle.setAttribute('font-family', 'Arial');
      mockStyle.setAttribute('font-weight', 'bold');

      const attributes = parser.extractStyleAttributes(mockStyle);

      expect(attributes['font-size']).toBe('12');
      expect(attributes['font-family']).toBe('Arial');
      expect(attributes['font-weight']).toBe('bold');
    });

    test('应该处理没有属性的样式', () => {
      const mockStyle = document.createElement('style');

      const attributes = parser.extractStyleAttributes(mockStyle);

      expect(Object.keys(attributes).length).toBe(0);
    });
  });
});
