/**
 * Word解析器单元测试
 * 
 * @description 测试Word解析器的核心功能
 * @author 文件预览系统研发团队
 */

import WordParser from '../../src/parsers/WordParser.js';

// Mock ZIPParser
jest.mock('../../src/utils/ZIPParser.js');

describe('WordParser', () => {
  let parser;
  let mockFileData;

  beforeEach(() => {
    parser = new WordParser();
    mockFileData = new ArrayBuffer(1000);
  });

  describe('parse', () => {
    test('应该解析DOCX文件并返回内容', async () => {
      // Mock ZIPParser.parse返回值
      parser.zipParser.parse = jest.fn().mockResolvedValue({
        format: 'ZIP',
        fileCount: 5,
        files: [
          { name: 'word/document.xml', size: 1000 }
        ]
      });

      // Mock ZIPParser.readFile返回document.xml内容
      const mockDocumentXml = `
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
          <w:body>
            <w:p>
              <w:r>
                <w:t>测试文本</w:t>
              </w:r>
            </w:p>
          </w:body>
        </w:document>
      `;
      parser.zipParser.readFile = jest.fn().mockImplementation((path) => {
        if (path === 'word/document.xml') {
          return Promise.resolve(new TextEncoder().encode(mockDocumentXml));
        }
        return Promise.reject(new Error('File not found'));
      });

      const result = await parser.parse(mockFileData);

      expect(result.type).toBe('word');
      expect(result.format).toBe('DOCX');
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
    });

    test('应该处理没有内容的情况', async () => {
      parser.zipParser.parse = jest.fn().mockResolvedValue({
        format: 'ZIP',
        fileCount: 1,
        files: []
      });

      const mockDocumentXml = `
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
          <w:body>
            <w:p></w:p>
          </w:body>
        </w:document>
      `;
      parser.zipParser.readFile = jest.fn().mockResolvedValue(
        new TextEncoder().encode(mockDocumentXml)
      );

      const result = await parser.parse(mockFileData);

      expect(result.content).toEqual([]);
    });
  });

  describe('validate', () => {
    test('应该验证有效的DOCX文件', async () => {
      parser.zipParser.parse = jest.fn().mockResolvedValue({
        format: 'ZIP',
        fileCount: 5
      });

      const isValid = await parser.validate(mockFileData);

      expect(isValid).toBe(true);
    });

    test('应该拒绝无效的DOCX文件', async () => {
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
        new TextEncoder().encode('<w:document><w:body></w:body></w:document>')
      );

      parser.zipParser.getMetadata = jest.fn().mockReturnValue(mockMetadata);

      const metadata = await parser.getMetadata(mockFileData);

      expect(metadata).toEqual(mockMetadata);
    });
  });

  describe('parseParagraph', () => {
    test('应该解析包含文本的段落', () => {
      const mockParagraph = document.createElementNS(
        'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'w:p'
      );
      
      const mockRun = document.createElementNS(
        'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'w:r'
      );
      
      const mockText = document.createElementNS(
        'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'w:t'
      );
      mockText.textContent = '测试文本';
      mockRun.appendChild(mockText);
      mockParagraph.appendChild(mockRun);

      const result = parser.parseParagraph(mockParagraph);

      expect(result).not.toBeNull();
      expect(result.type).toBe('paragraph');
      expect(result.text).toBe('测试文本');
      expect(result.runs).toBeDefined();
    });

    test('应该返回null对于空段落', () => {
      const mockParagraph = document.createElementNS(
        'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'w:p'
      );

      const result = parser.parseParagraph(mockParagraph);

      expect(result).toBeNull();
    });
  });

  describe('parseRun', () => {
    test('应该解析包含文本的Run', () => {
      const mockRun = document.createElementNS(
        'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'w:r'
      );
      
      const mockText = document.createElementNS(
        'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'w:t'
      );
      mockText.textContent = '文本';
      mockRun.appendChild(mockText);

      const result = parser.parseRun(mockRun);

      expect(result).not.toBeNull();
      expect(result.text).toBe('文本');
      expect(result.styles).toBeDefined();
    });

    test('应该返回null对于空的Run', () => {
      const mockRun = document.createElementNS(
        'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'w:r'
      );

      const result = parser.parseRun(mockRun);

      expect(result).toBeNull();
    });
  });

  describe('parseRunStyles', () => {
    test('应该解析粗体样式', () => {
      const mockRun = document.createElementNS(
        'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'w:r'
      );
      
      const mockRPr = document.createElementNS(
        'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'w:rPr'
      );
      
      const mockBold = document.createElementNS(
        'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'w:b'
      );
      mockRPr.appendChild(mockBold);
      mockRun.appendChild(mockRPr);

      const styles = parser.parseRunStyles(mockRun);

      expect(styles.bold).toBe(true);
    });

    test('应该解析斜体样式', () => {
      const mockRun = document.createElementNS(
        'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'w:r'
      );
      
      const mockRPr = document.createElementNS(
        'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'w:rPr'
      );
      
      const mockItalic = document.createElementNS(
        'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'w:i'
      );
      mockRPr.appendChild(mockItalic);
      mockRun.appendChild(mockRPr);

      const styles = parser.parseRunStyles(mockRun);

      expect(styles.italic).toBe(true);
    });

    test('应该解析字体大小', () => {
      const mockRun = document.createElementNS(
        'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'w:r'
      );
      
      const mockRPr = document.createElementNS(
        'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'w:rPr'
      );
      
      const mockSz = document.createElementNS(
        'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'w:sz'
      );
      mockSz.setAttribute('w:val', '24'); // 12pt
      mockRPr.appendChild(mockSz);
      mockRun.appendChild(mockRPr);

      const styles = parser.parseRunStyles(mockRun);

      expect(styles.fontSize).toBe(12);
    });

    test('应该解析颜色', () => {
      const mockRun = document.createElementNS(
        'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'w:r'
      );
      
      const mockRPr = document.createElementNS(
        'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'w:rPr'
      );
      
      const mockColor = document.createElementNS(
        'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'w:color'
      );
      mockColor.setAttribute('w:val', 'FF0000');
      mockRPr.appendChild(mockColor);
      mockRun.appendChild(mockRPr);

      const styles = parser.parseRunStyles(mockRun);

      expect(styles.color).toBe('#FF0000');
    });
  });

  describe('parseColor', () => {
    test('应该将Word颜色转换为CSS颜色', () => {
      const result = parser.parseColor('FF0000');
      expect(result).toBe('#FF0000');
    });

    test('应该处理自动颜色', () => {
      const result = parser.parseColor('auto');
      expect(result).toBeNull();
    });

    test('应该处理null值', () => {
      const result = parser.parseColor(null);
      expect(result).toBeNull();
    });
  });

  describe('parseTable', () => {
    test('应该解析表格', () => {
      const mockTable = document.createElementNS(
        'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'w:tbl'
      );
      
      const mockRow = document.createElementNS(
        'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'w:tr'
      );
      
      const mockCell = document.createElementNS(
        'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'w:tc'
      );
      
      const mockParagraph = document.createElementNS(
        'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'w:p'
      );
      
      const mockRun = document.createElementNS(
        'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'w:r'
      );
      
      const mockText = document.createElementNS(
        'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'w:t'
      );
      mockText.textContent = '单元格文本';
      mockRun.appendChild(mockText);
      mockParagraph.appendChild(mockRun);
      mockCell.appendChild(mockParagraph);
      mockRow.appendChild(mockCell);
      mockTable.appendChild(mockRow);

      const result = parser.parseTable(mockTable);

      expect(result.type).toBe('table');
      expect(result.rows).toBeDefined();
      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].cells).toContain('单元格文本');
    });
  });

  describe('getMimeTypeFromTarget', () => {
    test('应该返回PNG的MIME类型', () => {
      const result = parser.getMimeTypeFromTarget('media/image1.png');
      expect(result).toBe('image/png');
    });

    test('应该返回JPEG的MIME类型', () => {
      const result = parser.getMimeTypeFromTarget('media/image1.jpg');
      expect(result).toBe('image/jpeg');
    });

    test('应该返回GIF的MIME类型', () => {
      const result = parser.getMimeTypeFromTarget('media/image1.gif');
      expect(result).toBe('image/gif');
    });

    test('对于未知扩展名应该返回PNG', () => {
      const result = parser.getMimeTypeFromTarget('media/image1.xyz');
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

  describe('extractImages', () => {
    test('应该提取嵌入图片', async () => {
      // Mock关系文件
      const mockRels = `
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
          <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>
        </Relationships>
      `;

      parser.zipParser.readFile = jest.fn().mockImplementation((path) => {
        if (path === 'word/_rels/document.xml.rels') {
          return Promise.resolve(new TextEncoder().encode(mockRels));
        }
        if (path === 'media/image1.png') {
          return Promise.resolve(new Uint8Array([137, 80, 78, 71]));
        }
        return Promise.reject(new Error('File not found'));
      });

      const images = await parser.extractImages();

      expect(images).toBeDefined();
      expect(images.length).toBeGreaterThan(0);
      expect(images[0].mimeType).toBe('image/png');
    });

    test('应该优雅处理没有图片的情况', async () => {
      parser.zipParser.readFile = jest.fn().mockRejectedValue(
        new Error('File not found')
      );

      const images = await parser.extractImages();

      expect(images).toEqual([]);
    });
  });
});
