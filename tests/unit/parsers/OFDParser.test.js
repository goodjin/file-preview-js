/**
 * OFDParser单元测试
 * 测试OFD解析器的各项功能
 * 
 * @description 测试覆盖率目标: ≥80%
 * @author 文件预览系统研发团队
 */

import { OFDParser } from '../../../src/parsers/document/OFDParser.js';

describe('OFDParser', () => {
  let parser;

  beforeEach(() => {
    parser = new OFDParser();
  });

  describe('构造函数', () => {
    test('应该成功创建OFDParser实例', () => {
      expect(parser).toBeInstanceOf(OFDParser);
      expect(parser.zipParser).toBeDefined();
      expect(parser.ofdData).toBeNull();
    });
  });

  describe('validate', () => {
    test('无效数据应该返回false', () => {
      expect(parser.validate(null)).toBe(false);
      expect(parser.validate(undefined)).toBe(false);
      expect(parser.validate(new ArrayBuffer(0))).toBe(false);
    });

    test('有效的ZIP格式应该返回true', async () => {
      // 构造一个简单的ZIP文件(最小有效ZIP)
      const zipData = new Uint8Array([
        0x50, 0x4b, 0x03, 0x04, // Local file header signature
        0x14, 0x00, 0x00, 0x00, // Version
        0x08, 0x00, // Compression method (deflate)
        0x00, 0x00, 0x00, 0x00, // CRC
        0x00, 0x00, 0x00, 0x00, // Compressed size
        0x00, 0x00, 0x00, 0x00, // Uncompressed size
        0x00, 0x00, 0x00, 0x00, // File name length
        0x00, 0x00, // Extra field length
        // End of central directory
        0x50, 0x4b, 0x05, 0x06,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00
      ]);

      const result = parser.validate(zipData.buffer);
      expect(result).toBe(true);
    });

    test('非ZIP格式应该返回false', () => {
      const invalidData = new ArrayBuffer(4);
      const view = new DataView(invalidData);
      view.setUint32(0, 0x00000000); // 无效签名

      expect(parser.validate(invalidData)).toBe(false);
    });
  });

  describe('parseOFDXml', () => {
    test('应该解析有效的OFD.xml', async () => {
      const mockZipContent = `
        <?xml version="1.0" encoding="UTF-8"?>
        <ofd:OFD xmlns:ofd="http://www.ofdspec.org/2016" DocType="OFD" Version="1.0">
          <ofd:DocBody>
            <ofd:DocInfo>
              <ofd:DocID>test-doc-id</ofd:DocID>
            </ofd:DocInfo>
            <ofd:Documents>
              <ofd:Document BaseLoc="Doc_0/">
                <ofd:CommonData>
                  <ofd:Title>测试文档</ofd:Title>
                  <ofd:Creator>测试作者</ofd:Creator>
                </ofd:CommonData>
              </ofd:Document>
            </ofd:Documents>
          </ofd:DocBody>
        </ofd:OFD>
      `;

      // Mock ZIPParser的readFile方法
      parser.zipParser.readFile = jest.fn().mockResolvedValue(
        new TextEncoder().encode(mockZipContent)
      );

      const result = await parser.parseOFDXml();
      expect(result).toBeDefined();
      expect(result['ofd:OFD']).toBeDefined();
    });
  });

  describe('parseDocumentXml', () => {
    test('应该解析Document.xml', async () => {
      const mockDocumentContent = `
        <?xml version="1.0" encoding="UTF-8"?>
        <ofd:Document xmlns:ofd="http://www.ofdspec.org/2016">
          <ofd:CommonData>
            <ofd:Title>测试文档</ofd:Title>
            <ofd:Creator>测试作者</ofd:Creator>
            <ofd:Subject>测试主题</ofd:Subject>
            <ofd:Keywords>测试关键字</ofd:Keywords>
            <ofd:CreationDate>2024-01-01T00:00:00</ofd:CreationDate>
            <ofd:ModDate>2024-01-01T00:00:00</ofd:ModDate>
          </ofd:CommonData>
          <ofd:Pages>
            <ofd:Page BaseLoc="Pages/Page_0/Content.xml" ID="1"/>
            <ofd:Page BaseLoc="Pages/Page_1/Content.xml" ID="2"/>
          </ofd:Pages>
        </ofd:Document>
      `;

      parser.zipParser.readFile = jest.fn().mockResolvedValue(
        new TextEncoder().encode(mockDocumentContent)
      );

      const result = await parser.parseDocumentXml();
      expect(result).toBeDefined();
      expect(result['ofd:Document']).toBeDefined();
    });

    test('Document.xml不存在时应该返回默认值', async () => {
      parser.zipParser.readFile = jest.fn().mockRejectedValue(
        new Error('File not found')
      );

      const result = await parser.parseDocumentXml();
      expect(result).toEqual({ CommonData: {} });
    });
  });

  describe('parsePagesXml', () => {
    test('应该解析Pages.xml', async () => {
      const mockPagesContent = `
        <?xml version="1.0" encoding="UTF-8"?>
        <ofd:Pages xmlns:ofd="http://www.ofdspec.org/2016">
          <ofd:Page ID="1" BaseLoc="Pages/Page_0/Content.xml">
            <ofd:PageArea>
              <ofd:PhysicalBox>0 0 210 297</ofd:PhysicalBox>
            </ofd:PageArea>
          </ofd:Page>
          <ofd:Page ID="2" BaseLoc="Pages/Page_1/Content.xml">
            <ofd:PageArea>
              <ofd:PhysicalBox>0 0 210 297</ofd:PhysicalBox>
            </ofd:PageArea>
          </ofd:Page>
        </ofd:Pages>
      `;

      parser.zipParser.readFile = jest.fn().mockResolvedValue(
        new TextEncoder().encode(mockPagesContent)
      );

      const result = await parser.parsePagesXml();
      expect(result).toHaveLength(2);
      expect(result[0].ID).toBe('1');
      expect(result[1].ID).toBe('2');
    });

    test('Pages.xml不存在时应该返回空数组', async () => {
      parser.zipParser.readFile = jest.fn().mockRejectedValue(
        new Error('File not found')
      );

      const result = await parser.parsePagesXml();
      expect(result).toEqual([]);
    });
  });

  describe('parsePageContents', () => {
    test('应该解析页面内容', async () => {
      const pages = [
        { ID: 'Page_0' },
        { ID: 'Page_1' }
      ];

      const mockPageContent = `
        <?xml version="1.0" encoding="UTF-8"?>
        <ofd:Content xmlns:ofd="http://www.ofdspec.org/2016">
          <ofd:PageArea>
            <ofd:PhysicalBox>0 0 210 297</ofd:PhysicalBox>
          </ofd:PageArea>
          <ofd:Layer>
            <ofd:TextObject ID="Text_1" Boundary="10 10 100 20">
              <ofd:TextCode X="10" Y="20">e6b58be8af95</ofd:TextCode>
            </ofd:TextObject>
            <ofd:ImageObject ID="Image_1" Boundary="10 40 100 100" ResourceID="Res_1"/>
            <ofd:PathObject ID="Path_1" Boundary="10 150 100 50" 
                           StrokeColor="#FF0000" FillColor="#0000FF" LineWidth="2"/>
          </ofd:Layer>
        </ofd:Content>
      `;

      parser.zipParser.readFile = jest.fn().mockResolvedValue(
        new TextEncoder().encode(mockPageContent)
      );

      const result = await parser.parsePageContents(pages);
      expect(result).toHaveLength(2);
      expect(result[0].width).toBe(210);
      expect(result[0].height).toBe(297);
      expect(result[0].elements).toHaveLength(3);
    });

    test('页面解析失败时应该返回默认页面', async () => {
      const pages = [{ ID: 'Page_0' }];

      parser.zipParser.readFile = jest.fn().mockRejectedValue(
        new Error('File not found')
      );

      const result = await parser.parsePageContents(pages);
      expect(result).toHaveLength(1);
      expect(result[0].width).toBe(210);
      expect(result[0].height).toBe(297);
      expect(result[0].elements).toEqual([]);
    });
  });

  describe('extractElements', () => {
    test('应该提取所有元素类型', () => {
      const mockXml = {
        Content: {
          Layer: {
            TextObject: {
              ID: 'Text_1',
              Boundary: '10 10 100 20',
              TextCode: { X: '10', Y: '20', TextCode: 'e6b58be8af95' }
            },
            ImageObject: {
              ID: 'Image_1',
              Boundary: '10 40 100 100',
              ResourceID: 'Res_1'
            },
            PathObject: {
              ID: 'Path_1',
              Boundary: '10 150 100 50',
              StrokeColor: '#FF0000',
              FillColor: '#0000FF',
              LineWidth: '2'
            }
          }
        }
      };

      const result = parser.extractElements(mockXml);
      expect(result).toHaveLength(3);
      expect(result[0].type).toBe('text');
      expect(result[1].type).toBe('image');
      expect(result[2].type).toBe('path');
    });

    test('应该处理多个Layer', () => {
      const mockXml = {
        Content: {
          Layer: [
            {
              TextObject: {
                ID: 'Text_1',
                Boundary: '10 10 100 20',
                TextCode: { X: '10', Y: '20', TextCode: 'e6b58be8af95' }
              }
            },
            {
              ImageObject: {
                ID: 'Image_1',
                Boundary: '10 40 100 100',
                ResourceID: 'Res_1'
              }
            }
          ]
        }
      };

      const result = parser.extractElements(mockXml);
      expect(result).toHaveLength(2);
    });

    test('没有元素时应该返回空数组', () => {
      const mockXml = {
        Content: {}
      };

      const result = parser.extractElements(mockXml);
      expect(result).toEqual([]);
    });
  });

  describe('extractTextObject', () => {
    test('应该提取文本对象', () => {
      const textObj = {
        ID: 'Text_1',
        Boundary: '10 10 100 20',
        TextCode: { X: '10', Y: '20', TextCode: 'e6b58be8af95' }
      };

      const result = parser.extractTextObject(textObj);
      expect(result.type).toBe('text');
      expect(result.id).toBe('Text_1');
      expect(result.x).toBe(10);
      expect(result.y).toBe(10);
      expect(result.width).toBe(100);
      expect(result.height).toBe(20);
      expect(result.content).toBe('测试');
    });

    test('缺少Boundary时应该使用默认值', () => {
      const textObj = {
        ID: 'Text_1',
        TextCode: { TextCode: 'e6b58be8af95' }
      };

      const result = parser.extractTextObject(textObj);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.width).toBe(100);
      expect(result.height).toBe(20);
    });
  });

  describe('extractTextContent', () => {
    test('应该解码十六进制文本', () => {
      const textCode = {
        X: '10',
        Y: '20',
        TextCode: 'e6b58be8af95' // '测试'的UTF-8编码
      };

      const result = parser.extractTextContent(textCode);
      expect(result).toBe('测试');
    });

    test('应该处理文本数组', () => {
      const textCode = [
        { X: '10', Y: '20', TextCode: 'e6b58b' },
        { X: '20', Y: '20', TextCode: 'e8af95' }
      ];

      const result = parser.extractTextContent(textCode);
      expect(result).toBe('测试');
    });

    test('空值时应该返回空字符串', () => {
      expect(parser.extractTextContent(null)).toBe('');
      expect(parser.extractTextContent(undefined)).toBe('');
      expect(parser.extractTextContent({})).toBe('');
    });
  });

  describe('extractImageObject', () => {
    test('应该提取图片对象', () => {
      const imgObj = {
        ID: 'Image_1',
        Boundary: '10 40 100 100',
        ResourceID: 'Res_1'
      };

      const result = parser.extractImageObject(imgObj);
      expect(result.type).toBe('image');
      expect(result.id).toBe('Image_1');
      expect(result.resourceId).toBe('Res_1');
      expect(result.x).toBe(10);
      expect(result.y).toBe(40);
      expect(result.width).toBe(100);
      expect(result.height).toBe(100);
    });
  });

  describe('extractPathObject', () => {
    test('应该提取路径对象', () => {
      const pathObj = {
        ID: 'Path_1',
        Boundary: '10 150 100 50',
        StrokeColor: '#FF0000',
        FillColor: '#0000FF',
        LineWidth: '2'
      };

      const result = parser.extractPathObject(pathObj);
      expect(result.type).toBe('path');
      expect(result.id).toBe('Path_1');
      expect(result.boundary.x).toBe(10);
      expect(result.boundary.y).toBe(150);
      expect(result.boundary.width).toBe(100);
      expect(result.boundary.height).toBe(50);
      expect(result.strokeColor).toBe('#FF0000');
      expect(result.fillColor).toBe('#0000FF');
      expect(result.lineWidth).toBe(2);
    });

    test('缺少颜色时应该使用默认值', () => {
      const pathObj = {
        ID: 'Path_1',
        Boundary: '10 150 100 50'
      };

      const result = parser.extractPathObject(pathObj);
      expect(result.strokeColor).toBe('#000000');
      expect(result.fillColor).toBe('#FFFFFF');
      expect(result.lineWidth).toBe(1);
    });
  });

  describe('buildMetadata', () => {
    test('应该构建文档元数据', () => {
      const ofdXml = {
        'ofd:OFD': {
          Version: '1.0',
          DocType: 'OFD'
        }
      };

      const documentInfo = {
        'ofd:Document': {
          CommonData: {
            Title: '测试文档',
            Creator: '测试作者',
            Subject: '测试主题',
            Keywords: '测试关键字',
            CreationDate: '2024-01-01T00:00:00',
            ModDate: '2024-01-01T00:00:00'
          }
        }
      };

      parser.ofdData = {
        files: [
          { name: 'Doc_0/Pages/Page_0/Content.xml' },
          { name: 'Doc_0/Pages/Page_1/Content.xml' }
        ]
      };

      const result = parser.buildMetadata(ofdXml, documentInfo);
      expect(result.format).toBe('OFD');
      expect(result.version).toBe('1.0');
      expect(result.title).toBe('测试文档');
      expect(result.author).toBe('测试作者');
      expect(result.subject).toBe('测试主题');
      expect(result.keywords).toBe('测试关键字');
      expect(result.pageCount).toBe(2);
    });

    test('缺少数据时应该使用默认值', () => {
      const result = parser.buildMetadata({}, {});
      expect(result.format).toBe('OFD');
      expect(result.version).toBe('1.0');
      expect(result.title).toBe('');
      expect(result.author).toBe('');
      expect(result.pageCount).toBe(0);
    });
  });

  describe('parseXML', () => {
    test('应该解析XML字符串', () => {
      const xmlStr = `
        <?xml version="1.0" encoding="UTF-8"?>
        <Root>
          <Child1>Value1</Child1>
          <Child2 attr="value2">Value2</Child2>
        </Root>
      `;

      const result = parser.parseXML(xmlStr);
      expect(result.Child1['#text']).toBe('Value1');
      expect(result.Child2['@attr']).toBe('value2');
      expect(result.Child2['#text']).toBe('Value2');
    });

    test('应该处理重复元素', () => {
      const xmlStr = `
        <?xml version="1.0" encoding="UTF-8"?>
        <Root>
          <Item>Item1</Item>
          <Item>Item2</Item>
          <Item>Item3</Item>
        </Root>
      `;

      const result = parser.parseXML(xmlStr);
      expect(Array.isArray(result.Item)).toBe(true);
      expect(result.Item).toHaveLength(3);
      expect(result.Item[0]['#text']).toBe('Item1');
      expect(result.Item[1]['#text']).toBe('Item2');
      expect(result.Item[2]['#text']).toBe('Item3');
    });
  });

  describe('parse', () => {
    test('完整的解析流程', async () => {
      // Mock ZIPParser
      parser.zipParser.parse = jest.fn().mockResolvedValue({
        files: [
          { name: 'OFD.xml' },
          { name: 'Doc_0/Document.xml' },
          { name: 'Doc_0/Pages.xml' },
          { name: 'Doc_0/Pages/Page_0/Content.xml' }
        ]
      });

      // Mock所有XML文件
      const ofdXml = '<?xml version="1.0"?><ofd:OFD xmlns:ofd="http://www.ofdspec.org/2016" DocType="OFD" Version="1.0"/>';
      const documentXml = '<?xml version="1.0"?><ofd:Document xmlns:ofd="http://www.ofdspec.org/2016"><ofd:CommonData><ofd:Title>测试</ofd:Title></ofd:CommonData></ofd:Document>';
      const pagesXml = '<?xml version="1.0"?><ofd:Pages xmlns:ofd="http://www.ofdspec.org/2016"><ofd:Page ID="1"><ofd:PageArea><ofd:PhysicalBox>0 0 210 297</ofd:PhysicalBox></ofd:PageArea></ofd:Page></ofd:Pages>';
      const pageContent = '<?xml version="1.0"?><ofd:Content xmlns:ofd="http://www.ofdspec.org/2016"><ofd:PageArea><ofd:PhysicalBox>0 0 210 297</ofd:PhysicalBox></ofd:PageArea><ofd:Layer><ofd:TextObject ID="T1" Boundary="10 10 100 20"><ofd:TextCode X="10" Y="20">e6b58b</ofd:TextCode></ofd:TextObject></ofd:Layer></ofd:Content>';

      parser.zipParser.readFile = jest.fn()
        .mockResolvedValueOnce(new TextEncoder().encode(ofdXml))
        .mockResolvedValueOnce(new TextEncoder().encode(documentXml))
        .mockResolvedValueOnce(new TextEncoder().encode(pagesXml))
        .mockResolvedValueOnce(new TextEncoder().encode(pageContent));

      const mockFileData = new ArrayBuffer(100);
      const result = await parser.parse(mockFileData);

      expect(result.type).toBe('ofd');
      expect(result.metadata).toBeDefined();
      expect(result.pages).toBeDefined();
      expect(result.pages).toHaveLength(1);
      expect(result.pages[0].elements).toHaveLength(1);
      expect(result.pages[0].elements[0].type).toBe('text');
    });

    test('无效文件应该抛出错误', async () => {
      const mockFileData = new ArrayBuffer(4);
      
      await expect(parser.parse(mockFileData)).rejects.toThrow(
        'Invalid OFD file format'
      );
    });
  });

  describe('getImageResource', () => {
    test('应该获取图片资源', async () => {
      const mockImageData = new Uint8Array([0x89, 0x50, 0x4E, 0x47]); // PNG签名

      parser.ofdData = {
        files: [
          { name: 'Doc_0/Res/Image_Res_1.png' }
        ]
      };

      parser.zipParser.readFile = jest.fn().mockResolvedValue(mockImageData);

      const result = await parser.getImageResource('Res_1');
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    test('资源不存在时应该抛出错误', async () => {
      parser.ofdData = {
        files: []
      };

      await expect(parser.getImageResource('Res_1')).rejects.toThrow(
        'Resource not found: Res_1'
      );
    });
  });

  describe('getMetadata', () => {
    test('应该获取文档元数据', async () => {
      parser.zipParser.parse = jest.fn().mockResolvedValue({
        files: []
      });

      parser.zipParser.readFile = jest.fn()
        .mockResolvedValueOnce(new TextEncoder().encode('<?xml version="1.0"?><ofd:OFD xmlns:ofd="http://www.ofdspec.org/2016" DocType="OFD" Version="1.0"/>'))
        .mockResolvedValueOnce(new TextEncoder().encode('<?xml version="1.0"?><ofd:Document xmlns:ofd="http://www.ofdspec.org/2016"><ofd:CommonData><ofd:Title>测试</ofd:Title></ofd:CommonData></ofd:Document>'));

      const mockFileData = new ArrayBuffer(100);
      const result = await parser.getMetadata(mockFileData);

      expect(result).toBeDefined();
      expect(result.format).toBe('OFD');
    });
  });
});
