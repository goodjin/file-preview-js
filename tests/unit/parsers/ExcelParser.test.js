/**
 * Excel解析器单元测试
 */

import { ExcelParser } from '../../src/parsers/ExcelParser.js';

// 测试辅助函数：创建简单的XLSX文件
function createTestXLSX() {
  // 这里应该创建一个真实的XLSX文件用于测试
  // 由于XLSX是ZIP格式，创建较复杂，这里简化处理
  return null;
}

describe('Excel解析器测试', () => {
  
  let parser;
  
  beforeEach(() => {
    parser = new ExcelParser();
  });
  
  // 测试1: 单元格引用解析
  test('测试1: 单元格引用解析 - A1', () => {
    const result = parser.parseCellReference('A1');
    expect(result.col).toBe(0);
    expect(result.row).toBe(0);
  });
  
  test('测试2: 单元格引用解析 - Z1', () => {
    const result = parser.parseCellReference('Z1');
    expect(result.col).toBe(25);
    expect(result.row).toBe(0);
  });
  
  test('测试3: 单元格引用解析 - AA1', () => {
    const result = parser.parseCellReference('AA1');
    expect(result.col).toBe(26);
    expect(result.row).toBe(0);
  });
  
  test('测试4: 单元格引用解析 - B10', () => {
    const result = parser.parseCellReference('B10');
    expect(result.col).toBe(1);
    expect(result.row).toBe(9);
  });
  
  test('测试5: 单元格引用解析 - AB100', () => {
    const result = parser.parseCellReference('AB100');
    expect(result.col).toBe(27);
    expect(result.row).toBe(99);
  });
  
  // 测试6: XML解码
  test('测试6: XML解码', () => {
    const xmlText = '<root><item>测试</item></root>';
    const encoder = new TextEncoder();
    const data = encoder.encode(xmlText).buffer;
    
    const decoded = parser.decodeXML(data);
    expect(decoded).toContain('测试');
    expect(decoded).toContain('<root>');
  });
  
  // 测试7: 文件验证
  test('测试7: 文件验证 - 有效ZIP文件', () => {
    // ZIP签名: 0x504b0304
    const validData = new ArrayBuffer(4);
    const view = new Uint8Array(validData);
    view[0] = 0x50;
    view[1] = 0x4B;
    view[2] = 0x03;
    view[3] = 0x04;
    
    const isValid = parser.validate(validData);
    expect(isValid).toBe(true);
  });
  
  test('测试8: 文件验证 - 无效文件', () => {
    const invalidData = new ArrayBuffer(4);
    const view = new Uint8Array(invalidData);
    view[0] = 0xFF;
    view[1] = 0xFF;
    view[2] = 0xFF;
    view[3] = 0xFF;
    
    const isValid = parser.validate(invalidData);
    expect(isValid).toBe(false);
  });
  
  // 测试9: 获取元数据
  test('测试9: 获取元数据', () => {
    const testData = new ArrayBuffer(1024);
    const metadata = parser.getMetadata(testData);
    
    expect(metadata.format).toBe('XLSX');
    expect(metadata.mimeType).toContain('spreadsheetml');
    expect(metadata.size).toBe(1024);
  });
  
  // 测试10: 共享字符串解析
  test('测试10: 共享字符串解析', async () => {
    const xmlText = `
      <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        <si><t>张三</t></si>
        <si><t>李四</t></si>
        <si><t>王五</t></si>
      </sst>
    `;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(xmlText).buffer;
    
    await parser.parseSharedStrings(data);
    
    expect(parser.sharedStrings.length).toBe(3);
    expect(parser.sharedStrings[0]).toBe('张三');
    expect(parser.sharedStrings[1]).toBe('李四');
    expect(parser.sharedStrings[2]).toBe('王五');
  });
  
  // 测试11: 样式解析
  test('测试11: 样式解析', async () => {
    const xmlText = `
      <styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        <cellXfs count="2">
          <xf numFmtId="0" fontId="0" fillId="0" borderId="0" applyFont="1"/>
          <xf numFmtId="0" fontId="1" fillId="1" borderId="1" applyFont="1" applyFill="1"/>
        </cellXfs>
      </styleSheet>
    `;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(xmlText).buffer;
    
    await parser.parseStyles(data);
    
    expect(parser.styles.length).toBe(2);
    expect(parser.styles[0].applyFont).toBe(true);
    expect(parser.styles[1].applyFill).toBe(true);
  });
  
  // 测试12: 工作簿解析
  test('测试12: 工作簿解析', () => {
    const xmlText = `
      <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        <sheets>
          <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
          <sheet name="Sheet2" sheetId="2" r:id="rId2"/>
          <sheet name="数据表" sheetId="3" r:id="rId3"/>
        </sheets>
      </workbook>
    `;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(xmlText).buffer;
    
    const workbook = parser.parseWorkbook(data);
    
    expect(workbook.sheets.length).toBe(3);
    expect(workbook.sheets[0].name).toBe('Sheet1');
    expect(workbook.sheets[0].id).toBe(1);
    expect(workbook.sheets[1].fileName).toBe('sheet2.xml');
  });
  
  // 测试13: 单元格解析 - 字符串类型
  test('测试13: 单元格解析 - 字符串类型', () => {
    const xmlString = '<c r="A1" t="s"><v>0</v></c>';
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'application/xml');
    const cellElement = doc.getElementsByTagName('c')[0];
    
    // 设置共享字符串
    parser.sharedStrings = ['Hello World'];
    
    const cell = parser.parseCell(cellElement);
    
    expect(cell.ref).toBe('A1');
    expect(cell.col).toBe(0);
    expect(cell.row).toBe(0);
    expect(cell.value).toBe('Hello World');
    expect(cell.type).toBe('s');
  });
  
  // 测试14: 单元格解析 - 数字类型
  test('测试14: 单元格解析 - 数字类型', () => {
    const xmlString = '<c r="B1" t="n"><v>123.45</v></c>';
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'application/xml');
    const cellElement = doc.getElementsByTagName('c')[0];
    
    const cell = parser.parseCell(cellElement);
    
    expect(cell.ref).toBe('B1');
    expect(cell.value).toBe(123.45);
    expect(cell.type).toBe('n');
  });
  
  // 测试15: 单元格解析 - 布尔类型
  test('测试15: 单元格解析 - 布尔类型', () => {
    const xmlString = '<c r="C1" t="b"><v>1</v></c>';
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'application/xml');
    const cellElement = doc.getElementsByTagName('c')[0];
    
    const cell = parser.parseCell(cellElement);
    
    expect(cell.ref).toBe('C1');
    expect(cell.value).toBe(true);
    expect(cell.type).toBe('b');
  });
  
  // 测试16: 单元格解析 - 公式
  test('测试16: 单元格解析 - 公式', () => {
    const xmlString = '<c r="D1"><f>SUM(A1:C1)</f><v>150</v></c>';
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'application/xml');
    const cellElement = doc.getElementsByTagName('c')[0];
    
    const cell = parser.parseCell(cellElement);
    
    expect(cell.ref).toBe('D1');
    expect(cell.formula).toBe('SUM(A1:C1)');
    expect(cell.value).toBe('150');
  });
  
  // 测试17: 边界条件 - 空单元格
  test('测试17: 边界条件 - 空单元格', () => {
    const xmlString = '<c r="A1"/>';
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'application/xml');
    const cellElement = doc.getElementsByTagName('c')[0];
    
    const cell = parser.parseCell(cellElement);
    
    expect(cell.ref).toBe('A1');
    expect(cell.value).toBe(null);
  });
  
  // 测试18: 边界条件 - 无效单元格引用
  test('测试18: 边界条件 - 无效单元格引用', () => {
    const result = parser.parseCellReference('INVALID');
    
    expect(result.col).toBe(0);
    expect(result.row).toBe(0);
  });
  
  // 测试19: 工作表文件名提取
  test('测试19: 工作表文件名提取', () => {
    const fileName1 = parser.getWorksheetFileName('rId1', 0);
    const fileName2 = parser.getWorksheetFileName('rId2', 1);
    const fileName3 = parser.getWorksheetFileName('rId10', 9);
    
    expect(fileName1).toBe('sheet1.xml');
    expect(fileName2).toBe('sheet2.xml');
    expect(fileName3).toBe('sheet10.xml');
  });
  
  // 测试20: 中文文件名编码
  test('测试20: 中文XML解码', () => {
    const xmlText = '<root><name>测试数据</name><value>123.45</value></root>';
    const encoder = new TextEncoder();
    const data = encoder.encode(xmlText).buffer;
    
    const decoded = parser.decodeXML(data);
    
    expect(decoded).toContain('测试数据');
    expect(decoded).toContain('123.45');
  });
});

// 运行测试的辅助函数
export async function runExcelParserTests() {
  console.log('\n========================================');
  console.log('开始Excel解析器测试');
  console.log('========================================\n');
  
  let passed = 0;
  let failed = 0;
  
  const parser = new ExcelParser();
  
  // 测试套件1: 单元格引用解析
  console.log('📋 测试套件: 单元格引用解析');
  const cellTests = [
    { ref: 'A1', expected: { col: 0, row: 0 } },
    { ref: 'Z1', expected: { col: 25, row: 0 } },
    { ref: 'AA1', expected: { col: 26, row: 0 } },
    { ref: 'AB100', expected: { col: 27, row: 99 } },
    { ref: 'B10', expected: { col: 1, row: 9 } }
  ];
  
  for (const test of cellTests) {
    const result = parser.parseCellReference(test.ref);
    if (result.col === test.expected.col && result.row === test.expected.row) {
      console.log(`   ✅ ${test.ref} -> (${result.col}, ${result.row})`);
      passed++;
    } else {
      console.log(`   ❌ ${test.ref} -> 期望(${test.expected.col}, ${test.expected.row}), 实际(${result.col}, ${result.row})`);
      failed++;
    }
  }
  console.log('');
  
  // 测试套件2: XML解码
  console.log('📋 测试套件: XML解码');
  const testText = '<root><item>中文测试</item></root>';
  const encoder = new TextEncoder();
  const data = encoder.encode(testText).buffer;
  const decoded = parser.decodeXML(data);
  if (decoded.includes('中文测试')) {
    console.log('   ✅ 中文XML解码正确');
    passed++;
  } else {
    console.log('   ❌ 中文XML解码失败');
    failed++;
  }
  console.log('');
  
  // 测试套件3: 文件验证
  console.log('📋 测试套件: 文件验证');
  const validData = new ArrayBuffer(4);
  new Uint8Array(validData).set([0x50, 0x4B, 0x03, 0x04]);
  const invalidData = new ArrayBuffer(4);
  new Uint8Array(invalidData).set([0xFF, 0xFF, 0xFF, 0xFF]);
  
  if (parser.validate(validData)) {
    console.log('   ✅ 有效ZIP文件验证通过');
    passed++;
  } else {
    console.log('   ❌ 有效ZIP文件验证失败');
    failed++;
  }
  
  if (!parser.validate(invalidData)) {
    console.log('   ✅ 无效文件验证通过');
    passed++;
  } else {
    console.log('   ❌ 无效文件验证失败');
    failed++;
  }
  console.log('');
  
  console.log('========================================');
  console.log(`测试完成: ${passed}通过, ${failed}失败`);
  console.log('========================================\n');
  
  return { passed, failed };
}
