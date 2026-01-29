/**
 * XlsxParser 单元测试
 */

import { XlsxParser } from '../XlsxParser.js';

class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('开始运行 XlsxParser 测试...\n');
    
    for (const { name, fn } of this.tests) {
      try {
        await fn();
        console.log(`✅ ${name}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ ${name}`);
        console.log(`   错误: ${error.message}\n`);
        this.failed++;
      }
    }

    console.log(`\n测试完成: ${this.passed} 通过, ${this.failed} 失败`);
    return { passed: this.passed, failed: this.failed };
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `期望 ${expected}, 实际 ${actual}`);
    }
  }

  assertTrue(value, message) {
    if (!value) {
      throw new Error(message || '期望 true');
    }
  }

  assertFalse(value, message) {
    if (value) {
      throw new Error(message || '期望 false');
    }
  }

  assertNotNull(value, message) {
    if (value === null || value === undefined) {
      throw new Error(message || '期望非空值');
    }
  }

  assertThrows(fn, message) {
    let threw = false;
    try {
      fn();
    } catch (e) {
      threw = true;
    }
    if (!threw) {
      throw new Error(message || '期望抛出异常');
    }
  }
}

// 创建模拟xlsx文件
function createMockXlsxFile() {
  const workbook = {
    SheetNames: ['Sheet1', 'Sheet2'],
    Sheets: {
      'Sheet1': {
        '!ref': 'A1:C2',
        '!merges': [{ s: { r: 0, c: 0 }, e: { r: 1, c: 1 } }],
        A1: { v: '姓名', t: 's', s: { font: { bold: true } } },
        B1: { v: '年龄', t: 's' },
        C1: { v: '城市', t: 's' },
        A2: { v: '张三', t: 's' },
        B2: { v: 25, t: 'n' },
        C2: { v: '北京', t: 's' }
      },
      'Sheet2': {
        '!ref': 'A1:B2',
        A1: { v: '产品', t: 's' },
        B1: { v: '价格', t: 's' },
        A2: { v: '手机', t: 's' },
        B2: { v: 5999, t: 'n' }
      }
    }
  };
  
  return workbook;
}

// 测试主函数
export async function runXlsxParserTests() {
  const runner = new TestRunner();

  // 测试1: 解析器初始化
  runner.test('解析器应该正确初始化', () => {
    const parser = new XlsxParser();
    runner.assertNotNull(parser, '解析器实例不能为空');
    runner.assertEqual(typeof parser.parse, 'function', 'parse方法存在');
    runner.assertEqual(typeof parser.destroy, 'function', 'destroy方法存在');
  });

  // 测试2: 解析工作表数据
  runner.test('应该正确提取工作表数据', () => {
    const mockWorkbook = createMockXlsxFile();
    const worksheet = mockWorkbook.Sheets['Sheet1'];
    const range = { s: { r: 0, c: 0 }, e: { r: 1, c: 2 } };
    
    const parser = new XlsxParser();
    const data = parser._extractSheetData(worksheet, range);
    
    runner.assertEqual(data.length, 2, '应该有2行数据');
    runner.assertEqual(data[0].length, 3, '第一行应该有3列');
    runner.assertEqual(data[0][0].value, '姓名', '第一个单元格值正确');
    runner.assertEqual(data[1][1].value, 25, '数字类型单元格值正确');
  });

  // 测试3: 提取合并单元格
  runner.test('应该正确提取合并单元格信息', () => {
    const mockWorkbook = createMockXlsxFile();
    const worksheet = mockWorkbook.Sheets['Sheet1'];
    
    const parser = new XlsxParser();
    const merges = parser._extractMergedCells(worksheet);
    
    runner.assertEqual(merges.length, 1, '应该有1个合并单元格');
    runner.assertEqual(merges[0].startRow, 0, '起始行正确');
    runner.assertEqual(merges[0].startCol, 0, '起始列正确');
    runner.assertEqual(merges[0].endRow, 1, '结束行正确');
    runner.assertEqual(merges[0].endCol, 1, '结束列正确');
  });

  // 测试4: 提取单元格样式
  runner.test('应该正确提取单元格样式', () => {
    const style = {
      font: { name: 'Arial', sz: 12, bold: true, color: { rgb: 'FF0000' } },
      fill: { fgColor: { rgb: 'FFFF00' } },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: { top: {}, right: {}, bottom: {}, left: {} }
    };
    
    const parser = new XlsxParser();
    const extractedStyle = parser._extractStyle(style);
    
    runner.assertNotNull(extractedStyle.font, '字体样式存在');
    runner.assertEqual(extractedStyle.font.name, 'Arial', '字体名称正确');
    runner.assertEqual(extractedStyle.font.size, 12, '字体大小正确');
    runner.assertTrue(extractedStyle.font.bold, '粗体正确');
    runner.assertEqual(extractedStyle.font.color, 'FF0000', '字体颜色正确');
    
    runner.assertNotNull(extractedStyle.fill, '填充样式存在');
    runner.assertEqual(extractedStyle.fill.color, 'FFFF00', '填充颜色正确');
    
    runner.assertNotNull(extractedStyle.alignment, '对齐样式存在');
    runner.assertEqual(extractedStyle.alignment.horizontal, 'center', '水平对齐正确');
    runner.assertTrue(extractedStyle.alignment.wrapText, '自动换行正确');
  });

  // 测试5: 销毁解析器
  runner.test('应该正确销毁解析器资源', () => {
    const parser = new XlsxParser();
    parser.workbook = { test: 'data' };
    parser.currentSheetIndex = 5;
    
    parser.destroy();
    
    runner.assertEqual(parser.workbook, null, 'workbook应该被清空');
    runner.assertEqual(parser.currentSheetIndex, 0, 'currentSheetIndex应该被重置');
  });

  // 测试6: 处理空工作表
  runner.test('应该正确处理空工作表', () => {
    const mockWorkbook = createMockXlsxFile();
    const worksheet = mockWorkbook.Sheets['Sheet1'];
    const range = { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
    
    // 删除单元格
    delete worksheet.A1;
    
    const parser = new XlsxParser();
    const data = parser._extractSheetData(worksheet, range);
    
    runner.assertEqual(data.length, 1, '应该有1行');
    runner.assertEqual(data[0].length, 1, '应该有1列');
    runner.assertEqual(data[0][0].value, '', '空单元格值应该为空字符串');
  });

  // 测试7: 单元格类型识别
  runner.test('应该正确识别单元格类型', () => {
    const mockWorkbook = createMockXlsxFile();
    const worksheet = mockWorkbook.Sheets['Sheet1'];
    const range = { s: { r: 0, c: 0 }, e: { r: 1, c: 1 } };
    
    const parser = new XlsxParser();
    const data = parser._extractSheetData(worksheet, range);
    
    runner.assertEqual(data[0][0].type, 's', '字符串类型正确');
    runner.assertEqual(data[1][1].type, 'n', '数字类型正确');
  });

  // 运行所有测试
  return await runner.run();
}

// 如果直接运行此文件
if (typeof window === 'undefined') {
  runXlsxParserTests().then(result => {
    process.exit(result.failed > 0 ? 1 : 0);
  });
}
