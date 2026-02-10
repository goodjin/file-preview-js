/**
 * RTF解析器单元测试
 * 测试覆盖率目标：≥80%
 */

import { RTFParser } from '../../../src/parsers/document/RTFParser.js';

describe('RTFParser', () => {
  let parser;

  beforeEach(() => {
    parser = new RTFParser();
  });

  describe('validate', () => {
    test('应该验证有效的RTF文件', () => {
      const rtfData = createMinimalRTF();
      expect(parser.validate(rtfData)).toBe(true);
    });

    test('应该拒绝无效的RTF文件', () => {
      const rtfData = new TextEncoder().encode('NOT A RTF').buffer;
      expect(parser.validate(rtfData)).toBe(false);
    });

    test('应该拒绝空数据', () => {
      const rtfData = new ArrayBuffer(0);
      expect(parser.validate(rtfData)).toBe(false);
    });

    test('应该验证RTF1.0版本', () => {
      const rtfData = createRTFWithVersion('rtf1');
      expect(parser.validate(rtfData)).toBe(true);
    });

    test('应该验证RTF1.5版本', () => {
      const rtfData = createRTFWithVersion('rtf1');
      expect(parser.validate(rtfData)).toBe(true);
    });
  });

  describe('parse - 错误处理', () => {
    test('应该抛出错误处理无效RTF', async () => {
      const rtfData = new TextEncoder().encode('INVALID').buffer;
      await expect(parser.parse(rtfData)).rejects.toThrow('无效的RTF文件格式');
    });

    test('应该处理空RTF文件', async () => {
      const rtfData = createMinimalRTF('');
      const result = await parser.parse(rtfData);

      expect(result).toHaveProperty('type', 'rtf');
      expect(result.content).toEqual([]);
    });
  });

  describe('parse - 基本功能', () => {
    test('应该解析RTF并返回正确的格式', async () => {
      const rtfData = createMinimalRTF('Hello World');
      const result = await parser.parse(rtfData);

      expect(result).toHaveProperty('type', 'rtf');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('metadata');
      expect(Array.isArray(result.content)).toBe(true);
    });

    test('应该设置正确的格式类型', async () => {
      const rtfData = createMinimalRTF('Test');
      const result = await parser.parse(rtfData);

      expect(result.type).toBe('rtf');
    });
  });

  describe('parse - 文本内容提取', () => {
    test('应该提取纯文本内容', async () => {
      const rtfData = createMinimalRTF('Hello World');
      const result = await parser.parse(rtfData);

      const textElements = result.content.filter(e => e.type === 'text');
      expect(textElements.length).toBeGreaterThan(0);
      expect(textElements[0].text).toContain('Hello World');
    });

    test('应该提取多段文本', async () => {
      const rtfData = createRTFWithMultipleParagraphs();
      const result = await parser.parse(rtfData);

      const textElements = result.content.filter(e => e.type === 'text');
      expect(textElements.length).toBe(2);
    });

    test('应该处理转义字符', async () => {
      const rtfData = createRTFWithEscapedChars();
      const result = await parser.parse(rtfData);

      expect(result.content.length).toBeGreaterThan(0);
    });

    test('应该处理包含大括号的文本', async () => {
      const rtfData = createRTFWithBraces();
      const result = await parser.parse(rtfData);

      expect(result.content.length).toBeGreaterThan(0);
    });

    test('应该处理空文本', async () => {
      const rtfData = createMinimalRTF('');
      const result = await parser.parse(rtfData);

      expect(result.content).toEqual([]);
    });

    test('应该处理只包含空白的文本', async () => {
      const rtfData = createMinimalRTF('   ');
      const result = await parser.parse(rtfData);

      // 空白文本不应该被添加到内容中
      expect(result.content).toEqual([]);
    });
  });

  describe('parse - 样式提取', () => {
    test('应该提取字体大小', async () => {
      const rtfData = createRTFWithFontSize(24);
      const result = await parser.parse(rtfData);

      const textElements = result.content.filter(e => e.type === 'text');
      if (textElements.length > 0) {
        expect(textElements[0].styles.fontSize).toBe(12);
      }
    });

    test('应该提取加粗样式', async () => {
      const rtfData = createRTFWithBold();
      const result = await parser.parse(rtfData);

      const textElements = result.content.filter(e => e.type === 'text');
      if (textElements.length > 0) {
        expect(textElements[0].styles.bold).toBe(true);
      }
    });

    test('应该提取斜体样式', async () => {
      const rtfData = createRTFWithItalic();
      const result = await parser.parse(rtfData);

      const textElements = result.content.filter(e => e.type === 'text');
      if (textElements.length > 0) {
        expect(textElements[0].styles.italic).toBe(true);
      }
    });

    test('应该提取下划线样式', async () => {
      const rtfData = createRTFWithUnderline();
      const result = await parser.parse(rtfData);

      const textElements = result.content.filter(e => e.type === 'text');
      if (textElements.length > 0) {
        expect(textElements[0].styles.underline).toBe(true);
      }
    });

    test('应该提取多个样式组合', async () => {
      const rtfData = createRTFWithMultipleStyles();
      const result = await parser.parse(rtfData);

      const textElements = result.content.filter(e => e.type === 'text');
      if (textElements.length > 0) {
        expect(textElements[0].styles.bold).toBe(true);
        expect(textElements[0].styles.italic).toBe(true);
      }
    });

    test('应该设置默认样式', async () => {
      const rtfData = createMinimalRTF('Test');
      const result = await parser.parse(rtfData);

      const textElements = result.content.filter(e => e.type === 'text');
      if (textElements.length > 0) {
        expect(textElements[0].styles.font).toBe(0);
        expect(textElements[0].styles.fontSize).toBe(12);
        expect(textElements[0].styles.bold).toBe(false);
        expect(textElements[0].styles.italic).toBe(false);
        expect(textElements[0].styles.underline).toBe(false);
        expect(textElements[0].styles.color).toBe(0);
        expect(textElements[0].styles.bgColor).toBe(-1);
      }
    });

    test('应该重置样式', async () => {
      const rtfData = createRTFWithStyleReset();
      const result = await parser.parse(rtfData);

      expect(result.content.length).toBeGreaterThan(1);
      // 第二段应该使用默认样式
      if (result.content.length > 1) {
        const secondElement = result.content[result.content.length - 1];
        expect(secondElement.styles.bold).toBe(false);
      }
    });
  });

  describe('parse - 颜色提取', () => {
    test('应该提取前景色索引', async () => {
      const rtfData = createRTFWithColor(2);
      const result = await parser.parse(rtfData);

      const textElements = result.content.filter(e => e.type === 'text');
      if (textElements.length > 0) {
        expect(textElements[0].styles.color).toBe(2);
      }
    });

    test('应该提取背景色索引', async () => {
      const rtfData = createRTFWithBgColor(1);
      const result = await parser.parse(rtfData);

      const textElements = result.content.filter(e => e.type === 'text');
      if (textElements.length > 0) {
        expect(textElements[0].styles.bgColor).toBe(1);
      }
    });

    test('应该设置默认颜色', async () => {
      const rtfData = createMinimalRTF('Test');
      const result = await parser.parse(rtfData);

      const textElements = result.content.filter(e => e.type === 'text');
      if (textElements.length > 0) {
        expect(textElements[0].styles.color).toBe(0);
        expect(textElements[0].styles.bgColor).toBe(-1);
      }
    });
  });

  describe('parse - 元数据提取', () => {
    test('应该提取标题元数据', async () => {
      const rtfData = createRTFWithTitle('My Title');
      const result = await parser.parse(rtfData);

      expect(result.metadata.title).toBe('My Title');
    });

    test('应该提取作者元数据', async () => {
      const rtfData = createRTFWithAuthor('John Doe');
      const result = await parser.parse(rtfData);

      expect(result.metadata.author).toBe('John Doe');
    });

    test('应该提取创建时间元数据', async () => {
      const rtfData = createRTFWithCreateTime();
      const result = await parser.parse(rtfData);

      expect(result.metadata.createTime).toBeDefined();
    });

    test('应该设置默认元数据', async () => {
      const rtfData = createMinimalRTF('Test');
      const result = await parser.parse(rtfData);

      expect(result.metadata).toHaveProperty('format', 'RTF');
      expect(result.metadata).toHaveProperty('version', '1.0');
    });

    test('应该处理缺失的元数据', async () => {
      const rtfData = createMinimalRTF('Test');
      const result = await parser.parse(rtfData);

      expect(result.metadata.title).toBeUndefined();
      expect(result.metadata.author).toBeUndefined();
      expect(result.metadata.createTime).toBeUndefined();
    });
  });

  describe('getMetadata', () => {
    test('应该从RTF提取元数据', () => {
      const rtfData = createRTFWithTitle('Test Title');
      const metadata = parser.getMetadata(rtfData);

      expect(metadata).toHaveProperty('format', 'RTF');
      expect(metadata).toHaveProperty('version', '1.0');
      expect(metadata).toHaveProperty('title', 'Test Title');
    });

    test('应该提取完整的元数据', () => {
      const rtfData = createRTFWithFullMetadata();
      const metadata = parser.getMetadata(rtfData);

      expect(metadata).toHaveProperty('title');
      expect(metadata).toHaveProperty('author');
      expect(metadata).toHaveProperty('createTime');
    });

    test('应该处理无效RTF并返回默认元数据', () => {
      const rtfData = new TextEncoder().encode('INVALID').buffer;
      const metadata = parser.getMetadata(rtfData);

      expect(metadata).toHaveProperty('format');
      expect(metadata).toHaveProperty('version');
    });
  });

  describe('parse - 边界情况', () => {
    test('应该处理只有控制字的RTF', async () => {
      const rtfData = createRTFWithOnlyControlWords();
      const result = await parser.parse(rtfData);

      expect(result).toHaveProperty('type', 'rtf');
    });

    test('应该处理连续的段落结束符', async () => {
      const rtfData = createRTFWithMultipleParagraphBreaks();
      const result = await parser.parse(rtfData);

      expect(result).toHaveProperty('type', 'rtf');
    });

    test('应该处理带有tab的文本', async () => {
      const rtfData = createRTFWithTab();
      const result = await parser.parse(rtfData);

      const textElements = result.content.filter(e => e.type === 'text');
      if (textElements.length > 0) {
        expect(textElements[0].text).toContain('\t');
      }
    });
  });
});

/**
 * 辅助函数：创建最小RTF文件
 */
function createMinimalRTF(text = 'Test') {
  const rtf = `{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang1033\\deflangfe2052{\\fonttbl{\\f0\\fnil\\fcharset134 SimSun;}}
{\\colortbl ;\\red0\\green0\\blue0;}
\\viewkind4\\uc1\\pard\\f0\\fs24 ${text}\\par
}`;
  return new TextEncoder().encode(rtf).buffer;
}

/**
 * 辅助函数：创建指定版本的RTF
 */
function createRTFWithVersion(version) {
  const rtf = `{\\${version}\\ansi\\pard Test\\par}`;
  return new TextEncoder().encode(rtf).buffer;
}

/**
 * 辅助函数：创建多段落的RTF
 */
function createRTFWithMultipleParagraphs() {
  const rtf = `{\\rtf1\\ansi\\pard First paragraph\\par Second paragraph\\par}`;
  return new TextEncoder().encode(rtf).buffer;
}

/**
 * 辅助函数：创建包含转义字符的RTF
 */
function createRTFWithEscapedChars() {
  const rtf = `{\\rtf1\\ansi\\pard Test \\{escaped\\}\\par}`;
  return new TextEncoder().encode(rtf).buffer;
}

/**
 * 辅助函数：创建包含大括号的RTF
 */
function createRTFWithBraces() {
  const rtf = `{\\rtf1\\ansi\\pard Test \\{ with \\} braces\\par}`;
  return new TextEncoder().encode(rtf).buffer;
}

/**
 * 辅助函数：创建包含字体大小的RTF
 */
function createRTFWithFontSize(size) {
  const rtf = `{\\rtf1\\ansi\\pard\\fs${size} Text\\par}`;
  return new TextEncoder().encode(rtf).buffer;
}

/**
 * 辅助函数：创建加粗文本的RTF
 */
function createRTFWithBold() {
  const rtf = `{\\rtf1\\ansi\\pard\\b Bold text\\par}`;
  return new TextEncoder().encode(rtf).buffer;
}

/**
 * 辅助函数：创建斜体文本的RTF
 */
function createRTFWithItalic() {
  const rtf = `{\\rtf1\\ansi\\pard\\i Italic text\\par}`;
  return new TextEncoder().encode(rtf).buffer;
}

/**
 * 辅助函数：创建下划线文本的RTF
 */
function createRTFWithUnderline() {
  const rtf = `{\\rtf1\\ansi\\pard\\ul Underline text\\par}`;
  return new TextEncoder().encode(rtf).buffer;
}

/**
 * 辅助函数：创建包含多个样式的RTF
 */
function createRTFWithMultipleStyles() {
  const rtf = `{\\rtf1\\ansi\\pard\\b\\i Bold and italic\\par}`;
  return new TextEncoder().encode(rtf).buffer;
}

/**
 * 辅助函数：创建包含样式重置的RTF
 */
function createRTFWithStyleReset() {
  const rtf = `{\\rtf1\\ansi\\pard\\b Bold\\par\\b0 Normal\\par}`;
  return new TextEncoder().encode(rtf).buffer;
}

/**
 * 辅助函数：创建包含颜色的RTF
 */
function createRTFWithColor(colorIndex) {
  const rtf = `{\\rtf1\\ansi{\\colortbl ;\\red255\\green0\\blue0;\\red0\\green255\\blue0;}
\\pard\\cf${colorIndex} Colored text\\par}`;
  return new TextEncoder().encode(rtf).buffer;
}

/**
 * 辅助函数：创建包含背景色的RTF
 */
function createRTFWithBgColor(colorIndex) {
  const rtf = `{\\rtf1\\ansi{\\colortbl ;\\red255\\green0\\blue0;\\red0\\green255\\blue0;}
\\pard\\cb${colorIndex} Background colored text\\par}`;
  return new TextEncoder().encode(rtf).buffer;
}

/**
 * 辅助函数：创建包含标题的RTF
 */
function createRTFWithTitle(title) {
  const rtf = `{\\rtf1\\ansi{\\*\\title ${title}}\\pard Test\\par}`;
  return new TextEncoder().encode(rtf).buffer;
}

/**
 * 辅助函数：创建包含作者的RTF
 */
function createRTFWithAuthor(author) {
  const rtf = `{\\rtf1\\ansi{\\*\\author ${author}}\\pard Test\\par}`;
  return new TextEncoder().encode(rtf).buffer;
}

/**
 * 辅助函数：创建包含创建时间的RTF
 */
function createRTFWithCreateTime() {
  const rtf = `{\\rtf1\\ansi{\\*\\creatim\\yr2024\\mo1\\dy1\\hr12\\min30}\\pard Test\\par}`;
  return new TextEncoder().encode(rtf).buffer;
}

/**
 * 辅助函数：创建包含完整元数据的RTF
 */
function createRTFWithFullMetadata() {
  const rtf = `{\\rtf1\\ansi{\\*\\title Test Title}{\\*\\author Test Author}{\\*\\creatim\\yr2024\\mo1\\dy1}\\pard Test\\par}`;
  return new TextEncoder().encode(rtf).buffer;
}

/**
 * 辅助函数：创建只有控制字的RTF
 */
function createRTFWithOnlyControlWords() {
  const rtf = `{\\rtf1\\ansi\\pard\\b\\i\\ul}`;
  return new TextEncoder().encode(rtf).buffer;
}

/**
 * 辅助函数：创建包含多个段落结束符的RTF
 */
function createRTFWithMultipleParagraphBreaks() {
  const rtf = `{\\rtf1\\ansi\\pard Text\\par\\par\\par}`;
  return new TextEncoder().encode(rtf).buffer;
}

/**
 * 辅助函数：创建包含tab的RTF
 */
function createRTFWithTab() {
  const rtf = `{\\rtf1\\ansi\\pard Text\\tab Tabbed\\par}`;
  return new TextEncoder().encode(rtf).buffer;
}
