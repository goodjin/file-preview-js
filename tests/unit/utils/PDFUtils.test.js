/**
 * PDFUtils单元测试
 */

import {
  PDFUtils,
  PDFObjectType,
  ParserError
} from '../../../src/utils/PDFUtils.js';

describe('PDFUtils', () => {
  describe('validatePDF', () => {
    test('应该验证有效的PDF文件', () => {
      const pdfData = new TextEncoder().encode('%PDF-1.4').buffer;
      expect(PDFUtils.validatePDF(pdfData)).toBe(true);
    });

    test('应该拒绝无效的PDF文件', () => {
      const pdfData = new TextEncoder().encode('NOT PDF').buffer;
      expect(PDFUtils.validatePDF(pdfData)).toBe(false);
    });

    test('应该拒绝空数据', () => {
      const pdfData = new ArrayBuffer(0);
      expect(PDFUtils.validatePDF(pdfData)).toBe(false);
    });
  });

  describe('getPDFVersion', () => {
    test('应该正确提取PDF版本号', () => {
      const pdfData = new TextEncoder().encode('%PDF-1.4').buffer;
      expect(PDFUtils.getPDFVersion(pdfData)).toBe('1.4');
    });

    test('应该处理不同的PDF版本', () => {
      const pdfData1 = new TextEncoder().encode('%PDF-1.3').buffer;
      const pdfData2 = new TextEncoder().encode('%PDF-1.7').buffer;

      expect(PDFUtils.getPDFVersion(pdfData1)).toBe('1.3');
      expect(PDFUtils.getPDFVersion(pdfData2)).toBe('1.7');
    });

    test('应该对无效数据返回默认版本', () => {
      const pdfData = new TextEncoder().encode('INVALID').buffer;
      expect(PDFUtils.getPDFVersion(pdfData)).toBe('1.4');
    });
  });

  describe('parseObject', () => {
    test('应该解析null对象', () => {
      const obj = PDFUtils.parseObject('null');
      expect(obj.type).toBe(PDFObjectType.NULL);
      expect(obj.value).toBe(null);
    });

    test('应该解析布尔值', () => {
      const obj1 = PDFUtils.parseObject('true');
      const obj2 = PDFUtils.parseObject('false');

      expect(obj1.type).toBe(PDFObjectType.BOOLEAN);
      expect(obj1.value).toBe(true);
      expect(obj2.type).toBe(PDFObjectType.BOOLEAN);
      expect(obj2.value).toBe(false);
    });

    test('应该解析整数', () => {
      const obj1 = PDFUtils.parseObject('123');
      const obj2 = PDFUtils.parseObject('-456');

      expect(obj1.type).toBe(PDFObjectType.NUMBER);
      expect(obj1.value).toBe(123);
      expect(obj2.type).toBe(PDFObjectType.NUMBER);
      expect(obj2.value).toBe(-456);
    });

    test('应该解析浮点数', () => {
      const obj = PDFUtils.parseObject('12.34');
      expect(obj.type).toBe(PDFObjectType.NUMBER);
      expect(obj.value).toBe(12.34);
    });

    test('应该解析间接引用', () => {
      const obj = PDFUtils.parseObject('10 2 R');
      expect(obj.type).toBe(PDFObjectType.INDIRECT_REFERENCE);
      expect(obj.value.objNumber).toBe(10);
      expect(obj.value.generation).toBe(2);
    });

    test('应该解析名称对象', () => {
      const obj = PDFUtils.parseObject('/FontName');
      expect(obj.type).toBe(PDFObjectType.NAME);
      expect(obj.value).toBe('FontName');
    });

    test('应该解析转义的名称对象', () => {
      const obj = PDFUtils.parseObject('/Font#20Name');
      expect(obj.type).toBe(PDFObjectType.NAME);
      expect(obj.value).toBe('Font Name');
    });

    test('应该解析字面字符串', () => {
      const obj = PDFUtils.parseObject('(Hello World)');
      expect(obj.type).toBe(PDFObjectType.STRING);
      expect(obj.value).toBe('Hello World');
    });

    test('应该解析字面字符串中的转义字符', () => {
      const obj = PDFUtils.parseObject('(Hello\\nWorld)');
      expect(obj.type).toBe(PDFObjectType.STRING);
      expect(obj.value).toBe('Hello\nWorld');
    });

    test('应该解析十六进制字符串', () => {
      const obj = PDFUtils.parseObject('<48656C6C6F>');
      expect(obj.type).toBe(PDFObjectType.STRING);
      expect(obj.value).toBe('Hello');
    });

    test('应该解析数组', () => {
      const obj = PDFUtils.parseObject('[1 2 3]');
      expect(obj.type).toBe(PDFObjectType.ARRAY);
      expect(obj.value).toHaveLength(3);
      expect(obj.value[0].value).toBe(1);
      expect(obj.value[1].value).toBe(2);
      expect(obj.value[2].value).toBe(3);
    });

    test('应该解析字典', () => {
      const obj = PDFUtils.parseObject('<< /Type /Page /Count 1 >>');
      expect(obj.type).toBe(PDFObjectType.DICTIONARY);
      expect(obj.value).toHaveProperty('Type');
      expect(obj.value).toHaveProperty('Count');
    });

    test('应该抛出错误处理无效对象', () => {
      expect(() => PDFUtils.parseObject('INVALID')).toThrow(ParserError);
    });
  });

  describe('parseDictionary', () => {
    test('应该解析空字典', () => {
      const dict = PDFUtils.parseDictionary('<<>>');
      expect(Object.keys(dict).length).toBe(0);
    });

    test('应该解析简单的键值对', () => {
      const dict = PDFUtils.parseDictionary('<< /Type /Page >>');
      expect(dict).toHaveProperty('Type');
      expect(dict.Type.type).toBe(PDFObjectType.NAME);
    });

    test('应该解析多个键值对', () => {
      const dict = PDFUtils.parseDictionary('<< /Type /Page /Count 1 /Kids [1 0 R] >>');
      expect(dict).toHaveProperty('Type');
      expect(dict).toHaveProperty('Count');
      expect(dict).toHaveProperty('Kids');
    });

    test('应该处理包含空格的键', () => {
      const dict = PDFUtils.parseDictionary('<< /FontName /Helvetica >>');
      expect(dict).toHaveProperty('FontName');
    });
  });

  describe('parseArray', () => {
    test('应该解析空数组', () => {
      const arr = PDFUtils.parseArray('[]');
      expect(arr).toHaveLength(0);
    });

    test('应该解析简单数组', () => {
      const arr = PDFUtils.parseArray('[1 2 3]');
      expect(arr).toHaveLength(3);
      expect(arr[0].value).toBe(1);
    });

    test('应该解析混合类型数组', () => {
      const arr = PDFUtils.parseArray('[1 /Name (String)]');
      expect(arr).toHaveLength(3);
      expect(arr[0].type).toBe(PDFObjectType.NUMBER);
      expect(arr[1].type).toBe(PDFObjectType.NAME);
      expect(arr[2].type).toBe(PDFObjectType.STRING);
    });

    test('应该解析嵌套数组', () => {
      const arr = PDFUtils.parseArray('[1 [2 3] 4]');
      expect(arr).toHaveLength(3);
      expect(arr[1].type).toBe(PDFObjectType.ARRAY);
    });
  });

  describe('parseName', () => {
    test('应该解析简单名称', () => {
      const name = PDFUtils.parseName('/FontName');
      expect(name).toBe('FontName');
    });

    test('应该解析包含特殊字符的名称', () => {
      const name = PDFUtils.parseName('/Font#20Name');
      expect(name).toBe('Font Name');
    });

    test('应该解析多个转义字符', () => {
      const name = PDFUtils.parseName('/Test#2F#2FPath');
      expect(name).toBe('Test//Path');
    });
  });

  describe('parseLiteralString', () => {
    test('应该解析简单字符串', () => {
      const str = PDFUtils.parseLiteralString('(Hello)');
      expect(str).toBe('Hello');
    });

    test('应该解析转义的换行符', () => {
      const str = PDFUtils.parseLiteralString('(Line1\\nLine2)');
      expect(str).toBe('Line1\nLine2');
    });

    test('应该解析转义的制表符', () => {
      const str = PDFUtils.parseLiteralString('(Tab\\tHere)');
      expect(str).toBe('Tab\tHere');
    });

    test('应该解析转义的括号', () => {
      const str = PDFUtils.parseLiteralString('(\\(Hello\\))');
      expect(str).toBe('(Hello)');
    });

    test('应该解析转义的反斜杠', () => {
      const str = PDFUtils.parseLiteralString('(Path\\\\File)');
      expect(str).toBe('Path\\File');
    });

    test('应该解析八进制转义序列', () => {
      const str = PDFUtils.parseLiteralString('(\\101\\102\\103)');
      expect(str).toBe('ABC');
    });
  });

  describe('parseHexString', () => {
    test('应该解析十六进制字符串', () => {
      const str = PDFUtils.parseHexString('<48656C6C6F>');
      expect(str).toBe('Hello');
    });

    test('应该处理空格', () => {
      const str = PDFUtils.parseHexString('<48 65 6C 6C 6F>');
      expect(str).toBe('Hello');
    });

    test('应该自动补齐奇数长度', () => {
      const str = PDFUtils.parseHexString('<ABC>');
      expect(str).toBe('\x0A\xBC');
    });
  });

  describe('readIndirectObject', () => {
    test('应该解析间接对象', () => {
      const pdfData = new TextEncoder().encode('10 0 obj\n/Test\nendobj').buffer;
      const obj = PDFUtils.readIndirectObject(pdfData, 0);

      expect(obj.objNumber).toBe(10);
      expect(obj.generation).toBe(0);
      expect(obj.content).toBe('/Test');
    });

    test('应该处理带内容的对象', () => {
      const pdfData = new TextEncoder().encode('10 0 obj\n<< /Type /Page >>\nendobj').buffer;
      const obj = PDFUtils.readIndirectObject(pdfData, 0);

      expect(obj.objNumber).toBe(10);
      expect(obj.generation).toBe(0);
    });

    test('应该抛出错误处理无效对象', () => {
      const pdfData = new TextEncoder().encode('INVALID').buffer;
      expect(() => PDFUtils.readIndirectObject(pdfData, 0)).toThrow(ParserError);
    });
  });

  describe('parseTrailer', () => {
    test('应该解析trailer字典', () => {
      const pdfData = new TextEncoder().encode('trailer\n<< /Size 10 /Root 1 0 R >>\n').buffer;
      const trailer = PDFUtils.parseTrailer(pdfData);

      expect(trailer).toHaveProperty('Size');
      expect(trailer).toHaveProperty('Root');
    });
  });

  describe('parseXRef', () => {
    test('应该解析xref表', () => {
      const pdfData = new TextEncoder().encode('xref\n0 1\n0000000000 65535 f \n').buffer;
      const xref = PDFUtils.parseXRef(pdfData, 0);

      expect(xref).toHaveProperty('0');
      expect(xref[0].status).toBe('f');
      expect(xref[0].generation).toBe(65535);
    });

    test('应该解析多个xref条目', () => {
      const pdfData = new TextEncoder().encode('xref\n0 2\n0000000000 65535 f \n0000000009 00000 n \n').buffer;
      const xref = PDFUtils.parseXRef(pdfData, 0);

      expect(xref).toHaveProperty('0');
      expect(xref).toHaveProperty('1');
      expect(xref[0].status).toBe('f');
      expect(xref[1].status).toBe('n');
      expect(xref[1].offset).toBe(9);
    });
  });
});
