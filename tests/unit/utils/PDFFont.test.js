/**
 * PDFFont单元测试
 */

import {
  PDFFont,
  StandardFonts,
  WinAnsiEncoding
} from '../../../src/utils/PDFFont.js';

describe('PDFFont', () => {
  describe('StandardFonts', () => {
    test('应该包含14种标准字体', () => {
      const standardFonts = Object.keys(StandardFonts);
      expect(standardFonts).toHaveLength(14);
    });

    test('应该包含Times系列字体', () => {
      expect(StandardFonts).toHaveProperty('Times-Roman');
      expect(StandardFonts).toHaveProperty('Times-Italic');
      expect(StandardFonts).toHaveProperty('Times-Bold');
      expect(StandardFonts).toHaveProperty('Times-BoldItalic');
    });

    test('应该包含Helvetica系列字体', () => {
      expect(StandardFonts).toHaveProperty('Helvetica');
      expect(StandardFonts).toHaveProperty('Helvetica-Oblique');
      expect(StandardFonts).toHaveProperty('Helvetica-Bold');
      expect(StandardFonts).toHaveProperty('Helvetica-BoldOblique');
    });

    test('应该包含Courier系列字体', () => {
      expect(StandardFonts).toHaveProperty('Courier');
      expect(StandardFonts).toHaveProperty('Courier-Oblique');
      expect(StandardFonts).toHaveProperty('Courier-Bold');
      expect(StandardFonts).toHaveProperty('Courier-BoldOblique');
    });

    test('应该包含Symbol和ZapfDingbats', () => {
      expect(StandardFonts).toHaveProperty('Symbol');
      expect(StandardFonts).toHaveProperty('ZapfDingbats');
    });

    test('应该正确设置字体属性', () => {
      const timesRoman = StandardFonts['Times-Roman'];
      expect(timesRoman.serif).toBe(true);
      expect(timesRoman.monospace).toBe(false);
      expect(timesRoman.bold).toBe(false);
      expect(timesRoman.italic).toBe(false);

      const helveticaBold = StandardFonts['Helvetica-Bold'];
      expect(helveticaBold.serif).toBe(false);
      expect(helveticaBold.monospace).toBe(false);
      expect(helveticaBold.bold).toBe(true);
      expect(helveticaBold.italic).toBe(false);

      const courier = StandardFonts['Courier'];
      expect(courier.serif).toBe(false);
      expect(courier.monospace).toBe(true);
    });
  });

  describe('isStandardFont', () => {
    test('应该识别标准字体', () => {
      expect(PDFFont.isStandardFont('Times-Roman')).toBe(true);
      expect(PDFFont.isStandardFont('Helvetica')).toBe(true);
      expect(PDFFont.isStandardFont('Courier')).toBe(true);
      expect(PDFFont.isStandardFont('Symbol')).toBe(true);
      expect(PDFFont.isStandardFont('ZapfDingbats')).toBe(true);
    });

    test('应该拒绝非标准字体', () => {
      expect(PDFFont.isStandardFont('Arial')).toBe(false);
      expect(PDFFont.isStandardFont('Verdana')).toBe(false);
      expect(PDFFont.isStandardFont('CustomFont')).toBe(false);
    });

    test('应该处理大小写敏感', () => {
      expect(PDFFont.isStandardFont('times-roman')).toBe(false);
      expect(PDFFont.isStandardFont('Times-roman')).toBe(false);
    });
  });

  describe('getStandardFontInfo', () => {
    test('应该返回标准字体信息', () => {
      const info = PDFFont.getStandardFontInfo('Times-Roman');

      expect(info).not.toBeNull();
      expect(info).toHaveProperty('serif');
      expect(info).toHaveProperty('monospace');
      expect(info).toHaveProperty('bold');
      expect(info).toHaveProperty('italic');
    });

    test('应该返回null对于非标准字体', () => {
      const info = PDFFont.getStandardFontInfo('Arial');
      expect(info).toBeNull();
    });

    test('应该正确识别Times字体属性', () => {
      const info = PDFFont.getStandardFontInfo('Times-BoldItalic');

      expect(info.serif).toBe(true);
      expect(info.bold).toBe(true);
      expect(info.italic).toBe(true);
    });

    test('应该正确识别Courier字体属性', () => {
      const info = PDFFont.getStandardFontInfo('Courier');

      expect(info.monospace).toBe(true);
      expect(info.bold).toBe(false);
      expect(info.italic).toBe(false);
    });
  });

  describe('winAnsiToUnicode', () => {
    test('应该转换基本ASCII字符', () => {
      const codes = [65, 66, 67]; // ABC
      const result = PDFFont.winAnsiToUnicode(codes);

      expect(result).toBe('ABC');
    });

    test('应该转换空格', () => {
      const codes = [32];
      const result = PDFFont.winAnsiToUnicode(codes);

      expect(result).toBe(' ');
    });

    test('应该转换拉丁字母', () => {
      const codes = [0xC0, 0xC1, 0xC2]; // ÀÁÂ
      const result = PDFFont.winAnsiToUnicode(codes);

      expect(result).toBe('ÀÁÂ');
    });

    test('应该处理Euro符号', () => {
      const codes = [0x80]; // Euro
      const result = PDFFont.winAnsiToUnicode(codes);

      expect(result).toBe('€');
    });

    test('应该处理版权符号', () => {
      const codes = [0xA9]; // ©
      const result = PDFFont.winAnsiToUnicode(codes);

      expect(result).toBe('©');
    });

    test('应该处理注册商标符号', () => {
      const codes = [0xAE]; // ®
      const result = PDFFont.winAnsiToUnicode(codes);

      expect(result).toBe('®');
    });

    test('应该处理空数组', () => {
      const codes = [];
      const result = PDFFont.winAnsiToUnicode(codes);

      expect(result).toBe('');
    });

    test('应该处理超出范围的代码', () => {
      const codes = [300, 400]; // 超出WinAnsiEncoding范围
      const result = PDFFont.winAnsiToUnicode(codes);

      expect(result).toBe('');
    });

    test('应该处理零值代码', () => {
      const codes = [65, 0, 66];
      const result = PDFFont.winAnsiToUnicode(codes);

      expect(result).toBe('AB');
    });
  });

  describe('bytesToWinAnsiString', () => {
    test('应该将字节数组转换为字符串', () => {
      const bytes = new Uint8Array([65, 66, 67]);
      const result = PDFFont.bytesToWinAnsiString(bytes);

      expect(result).toBe('ABC');
    });

    test('应该处理特殊字符', () => {
      const bytes = new Uint8Array([0xC0, 0xE9, 0xE0]); // Àéà
      const result = PDFFont.bytesToWinAnsiString(bytes);

      expect(result).toBe('Àéà');
    });

    test('应该处理空字节数组', () => {
      const bytes = new Uint8Array(0);
      const result = PDFFont.bytesToWinAnsiString(bytes);

      expect(result).toBe('');
    });
  });

  describe('parseFont', () => {
    test('应该解析字体字典', () => {
      const fontDict = {
        Type: { value: 'Font' },
        Subtype: { value: 'Type1' },
        BaseFont: { value: 'Times-Roman' },
        Encoding: { value: 'WinAnsiEncoding' }
      };

      const font = PDFFont.parseFont(fontDict);

      expect(font.type).toBe('Font');
      expect(font.subtype).toBe('Type1');
      expect(font.name).toBe('Times-Roman');
      expect(font.baseFont).toBe('Times-Roman');
      expect(font.encoding).toBe('WinAnsiEncoding');
    });

    test('应该识别标准字体', () => {
      const fontDict = {
        BaseFont: { value: 'Helvetica' }
      };

      const font = PDFFont.parseFont(fontDict);

      expect(font.isStandard).toBe(true);
      expect(font.info).not.toBeNull();
    });

    test('应该标记非标准字体', () => {
      const fontDict = {
        BaseFont: { value: 'Arial' }
      };

      const font = PDFFont.parseFont(fontDict);

      expect(font.isStandard).toBe(false);
      expect(font.info).toBeNull();
    });

    test('应该处理缺失的字段', () => {
      const fontDict = {};

      const font = PDFFont.parseFont(fontDict);

      expect(font.type).toBeNull();
      expect(font.name).toBeNull();
      expect(font.encoding).toBe('WinAnsiEncoding');
    });

    test('应该处理字符串类型的Encoding', () => {
      const fontDict = {
        BaseFont: { value: 'Courier' },
        Encoding: 'WinAnsiEncoding'
      };

      const font = PDFFont.parseFont(fontDict);

      expect(font.encoding).toBe('WinAnsiEncoding');
    });

    test('应该获取标准字体信息', () => {
      const fontDict = {
        BaseFont: { value: 'Helvetica-Bold' }
      };

      const font = PDFFont.parseFont(fontDict);

      expect(font.info.bold).toBe(true);
    });
  });

  describe('decodeText', () => {
    test('应该返回解码后的文本', () => {
      const font = PDFFont.parseFont({ BaseFont: { value: 'Times-Roman' } });
      const text = 'Hello World';

      const result = PDFFont.decodeText(text, font);

      expect(result).toBe('Hello World');
    });

    test('应该处理空文本', () => {
      const font = PDFFont.parseFont({ BaseFont: { value: 'Helvetica' } });
      const text = '';

      const result = PDFFont.decodeText(text, font);

      expect(result).toBe('');
    });
  });

  describe('parseCIDFont', () => {
    test('应该解析CID字体', () => {
      const fontDict = {
        BaseFont: { value: 'CIDFont0' },
        CIDSystemInfo: {}
      };

      const font = PDFFont.parseCIDFont(fontDict);

      expect(font.type).toBe('CIDFont');
      expect(font.name).toBe('CIDFont0');
    });

    test('应该处理缺失的BaseFont', () => {
      const fontDict = {};

      const font = PDFFont.parseCIDFont(fontDict);

      expect(font.name).toBe('Unknown');
    });
  });

  describe('parseTrueTypeFont', () => {
    test('应该解析TrueType字体', () => {
      const fontDict = {
        BaseFont: { value: 'Arial' },
        Encoding: { value: 'WinAnsiEncoding' }
      };

      const font = PDFFont.parseTrueTypeFont(fontDict);

      expect(font.type).toBe('TrueType');
      expect(font.name).toBe('Arial');
      expect(font.encoding).toBe('WinAnsiEncoding');
    });

    test('应该处理缺失的Encoding', () => {
      const fontDict = {
        BaseFont: { value: 'Verdana' }
      };

      const font = PDFFont.parseTrueTypeFont(fontDict);

      expect(font.encoding).toBe('WinAnsiEncoding');
    });
  });

  describe('WinAnsiEncoding', () => {
    test('应该有256个编码项', () => {
      expect(WinAnsiEncoding).toHaveLength(256);
    });

    test('ASCII编码应该正确', () => {
      expect(WinAnsiEncoding[65]).toBe(0x0041); // 'A'
      expect(WinAnsiEncoding[90]).toBe(0x005A); // 'Z'
      expect(WinAnsiEncoding[97]).toBe(0x0061); // 'a'
      expect(WinAnsiEncoding[122]).toBe(0x007A); // 'z'
    });

    test('数字编码应该正确', () => {
      expect(WinAnsiEncoding[48]).toBe(0x0030); // '0'
      expect(WinAnsiEncoding[57]).toBe(0x0039); // '9'
    });

    test('控制字符编码应该正确', () => {
      expect(WinAnsiEncoding[10]).toBe(0x000A); // 换行
      expect(WinAnsiEncoding[13]).toBe(0x000D); // 回车
      expect(WinAnsiEncoding[9]).toBe(0x0009); // 制表符
    });

    test('扩展ASCII编码应该正确', () => {
      expect(WinAnsiEncoding[0xC0]).toBe(0x00C0); // À
      expect(WinAnsiEncoding[0xE0]).toBe(0x00E0); // à
      expect(WinAnsiEncoding[0x20AC]).toBe(0x20AC); // € (Euro)
    });
  });
});
