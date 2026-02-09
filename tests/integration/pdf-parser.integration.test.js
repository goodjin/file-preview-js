/**
 * PDF解析器集成测试
 * 测试完整的PDF解析流程
 */

import { PDFParser } from '../../src/parsers/document/PDFParser.js';
import { ParserError } from '../../src/utils/PDFUtils.js';

describe('PDFParser集成测试', () => {
  let parser;

  beforeEach(() => {
    parser = new PDFParser();
  });

  describe('完整PDF解析流程', () => {
    test('应该成功解析简单的单页PDF', async () => {
      const pdfData = createSimplePDF();
      const result = await parser.parse(pdfData);

      // 验证返回结构
      expect(result.type).toBe('pdf');
      expect(result.version).toBe('1.4');
      expect(Array.isArray(result.pages)).toBe(true);
      expect(result.pages.length).toBe(1);

      // 验证页面结构
      const page = result.pages[0];
      expect(page.number).toBe(0);
      expect(page.width).toBe(612);
      expect(page.height).toBe(792);
      expect(Array.isArray(page.elements)).toBe(true);

      // 验证元数据
      expect(result.metadata).toHaveProperty('pageCount', 1);
    });

    test('应该成功解析多页PDF', async () => {
      const pdfData = createMultiPagePDF(5);
      const result = await parser.parse(pdfData);

      expect(result.pages).toHaveLength(5);
      expect(result.metadata.pageCount).toBe(5);

      // 验证每一页都有正确的结构
      result.pages.forEach((page, index) => {
        expect(page).toHaveProperty('number');
        expect(page).toHaveProperty('width', 612);
        expect(page).toHaveProperty('height', 792);
        expect(page).toHaveProperty('elements');
      });
    });

    test('应该从PDF中提取文本内容', async () => {
      const testText = 'Hello World, this is a test PDF';
      const pdfData = createPDFWithText(testText);
      const result = await parser.parse(pdfData);

      const textElements = result.pages[0].elements.filter(e => e.type === 'text');
      expect(textElements.length).toBeGreaterThan(0);

      // 验证文本内容
      const combinedText = textElements.map(e => e.text).join(' ');
      expect(combinedText).toContain('Hello');
    });
  });

  describe('复杂PDF解析', () => {
    test('应该解析包含文本和图片的PDF', async () => {
      const pdfData = createPDFWithTextAndImage();
      const result = await parser.parse(pdfData);

      const page = result.pages[0];
      expect(page.elements.length).toBeGreaterThan(0);

      // 验证既有文本又有图片
      const hasText = page.elements.some(e => e.type === 'text');
      const hasImage = page.elements.some(e => e.type === 'image');
      expect(hasText).toBe(true);
      expect(hasImage).toBe(true);
    });

    test('应该解析包含元数据的PDF', async () => {
      const pdfData = createPDFWithFullMetadata();
      const result = await parser.parse(pdfData);

      expect(result.metadata).toHaveProperty('title', 'Integration Test PDF');
      expect(result.metadata).toHaveProperty('author', 'Test Author');
      expect(result.metadata).toHaveProperty('subject', 'Integration Testing');
      expect(result.metadata).toHaveProperty('keywords', 'PDF,Parser,Test');
    });

    test('应该正确计算页数', async () => {
      const testCases = [1, 3, 5, 10];

      for (const pageCount of testCases) {
        const pdfData = createMultiPagePDF(pageCount);
        const result = await parser.parse(pdfData);
        expect(result.metadata.pageCount).toBe(pageCount);
      }
    });
  });

  describe('错误处理集成测试', () => {
    test('应该拒绝无效的PDF文件', async () => {
      const pdfData = new TextEncoder().encode('This is not a PDF file').buffer;
      await expect(parser.parse(pdfData)).rejects.toThrow(ParserError);
      await expect(parser.parse(pdfData)).rejects.toThrow('无效的PDF文件');
    });

    test('应该拒绝空的PDF数据', async () => {
      const pdfData = new ArrayBuffer(0);
      await expect(parser.parse(pdfData)).rejects.toThrow(ParserError);
    });

    test('应该检测并拒绝加密PDF', async () => {
      const pdfData = createEncryptedPDF();
      await expect(parser.parse(pdfData)).rejects.toThrow('暂不支持加密PDF');
    });

    test('应该处理损坏的PDF数据', async () => {
      const pdfData = new TextEncoder().encode('%PDF-1.4\nCorrupted data\n%%EOF').buffer;
      await expect(parser.parse(pdfData)).rejects.toThrow();
    });
  });

  describe('边界情况测试', () => {
    test('应该处理空页面', async () => {
      const pdfData = createEmptyPagePDF();
      const result = await parser.parse(pdfData);

      expect(result.pages).toHaveLength(1);
      expect(result.pages[0].elements).toEqual([]);
    });

    test('应该处理超长文本', async () => {
      const longText = 'A'.repeat(10000);
      const pdfData = createPDFWithText(longText);
      const result = await parser.parse(pdfData);

      expect(result.pages).toHaveLength(1);
      const textElements = result.pages[0].elements.filter(e => e.type === 'text');
      expect(textElements.length).toBeGreaterThan(0);
    });

    test('应该处理特殊字符', async () => {
      const specialText = 'Test with special chars: é, ü, 中文, €, ©, ®';
      const pdfData = createPDFWithText(specialText);
      const result = await parser.parse(pdfData);

      expect(result.pages).toHaveLength(1);
      const textElements = result.pages[0].elements.filter(e => e.type === 'text');
      expect(textElements.length).toBeGreaterThan(0);
    });

    test('应该处理包含转义字符的文本', async () => {
      const escapedText = 'Line1\\nLine2\\tTabbed\\r\\(Parentheses\\)';
      const pdfData = createPDFWithText(escapedText);
      const result = await parser.parse(pdfData);

      expect(result.pages).toHaveLength(1);
      const textElements = result.pages[0].elements.filter(e => e.type === 'text');
      expect(textElements.length).toBeGreaterThan(0);
    });
  });

  describe('性能测试', () => {
    test('应该在合理时间内解析大型PDF', async () => {
      const pdfData = createLargePDF(100);

      const startTime = Date.now();
      const result = await parser.parse(pdfData);
      const endTime = Date.now();

      expect(result.pages).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(5000); // 应该在5秒内完成
    });
  });

  describe('元数据完整性测试', () => {
    test('应该提取完整的元数据', async () => {
      const pdfData = createPDFWithFullMetadata();
      const result = await parser.parse(pdfData);

      expect(result.metadata).toMatchObject({
        pageCount: expect.any(Number),
        title: expect.any(String),
        author: expect.any(String),
        subject: expect.any(String),
        keywords: expect.any(String),
        creator: expect.any(String),
        producer: expect.any(String),
        creationDate: expect.any(String),
        modDate: expect.any(String)
      });
    });

    test('应该处理缺失的元数据字段', async () => {
      const pdfData = createMinimalPDF();
      const result = await parser.parse(pdfData);

      expect(result.metadata).toHaveProperty('pageCount', 1);
      expect(result.metadata).toHaveProperty('title', '');
      expect(result.metadata).toHaveProperty('author', '');
    });

    test('getMetadata应该独立工作', () => {
      const pdfData = createPDFWithFullMetadata();
      const metadata = parser.getMetadata(pdfData);

      expect(metadata).toHaveProperty('pageCount');
      expect(metadata).toHaveProperty('title');
      expect(metadata).toHaveProperty('author');
    });
  });

  describe('页面元素完整性测试', () => {
    test('应该正确提取所有页面元素', async () => {
      const pdfData = createPDFWithMultipleElements();
      const result = await parser.parse(pdfData);

      const page = result.pages[0];
      expect(page.elements.length).toBeGreaterThan(0);

      // 验证每个元素都有必需的属性
      page.elements.forEach(element => {
        expect(element).toHaveProperty('type');
        if (element.type === 'text') {
          expect(element).toHaveProperty('text');
          expect(element).toHaveProperty('x');
          expect(element).toHaveProperty('y');
        } else if (element.type === 'image') {
          expect(element).toHaveProperty('x');
          expect(element).toHaveProperty('y');
          expect(element).toHaveProperty('width');
          expect(element).toHaveProperty('height');
        }
      });
    });

    test('应该正确设置页面尺寸', async () => {
      const pdfData = createPDFWithCustomPageSize(400, 600);
      const result = await parser.parse(pdfData);

      const page = result.pages[0];
      expect(page.width).toBe(400);
      expect(page.height).toBe(600);
    });
  });
});

/**
 * 辅助函数：创建简单的PDF
 */
function createSimplePDF() {
  const pdf = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Hello World) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000202 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
265
%%EOF`;
  return new TextEncoder().encode(pdf).buffer;
}

/**
 * 辅助函数：创建多页PDF
 */
function createMultiPagePDF(pageCount = 2) {
  let objects = '';
  let kids = '';
  let contentObjects = '';
  let offset = 0;

  // Catalog (1 0 obj)
  offset += 9;
  // Pages (2 0 obj)
  offset += 58;

  for (let i = 0; i < pageCount; i++) {
    const pageObjNum = 3 + i;
    const contentObjNum = 3 + pageCount + i;

    // Page object
    objects += `${pageObjNum} 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents ${contentObjNum} 0 R
>>
endobj
`;

    // Content object
    contentObjects += `${contentObjNum} 0 obj
<<
/Length 50
>>
stream
BT
/F1 12 Tf
100 ${700 - i * 10} Td
(Page ${i + 1} Content) Tj
ET
endstream
endobj
`;

    kids += `${pageObjNum} 0 R `;
  }

  const pdf = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [${kids}]
/Count ${pageCount}
>>
endobj
${objects}
${contentObjects}
xref
0 ${3 + pageCount * 2}
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
trailer
<<
/Size ${3 + pageCount * 2}
/Root 1 0 R
>>
startxref
${pdf.length}
%%EOF`;
  return new TextEncoder().encode(pdf).buffer;
}

/**
 * 辅助函数：创建包含文本的PDF
 */
function createPDFWithText(text) {
  const pdf = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length ${text.length + 20}
>>
stream
BT
/F1 12 Tf
100 700 Td
(${text}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000202 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
${text.length + 280}
%%EOF`;
  return new TextEncoder().encode(pdf).buffer;
}

/**
 * 辅助函数：创建包含文本和图片的PDF
 */
function createPDFWithTextAndImage() {
  const pdf = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources << /XObject << /Image1 5 0 R >> >>
>>
endobj
4 0 obj
<<
/Length 60
>>
stream
BT
/F1 12 Tf
100 700 Td
(Text Content) Tj
ET
/Image1 Do
endstream
endobj
5 0 obj
<<
/Type /XObject
/Subtype /Image
/Width 100
/Height 100
/BitsPerComponent 8
/ColorSpace /DeviceRGB
/Filter /DCTDecode
/Length 0
>>
stream
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000220 00000 n 
0000000297 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
390
%%EOF`;
  return new TextEncoder().encode(pdf).buffer;
}

/**
 * 辅助函数：创建包含完整元数据的PDF
 */
function createPDFWithFullMetadata() {
  const pdf = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test) Tj
ET
endstream
endobj
5 0 obj
<<
/Title (Integration Test PDF)
/Author (Test Author)
/Subject (Integration Testing)
/Keywords (PDF,Parser,Test)
/Creator (Test Creator)
/Producer (Test Producer)
/CreationDate (D:20240101000000Z)
/ModDate (D:20240101000000Z)
>>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000202 00000 n 
0000000267 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
/Info 5 0 R
>>
startxref
460
%%EOF`;
  return new TextEncoder().encode(pdf).buffer;
}

/**
 * 辅助函数：创建加密PDF
 */
function createEncryptedPDF() {
  const pdf = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
/Encrypt 6 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Encrypted) Tj
ET
endstream
endobj
6 0 obj
<<
/Filter /Standard
/V 1
/R 2
/P -60
/O -24
/U -24
/P -4
>>
endobj
xref
0 7
0000000000 65535 f 
0000000009 00000 n 
0000000076 00000 n 
0000000133 00000 n 
0000000220 00000 n 
0000000283 00000 n 
0000000297 00000 n 
trailer
<<
/Size 7
/Root 1 0 R
>>
startxref
380
%%EOF`;
  return new TextEncoder().encode(pdf).buffer;
}

/**
 * 辅助函数：创建空页面PDF
 */
function createEmptyPagePDF() {
  const pdf = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792
>>
endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer
<<
/Size 4
/Root 1 0 R
>>
startxref
180
%%EOF`;
  return new TextEncoder().encode(pdf).buffer;
}

/**
 * 辅助函数：创建大容量PDF
 */
function createLargePDF(pageCount = 100) {
  return createMultiPagePDF(pageCount);
}

/**
 * 辅助函数：创建包含多个元素的PDF
 */
function createPDFWithMultipleElements() {
  return createPDFWithTextAndImage();
}

/**
 * 辅助函数：创建自定义页面尺寸的PDF
 */
function createPDFWithCustomPageSize(width, height) {
  const pdf = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 ${width} ${height}]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000202 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
280
%%EOF`;
  return new TextEncoder().encode(pdf).buffer;
}

/**
 * 辅助函数：创建最小PDF
 */
function createMinimalPDF() {
  return createSimplePDF();
}
