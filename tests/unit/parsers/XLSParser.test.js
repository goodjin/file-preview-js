/**
 * XLS解析器单元测试
 */

import { XLSParser } from '../../src/parsers/XLSParser.js';

// 测试辅助函数
function createMockOLE2File() {
  // 简化处理，实际测试需要真实的XLS文件
  return null;
}

describe('XLS解析器测试', () => {
  
  let parser;
  
  beforeEach(() => {
    parser = new XLSParser();
  });
  
  // 测试1: BIFF版本检测
  test('测试1: BIFF2版本检测', () => {
    const streamData = new Uint8Array([0x09, 0x00]);
    const version = parser.detectBIFFVersion(streamData);
    
    expect(version).toBe('BIFF2');
  });
  
  test('测试2: BIFF3版本检测', () => {
    const streamData = new Uint8Array([0x09, 0x02]);
    const version = parser.detectBIFFVersion(streamData);
    
    expect(version).toBe('BIFF3');
  });
  
  test('测试3: BIFF8版本检测', () => {
    const streamData = new Uint8Array([0x09, 0x04]);
    const version = parser.detectBIFFVersion(streamData);
    
    expect(version).toBe('BIFF8');
  });
  
  // 测试4: BIFF记录解析
  test('测试4: BOF记录解析', () => {
    const streamData = new Uint8Array([0x09, 0x00, 0x10, 0x00]);
    const record = parser.parseBIFFRecord(streamData, 0);
    
    expect(record.id).toBe(0x09);
    expect(record.length).toBe(4);
  });
  
  // 测试5: INTEGER记录解析
  test('测试5: INTEGER记录解析', () => {
    const recordData = new Uint8Array([0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x64, 0x00]);
    const value = parser.readInteger(recordData, 0);
    
    expect(value).toBe(100);
  });
  
  // 测试6: 整数类型检查
  test('测试6: 有符号整数', () => {
    const recordData = new Uint8Array([0x01, 0x01, 0xFF, 0xFF]);
    const value = parser.readInteger(recordData, 0);
    
    expect(value).toBe(-65535);
  });
  
  // 测试7: 无符号整数
  test('测试7: 无符号整数', () => {
    const recordData = new Uint8Array([0x00, 0x01, 0xFF, 0xFF]);
    const value = parser.readInteger(recordData, 0);
    
    expect(value).toBe(65535);
  });
  
  // 测试8: NUMBER记录解析
  test('测试8: NUMBER记录解析', () => {
    const recordData = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    const view = new DataView(recordData.buffer);
    view.setFloat64(0, 123.456, true);
    
    const value = parser.readNumber(recordData, 0);
    expect(value).toBeCloseTo(123.456, 3);
  });
  
  // 测试9: RK记录解析
  test('测试9: RK记录解析 - Int100', () => {
    const recordData = new Uint8Array([0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x10, 0x27]);
    const value = parser.readRK(recordData, 0);
    
    expect(value).toBe(1000);
  });
  
  test('测试10: RK记录解析 - Int16', () => {
    const recordData = new Uint8Array([0x00, 0x00, 0x00, 0x02, 0x00, 0x10, 0x27]);
    const value = parser.readRK(recordData, 0);
    
    expect(value).toBe(1000);
  });
  
  // 测试11: RK记录解析 - 分数
  test('测试11: RK记录解析 - 分数', () => {
    const recordData = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x10, 0x27]);
    const value = parser.readRK(recordData, 0);
    
    expect(value).toBeCloseTo(0.1, 2);
  });
  
  // 测试12: LABEL记录解析
  test('测试12: LABEL记录解析', () => {
    const recordData = new Uint8Array([0x05, 0x00, 0x48, 0x65, 0x6C, 0x6C, 0x6F]);
    const value = parser.readLabel(recordData, 0);
    
    expect(value).toBe('Hello');
  });
  
  // 测试13: 空LABEL记录
  test('测试13: 空LABEL记录', () => {
    const recordData = new Uint8Array([0x00, 0x00]);
    const value = parser.readLabel(recordData, 0);
    
    expect(value).toBe('');
  });
  
  // 测试14: 16位整数读取
  test('测试14: 16位整数读取', () => {
    const data = new Uint8Array([0x01, 0x00, 0xFF, 0xFF]);
    const value = parser.readUInt16(data, 0);
    
    expect(value).toBe(65535);
  });
  
  // 测试15: 32位整数读取
  test('测试15: 32位整数读取', () => {
    const data = new Uint8Array([0x01, 0x00, 0x00, 0x00]);
    const value = parser.readUInt32(data, 0);
    
    expect(value).toBe(1);
  });
  
  // 测试16: BOUNDSHEET记录解析
  test('测试16: BOUNDSHEET记录解析', () => {
    const recordData = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x05, 0x00, 0x0A, 0x00, 0x0A, 0x00]);
    
    const worksheet = parser.createWorksheet();
    parser.parseBoundsheet(recordData, worksheet);
    
    expect(worksheet.bounds.col).toBe(0);
    expect(worksheet.bounds.top).toBe(1);
    expect(worksheet.bounds.bottom).toBe(10);
    expect(worksheet.bounds.right).toBe(10);
  });
  
  // 测试17: 文件验证
  test('测试17: 文件验证 - 有效XLS', () => {
    const fileData = new ArrayBuffer(512);
    const view = new Uint8Array(fileData);
    
    // OLE2签名
    const ole2Signature = [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1];
    
    for (let i = 0; i < 8; i++) {
      view[i] = ole2Signature[i];
    }
    
    const isValid = parser.validate(fileData);
    expect(isValid).toBe(true);
  });
  
  test('测试18: 文件验证 - 无效文件', () => {
    const fileData = new ArrayBuffer(512);
    const view = new Uint8Array(fileData);
    
    // 无效签名
    view[0] = 0xFF;
    
    const isValid = parser.validate(fileData);
    expect(isValid).toBe(false);
  });
  
  // 测试19: 工作表创建
  test('测试19: 工作表创建', () => {
    const worksheet = parser.createWorksheet();
    
    expect(worksheet.name).toBe('Sheet');
    expect(worksheet.bounds).toBeDefined();
    expect(worksheet.rows).toEqual([]);
  });
  
  // 测试20: 获取元数据
  test('测试20: 获取元数据', () => {
    const testData = new ArrayBuffer(1024);
    const metadata = parser.getMetadata(testData);
    
    expect(metadata.format).toBe('XLS');
    expect(metadata.mimeType).toContain('excel');
    expect(metadata.size).toBe(1024);
  });
});

// 运行测试的辅助函数
export async function runXLSParserTests() {
  console.log('\n========================================');
  console.log('开始XLS解析器测试');
  console.log('========================================\n');
  
  const parser = new XLSParser();
  let passed = 0;
  let failed = 0;
  
  // 测试套件1: BIFF版本检测
  console.log('📋 测试套件: BIFF版本检测');
  const biffTests = [
    { version: 'BIFF2', data: [0x09, 0x00] },
    { version: 'BIFF3', data: [0x09, 0x02] },
    { version: 'BIFF4', data: [0x09, 0x04] },
    { version: 'BIFF5', data: [0x09, 0x08] },
    { version: 'BIFF8', data: [0x09, 0x04, 0x00, 0x00] }
  ];
  
  for (const test of biffTests) {
    const version = parser.detectBIFFVersion(new Uint8Array(test.data));
    if (version === test.version) {
      console.log(`   ✅ ${test.version}`);
      passed++;
    } else {
      console.log(`   ❌ 期望${test.version}, 实际${version}`);
      failed++;
    }
  }
  console.log('');
  
  // 测试套件2: 整数类型
  console.log('📋 测试套件: 整数类型');
  const intTests = [
    { data: [0x00, 0x01, 0x64, 0x00], expected: 100, signed: false, desc: '无符号100' },
    { data: [0x01, 0x01, 0xFF, 0xFF], expected: -65535, signed: true, desc: '有符号-65535' }
  ];
  
  for (const test of intTests) {
    const value = parser.readInteger(new Uint8Array(test.data), 0);
    if (value === test.expected) {
      console.log(`   ✅ ${test.desc}`);
      passed++;
    } else {
      console.log(`   ❌ ${test.desc}: 期望${test.expected}, 实际${value}`);
      failed++;
    }
  }
  console.log('');
  
  // 测试套件3: 文件验证
  console.log('📋 测试套件: 文件验证');
  const ole2Signature = [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1];
  const validFile = new ArrayBuffer(512);
  new Uint8Array(validFile).set(ole2Signature);
  
  if (parser.validate(validFile)) {
    console.log('   ✅ 有效XLS文件验证通过');
    passed++;
  } else {
    console.log('   ❌ 有效XLS文件验证失败');
    failed++;
  }
  
  const invalidFile = new ArrayBuffer(512);
  new Uint8Array(invalidFile)[0] = 0xFF;
  
  if (!parser.validate(invalidFile)) {
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
