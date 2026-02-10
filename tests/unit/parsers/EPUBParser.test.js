/**
 * EPUBParser单元测试
 * 测试EPUB解析器的核心功能
 */

import { EPUBParser } from '../../../src/parsers/document/EPUBParser.js';

// Mock ZIPParser
jest.mock('../../../src/utils/ZIPParser.js', () => {
  return jest.fn().mockImplementation(() => {
    return {
      parse: jest.fn().mockResolvedValue({
        format: 'ZIP',
        fileCount: 10,
        files: [
          { name: 'mimetype', size: 20 },
          { name: 'META-INF/container.xml', size: 200 },
          { name: 'OEBPS/content.opf', size: 1500 },
          { name: 'OEBPS/toc.ncx', size: 1000 },
          { name: 'OEBPS/chapter1.xhtml', size: 5000 },
          { name: 'OEBPS/chapter2.xhtml', size: 6000 },
          { name: 'OEBPS/images/cover.jpg', size: 50000 }
        ]
      }),
      validate: jest.fn().mockReturnValue(true),
      readFile: jest.fn().mockImplementation((filePath) => {
        // Mock不同文件的返回内容
        if (filePath === 'META-INF/container.xml') {
          return Promise.resolve(new TextEncoder().encode(
            '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'
          ));
        } else if (filePath === 'OEBPS/content.opf') {
          return Promise.resolve(new TextEncoder().encode(
            '<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="BookId"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf"><dc:title>测试电子书</dc:title><dc:creator>测试作者</dc:creator><dc:language>zh-CN</dc:language><dc:publisher>测试出版社</dc:publisher><dc:date>2024-01-01</dc:date><dc:identifier id="BookId">test-book-001</dc:identifier><dc:description>这是一本测试电子书</dc:description></metadata><manifest><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/><item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/><item id="chapter2" href="chapter2.xhtml" media-type="application/xhtml+xml"/><item id="cover" href="images/cover.jpg" media-type="image/jpeg"/></manifest><spine toc="ncx"><itemref idref="chapter1"/><itemref idref="chapter2"/></spine></package>'
          ));
        } else if (filePath === 'OEBPS/toc.ncx') {
          return Promise.resolve(new TextEncoder().encode(
            '<?xml version="1.0" encoding="utf-8"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><navMap><navPoint id="nav1" playOrder="1"><navLabel><text>第一章</text></navLabel><content src="chapter1.xhtml"/></navPoint><navPoint id="nav2" playOrder="2"><navLabel><text>第二章</text></navLabel><content src="chapter2.xhtml"/></navPoint></navMap></ncx>'
          ));
        } else if (filePath === 'OEBPS/chapter1.xhtml') {
          return Promise.resolve(new TextEncoder().encode(
            '<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>第一章</title></head><body><h1>第一章：测试内容</h1><p>这是第一章的内容。</p><p>这里有一些测试文本。</p></body></html>'
          ));
        } else if (filePath === 'OEBPS/chapter2.xhtml') {
          return Promise.resolve(new TextEncoder().encode(
            '<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>第二章</title></head><body><h1>第二章：更多内容</h1><p>这是第二章的内容。</p><p>继续测试文本。</p></body></html>'
          ));
        } else if (filePath === 'OEBPS/images/cover.jpg') {
          // Mock JPEG文件（简化版，实际应该是真实的图片数据）
          return Promise.resolve(new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]));
        }
        return Promise.resolve(new Uint8Array([]));
      }),
      getMetadata: jest.fn().mockReturnValue({
        fileCount: 10,
        format: 'ZIP',
        compressionMethods: ['none', 'deflate']
      })
    };
  });
});

describe('EPUBParser', () => {
  let parser;
  
  beforeEach(() => {
    parser = new EPUBParser();
  });

  describe('构造函数', () => {
    test('应该创建EPUBParser实例', () => {
      expect(parser).toBeInstanceOf(EPUBParser);
    });

    test('应该初始化所有属性为null', () => {
      expect(parser.zipParser).toBeNull();
      expect(parser.containerPath).toBeNull();
      expect(parser.opfPath).toBeNull();
      expect(parser.opfData).toBeNull();
      expect(parser.ncxPath).toBeNull();
    });
  });

  describe('validate', () => {
    test('应该验证有效的EPUB文件（ZIP格式）', () => {
      const validEPUB = new ArrayBuffer(100);
      const view = new Uint8Array(validEPUB);
      // ZIP文件的magic number: 0x04034b50
      view[0] = 0x50;
      view[1] = 0x4b;
      view[2] = 0x03;
      view[3] = 0x04;
      
      expect(parser.validate(validEPUB)).toBe(true);
    });

    test('应该拒绝无效的EPUB文件', () => {
      const invalidEPUB = new ArrayBuffer(100);
      const view = new Uint8Array(invalidEPUB);
      view[0] = 0x00;
      view[1] = 0x00;
      view[2] = 0x00;
      view[3] = 0x00;
      
      expect(parser.validate(invalidEPUB)).toBe(false);
    });

    test('应该拒绝空数据', () => {
      expect(parser.validate(null)).toBe(false);
      expect(parser.validate(undefined)).toBe(false);
      expect(parser.validate(new ArrayBuffer(0))).toBe(false);
    });

    test('应该拒绝过小的数据', () => {
      expect(parser.validate(new ArrayBuffer(3))).toBe(false);
    });
  });

  describe('parse', () => {
    let mockFileData;

    beforeEach(() => {
      // 创建模拟的EPUB文件数据
      mockFileData = new ArrayBuffer(1024);
      const view = new Uint8Array(mockFileData);
      // ZIP文件的magic number
      view[0] = 0x50;
      view[1] = 0x4b;
      view[2] = 0x03;
      view[3] = 0x04;
    });

    test('应该成功解析EPUB文件', async () => {
      const result = await parser.parse(mockFileData);
      
      expect(result.format).toBe('EPUB');
      expect(result.metadata).toBeDefined();
      expect(result.toc).toBeDefined();
      expect(result.chapters).toBeDefined();
      expect(result.images).toBeDefined();
      expect(result.fileCount).toBeGreaterThan(0);
    });

    test('应该正确解析元数据', async () => {
      const result = await parser.parse(mockFileData);
      
      expect(result.metadata.title).toBe('测试电子书');
      expect(result.metadata.author).toBe('测试作者');
      expect(result.metadata.language).toBe('zh-CN');
      expect(result.metadata.publisher).toBe('测试出版社');
      expect(result.metadata.publishDate).toBe('2024-01-01');
      expect(result.metadata.identifier).toBe('test-book-001');
      expect(result.metadata.description).toBe('这是一本测试电子书');
      expect(result.metadata.format).toBe('EPUB');
    });

    test('应该正确解析目录（TOC）', async () => {
      const result = await parser.parse(mockFileData);
      
      expect(result.toc).toHaveLength(2);
      expect(result.toc[0].title).toBe('第一章');
      expect(result.toc[0].src).toBe('chapter1.xhtml');
      expect(result.toc[1].title).toBe('第二章');
      expect(result.toc[1].src).toBe('chapter2.xhtml');
    });

    test('应该正确提取章节内容', async () => {
      const result = await parser.parse(mockFileData);
      
      expect(result.chapters).toHaveLength(2);
      expect(result.chapters[0].title).toBe('第一章');
      expect(result.chapters[0].filePath).toBe('OEBPS/chapter1.xhtml');
      expect(result.chapters[0].content).toContain('第一章');
      expect(result.chapters[0].content).toContain('测试内容');
      expect(result.chapters[1].title).toBe('第二章');
      expect(result.chapters[1].filePath).toBe('OEBPS/chapter2.xhtml');
      expect(result.chapters[1].content).toContain('第二章');
    });

    test('应该正确提取图片', async () => {
      const result = await parser.parse(mockFileData);
      
      expect(result.images).toHaveLength(1);
      expect(result.images[0].id).toBe('cover');
      expect(result.images[0].fileName).toBe('cover.jpg');
      expect(result.images[0].filePath).toBe('OEBPS/images/cover.jpg');
      expect(result.images[0].mediaType).toBe('image/jpeg');
      expect(result.images[0].data).toBeDefined();
      expect(result.images[0].size).toBeGreaterThan(0);
    });

    test('应该设置opfPath', async () => {
      await parser.parse(mockFileData);
      expect(parser.opfPath).toBe('OEBPS/content.opf');
    });

    test('应该设置ncxPath', async () => {
      await parser.parse(mockFileData);
      expect(parser.ncxPath).toBe('OEBPS/toc.ncx');
    });

    test('应该设置opfData', async () => {
      await parser.parse(mockFileData);
      expect(parser.opfData).toBeTruthy();
      expect(parser.opfData).toContain('测试电子书');
    });
  });

  describe('parseContainer', () => {
    test('应该正确解析container.xml并获取OPF路径', async () => {
      const mockFileData = new ArrayBuffer(1024);
      const view = new Uint8Array(mockFileData);
      view[0] = 0x50;
      view[1] = 0x4b;
      view[2] = 0x03;
      view[3] = 0x04;
      
      await parser.parse(mockFileData);
      
      expect(parser.containerPath).toBeNull(); // containerPath不存储
      expect(parser.opfPath).toBe('OEBPS/content.opf');
    });

    test('当container.xml无效时应该抛出错误', async () => {
      const mockFileData = new ArrayBuffer(1024);
      const view = new Uint8Array(mockFileData);
      view[0] = 0x50;
      view[1] = 0x4b;
      view[2] = 0x03;
      view[3] = 0x04;
      
      // Mock readFile返回无效的container.xml
      parser.zipParser.readFile.mockResolvedValueOnce(
        new TextEncoder().encode('<invalid>xml</invalid>')
      );
      
      await expect(parser.parse(mockFileData)).rejects.toThrow();
    });
  });

  describe('parseOPF', () => {
    test('应该正确解析OPF文件', async () => {
      const mockFileData = new ArrayBuffer(1024);
      const view = new Uint8Array(mockFileData);
      view[0] = 0x50;
      view[1] = 0x4b;
      view[2] = 0x03;
      view[3] = 0x04;
      
      await parser.parse(mockFileData);
      
      expect(parser.opfData).toBeTruthy();
      expect(parser.opfData).toContain('测试电子书');
      expect(parser.ncxPath).toBe('OEBPS/toc.ncx');
    });
  });

  describe('parseNCX', () => {
    test('应该正确解析NCX文件并返回目录结构', async () => {
      const mockFileData = new ArrayBuffer(1024);
      const view = new Uint8Array(mockFileData);
      view[0] = 0x50;
      view[1] = 0x4b;
      view[2] = 0x03;
      view[3] = 0x04;
      
      const result = await parser.parse(mockFileData);
      
      expect(result.toc).toHaveLength(2);
      expect(result.toc[0].title).toBe('第一章');
      expect(result.toc[0].src).toBe('chapter1.xhtml');
    });

    test('当NCX文件不存在时应该返回空数组', async () => {
      // Mock没有ncx的情况
      const mockFileData = new ArrayBuffer(1024);
      const view = new Uint8Array(mockFileData);
      view[0] = 0x50;
      view[1] = 0x4b;
      view[2] = 0x03;
      view[3] = 0x04;
      
      // Mock OPF不包含toc属性
      parser.zipParser.readFile.mockResolvedValueOnce(
        new TextEncoder().encode(
          '<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0"><manifest><item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="chapter1"/></spine></package>'
        )
      );
      
      const result = await parser.parse(mockFileData);
      
      expect(result.toc).toEqual([]);
    });
  });

  describe('extractChapters', () => {
    test('应该正确提取所有章节', async () => {
      const mockFileData = new ArrayBuffer(1024);
      const view = new Uint8Array(mockFileData);
      view[0] = 0x50;
      view[1] = 0x4b;
      view[2] = 0x03;
      view[3] = 0x04;
      
      const result = await parser.parse(mockFileData);
      
      expect(result.chapters).toHaveLength(2);
      expect(result.chapters[0].title).toBe('第一章');
      expect(result.chapters[0].content).toBeTruthy();
      expect(result.chapters[0].html).toBeTruthy();
      expect(result.chapters[1].title).toBe('第二章');
    });
  });

  describe('extractImages', () => {
    test('应该正确提取所有图片', async () => {
      const mockFileData = new ArrayBuffer(1024);
      const view = new Uint8Array(mockFileData);
      view[0] = 0x50;
      view[1] = 0x4b;
      view[2] = 0x03;
      view[3] = 0x04;
      
      const result = await parser.parse(mockFileData);
      
      expect(result.images).toHaveLength(1);
      expect(result.images[0].id).toBe('cover');
      expect(result.images[0].fileName).toBe('cover.jpg');
      expect(result.images[0].mediaType).toBe('image/jpeg');
      expect(result.images[0].data).toBeTruthy();
    });

    test('当没有图片时应该返回空数组', async () => {
      const mockFileData = new ArrayBuffer(1024);
      const view = new Uint8Array(mockFileData);
      view[0] = 0x50;
      view[1] = 0x4b;
      view[2] = 0x03;
      view[3] = 0x04;
      
      // Mock OPF不包含图片
      parser.zipParser.readFile.mockResolvedValueOnce(
        new TextEncoder().encode(
          '<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0"><manifest><item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="chapter1"/></spine></package>'
        )
      );
      
      const result = await parser.parse(mockFileData);
      
      expect(result.images).toHaveLength(0);
    });
  });

  describe('getMetadata', () => {
    test('应该返回完整的元数据', async () => {
      const mockFileData = new ArrayBuffer(1024);
      const view = new Uint8Array(mockFileData);
      view[0] = 0x50;
      view[1] = 0x4b;
      view[2] = 0x03;
      view[3] = 0x04;
      
      const result = await parser.parse(mockFileData);
      
      expect(result.metadata.title).toBe('测试电子书');
      expect(result.metadata.author).toBe('测试作者');
      expect(result.metadata.language).toBe('zh-CN');
      expect(result.metadata.publisher).toBe('测试出版社');
      expect(result.metadata.publishDate).toBe('2024-01-01');
      expect(result.metadata.identifier).toBe('test-book-001');
      expect(result.metadata.description).toBe('这是一本测试电子书');
      expect(result.metadata.format).toBe('EPUB');
    });

    test('当OPF未解析时应该返回空对象', () => {
      const metadata = parser.getMetadata();
      expect(metadata).toEqual({});
    });
  });

  describe('arrayBufferToBase64', () => {
    test('应该正确将ArrayBuffer转换为Base64字符串', () => {
      const buffer = new ArrayBuffer(4);
      const view = new Uint8Array(buffer);
      view[0] = 0x48; // 'H'
      view[1] = 0x65; // 'e'
      view[2] = 0x6C; // 'l'
      view[3] = 0x6C; // 'l'
      
      const base64 = parser.arrayBufferToBase64(buffer);
      expect(base64).toBe('SGVs'); // 'Hell'的Base64
    });

    test('应该正确处理空ArrayBuffer', () => {
      const buffer = new ArrayBuffer(0);
      const base64 = parser.arrayBufferToBase64(buffer);
      expect(base64).toBe('');
    });

    test('应该正确处理较大的ArrayBuffer', () => {
      const buffer = new ArrayBuffer(256);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < 256; i++) {
        view[i] = i;
      }
      
      const base64 = parser.arrayBufferToBase64(buffer);
      expect(base64).toBeTruthy();
      expect(base64.length).toBeGreaterThan(0);
    });
  });

  describe('parseSubNavPoints', () => {
    test('应该正确解析子导航点', async () => {
      // Mock包含子目录的NCX
      const mockFileData = new ArrayBuffer(1024);
      const view = new Uint8Array(mockFileData);
      view[0] = 0x50;
      view[1] = 0x4b;
      view[2] = 0x03;
      view[3] = 0x04;
      
      // 已经在前面测试过了，这里确保递归解析正常工作
      const result = await parser.parse(mockFileData);
      
      // 当前测试数据没有子目录，返回空数组
      expect(result.toc[0].children).toEqual([]);
    });
  });

  describe('错误处理', () => {
    test('当EPUB文件无效时应该抛出错误', async () => {
      const invalidFileData = new ArrayBuffer(1024);
      const view = new Uint8Array(invalidFileData);
      view[0] = 0x00;
      view[1] = 0x00;
      view[2] = 0x00;
      view[3] = 0x00;
      
      await expect(parser.parse(invalidFileData)).rejects.toThrow('Invalid EPUB file format');
    });

    test('当container.xml缺失rootfile时应该抛出错误', async () => {
      const mockFileData = new ArrayBuffer(1024);
      const view = new Uint8Array(mockFileData);
      view[0] = 0x50;
      view[1] = 0x4b;
      view[2] = 0x03;
      view[3] = 0x04;
      
      // Mock无效的container.xml
      parser.zipParser.readFile.mockResolvedValueOnce(
        new TextEncoder().encode('<?xml version="1.0"?><container><no-rootfile/></container>')
      );
      
      await expect(parser.parse(mockFileData)).rejects.toThrow('rootfile not found');
    });

    test('当container.xml缺失full-path属性时应该抛出错误', async () => {
      const mockFileData = new ArrayBuffer(1024);
      const view = new Uint8Array(mockFileData);
      view[0] = 0x50;
      view[1] = 0x4b;
      view[2] = 0x03;
      view[3] = 0x04;
      
      // Mock缺失full-path的container.xml
      parser.zipParser.readFile.mockResolvedValueOnce(
        new TextEncoder().encode('<?xml version="1.0"?><container><rootfile/></container>')
      );
      
      await expect(parser.parse(mockFileData)).rejects.toThrow('full-path attribute missing');
    });
  });

  describe('边界情况', () => {
    test('应该处理空目录的EPUB', async () => {
      const mockFileData = new ArrayBuffer(1024);
      const view = new Uint8Array(mockFileData);
      view[0] = 0x50;
      view[1] = 0x4b;
      view[2] = 0x03;
      view[3] = 0x04;
      
      // Mock无章节的OPF
      parser.zipParser.readFile.mockResolvedValueOnce(
        new TextEncoder().encode(
          '<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0"><metadata><dc:title>测试</dc:title></metadata><manifest></manifest><spine></spine></package>'
        )
      );
      
      const result = await parser.parse(mockFileData);
      
      expect(result.toc).toEqual([]);
      expect(result.chapters).toEqual([]);
    });

    test('应该处理没有图片的EPUB', async () => {
      const mockFileData = new ArrayBuffer(1024);
      const view = new Uint8Array(mockFileData);
      view[0] = 0x50;
      view[1] = 0x4b;
      view[2] = 0x03;
      view[3] = 0x04;
      
      // Mock无图片的OPF
      parser.zipParser.readFile.mockResolvedValueOnce(
        new TextEncoder().encode(
          '<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0"><metadata><dc:title>测试</dc:title></metadata><manifest><item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="chapter1"/></spine></package>'
        )
      );
      
      const result = await parser.parse(mockFileData);
      
      expect(result.images).toEqual([]);
    });
  });
});
