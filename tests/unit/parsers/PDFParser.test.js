/**
 * PDF解析器单元测试
 * 测试覆盖率目标：≥80%
 */

import { PDFParser } from '../../../src/parsers/document/PDFParser.js';
import { ParserError } from '../../../src/utils/PDFUtils.js';

describe('PDFParser', () => {
  let parser;

  beforeEach(() => {
    parser = new PDFParser();
  });

  describe('validate', () => {
    test('应该验证有效的PDF文件', () => {
      const pdfData = new TextEncoder().encode('%PDF-1.4').buffer;
      expect(parser.validate(pdfData)).toBe(true);
    });

    test('应该拒绝无效的PDF文件', () => {
      const pdfData = new TextEncoder().encode('NOT A PDF').buffer;
      expect(parser.validate(pdfData)).toBe(false);
    });

    test('应该拒绝空数据', () => {
      const pdfData = new ArrayBuffer(0);
      expect(parser.validate(pdfData)).toBe(false);
    });
  });

  describe('parse - 错误处理', () => {
    test('应该抛出错误处理无效PDF', async () => {
      const pdfData = new TextEncoder().encode('INVALID').buffer;
      await expect(parser.parse(pdfData)).rejects.toThrow(ParserError);
    });

    test('应该抛出ParserError处理加密PDF', async () => {
      const pdfData = createMinimalPDFWithEncrypt();
      await expect(parser.parse(pdfData)).rejects.toThrow('暂不支持加密PDF');
    });
  });

  describe('parse - 基本功能', () => {
    test('应该解析PDF并返回正确的格式', async () => {
      const pdfData = createMinimalPDF();
      const result = await parser.parse(pdfData);

      expect(result).toHaveProperty('type', 'pdf');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('pages');
      expect(result).toHaveProperty('metadata');
      expect(Array.isArray(result.pages)).toBe(true);
    });

    test('应该提取PDF版本号', async () => {
      const pdfData = createMinimalPDF('%PDF-1.4');
      const result = await parser.parse(pdfData);

      expect(result.version).toBe('1.4');
    });
  });

  describe('parse - 页面解析', () => {
    test('应该解析单页PDF', async () => {
      const pdfData = createMinimalPDF();
      const result = await parser.parse(pdfData);

      expect(result.pages).toHaveLength(1);
      expect(result.pages[0]).toHaveProperty('number');
      expect(result.pages[0]).toHaveProperty('width');
      expect(result.pages[0]).toHaveProperty('height');
      expect(result.pages[0]).toHaveProperty('elements');
    });

    test('应该解析多页PDF', async () => {
      const pdfData = createMultiPagePDF();
      const result = await parser.parse(pdfData);

      expect(result.pages.length).toBeGreaterThan(1);
      result.pages.forEach((page, index) => {
        expect(page).toHaveProperty('number');
        expect(page).toHaveProperty('width');
        expect(page).toHaveProperty('height');
        expect(page).toHaveProperty('elements');
      });
    });

    test('应该提取页面尺寸', async () => {
      const pdfData = createMinimalPDF();
      const result = await parser.parse(pdfData);

      const page = result.pages[0];
      expect(page.width).toBeGreaterThan(0);
      expect(page.height).toBeGreaterThan(0);
    });
  });

  describe('parse - 文本内容提取', () => {
    test('应该提取文本内容', async () => {
      const pdfData = createPDFWithText('Hello World');
      const result = await parser.parse(pdfData);

      const textElements = result.pages[0].elements.filter(e => e.type === 'text');
      expect(textElements.length).toBeGreaterThan(0);
    });

    test('应该处理转义字符', async () => {
      const pdfData = createPDFWithText('Hello\\nWorld');
      const result = await parser.parse(pdfData);

      const textElements = result.pages[0].elements.filter(e => e.type === 'text');
      expect(textElements.length).toBeGreaterThan(0);
    });

    test('应该处理空文本', async () => {
      const pdfData = createPDFWithText('');
      const result = await parser.parse(pdfData);

      expect(result.pages).toHaveLength(1);
    });
  });

  describe('parse - 图片内容提取', () => {
    test('应该提取图片元素', async () => {
      const pdfData = createPDFWithImage();
      const result = await parser.parse(pdfData);

      const imageElements = result.pages[0].elements.filter(e => e.type === 'image');
      expect(imageElements.length).toBeGreaterThan(0);
    });

    test('应该设置图片属性', async () => {
      const pdfData = createPDFWithImage();
      const result = await parser.parse(pdfData);

      const imageElements = result.pages[0].elements.filter(e => e.type === 'image');
      if (imageElements.length > 0) {
        expect(imageElements[0]).toHaveProperty('x');
        expect(imageElements[0]).toHaveProperty('y');
        expect(imageElements[0]).toHaveProperty('width');
        expect(imageElements[0]).toHaveProperty('height');
      }
    });
  });

  describe('parse - 元数据提取', () => {
    test('应该提取元数据', async () => {
      const pdfData = createPDFWithMetadata();
      const result = await parser.parse(pdfData);

      expect(result.metadata).toHaveProperty('pageCount');
      expect(result.metadata).toHaveProperty('title');
      expect(result.metadata).toHaveProperty('author');
    });

    test('应该处理缺失的元数据', async () => {
      const pdfData = createMinimalPDF();
      const result = await parser.parse(pdfData);

      expect(result.metadata).toHaveProperty('pageCount');
      expect(result.metadata).toHaveProperty('title');
      expect(result.metadata).toHaveProperty('author');
    });

    test('应该正确计算页数', async () => {
      const pdfData = createMultiPagePDF(3);
      const result = await parser.parse(pdfData);

      expect(result.metadata.pageCount).toBe(3);
    });
  });

  describe('getMetadata', () => {
    test('应该从PDF提取元数据', () => {
      const pdfData = createPDFWithMetadata();
      const metadata = parser.getMetadata(pdfData);

      expect(metadata).toHaveProperty('pageCount');
      expect(metadata).toHaveProperty('title');
      expect(metadata).toHaveProperty('author');
    });

    test('应该处理无效PDF并返回默认元数据', () => {
      const pdfData = new TextEncoder().encode('INVALID').buffer;
      const metadata = parser.getMetadata(pdfData);

      expect(metadata).toHaveProperty('pageCount', 0);
      expect(metadata).toHaveProperty('title', '');
      expect(metadata).toHaveProperty('author', '');
    });
  });
});

/**
 * 辅助函数：创建最小PDF文件
 */
function createMinimalPDF(version = '%PDF-1.4') {
  const pdf = `${version}
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
 * 辅助函数：创建包含加密标记的PDF
 */
function createMinimalPDFWithEncrypt() {
  const pdf = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
/Encrypt 5 0 R
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
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000076 00000 n 
0000000133 00000 n 
0000000220 00000 n 
0000000283 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
346
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
 * 辅助函数：创建包含图片的PDF
 */
function createPDFWithImage() {
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
/Length 20
>>
stream
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
0000000222 00000 n 
0000000257 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
346
%%EOF`;
  return new TextEncoder().encode(pdf).buffer;
}

/**
 * 辅助函数：创建多页PDF
 */
function createMultiPagePDF(pageCount = 2) {
  let pages = '';
  let kids = '';
  let objects = '';

  for (let i = 0; i < pageCount; i++) {
    const pageNum = i + 4;
    const contentNum = pageNum + pageCount;
    pages += `${pageNum} 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents ${contentNum} 0 R
>>
endobj
`;
    objects += `${contentNum} 0 obj
<<
/Length 20
>>
stream
BT
/F1 12 Tf
100 700 Td
(Page ${i + 1}) Tj
ET
endstream
endobj
`;
    kids += `${pageNum} 0 R `;
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
${pages}
${objects}
xref
0 ${pageCount * 2 + 3}
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
${pages.split('\n').filter(l => l.match(/^\d+ 0 obj$/)).map(l => {
  const offset = pdf.substring(0, pdf.indexOf(l)).split('\n').join('\n').length;
  return `${offset.toString().padStart(10, '0')} 00000 n `;
}).join('\n')}
trailer
<<
/Size ${pageCount * 2 + 3}
/Root 1 0 R
>>
startxref
${pdf.length}
%%EOF`;
  return new TextEncoder().encode(pdf).buffer;
}

/**
 * 辅助函数：创建包含元数据的PDF
 */
function createPDFWithMetadata() {
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
/Length 20
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
/Title (Test PDF)
/Author (Test Author)
/Subject (Test Subject)
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
330
%%EOF`;
  return new TextEncoder().encode(pdf).buffer;
}
