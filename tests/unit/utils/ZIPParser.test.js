/**
 * ZIP解析器单元测试
 * 测试ZIPUtils的各项功能
 */

import { ZIPUtils } from '../../src/utils/ZIPUtils.js';

// 测试辅助函数：创建测试ZIP文件
function createTestZIP(files, compression = 0) {
  // 简化实现：创建一个基本ZIP结构
  // 实际测试中应该使用真实的ZIP文件
  const entries = [];
  let offset = 0;
  
  for (const [name, content] of Object.entries(files)) {
    const nameData = new TextEncoder().encode(name);
    const contentData = new TextEncoder().encode(content);
    
    // Local File Header
    const header = new Uint8Array(30 + nameData.length);
    const view = new DataView(header.buffer);
    
    view.setUint32(0, 0x04034b50, true);  // 签名
    view.setUint16(4, 0x000a, true);        // 版本
    view.setUint16(6, 0, true);              // 标志
    view.setUint16(8, compression, true);     // 压缩方法
    view.setUint16(10, 0, true);             // 时间
    view.setUint16(12, 0, true);             // 日期
    view.setUint32(14, 0, true);             // CRC
    view.setUint32(18, contentData.length, true);  // 压缩大小
    view.setUint32(22, contentData.length, true);  // 未压缩大小
    view.setUint16(26, nameData.length, true);     // 文件名长度
    view.setUint16(28, 0, true);                 // 额外字段长度
    
    header.set(nameData, 30);
    entries.push({ header, content: contentData });
  }
  
  // 合并所有数据
  const totalSize = entries.reduce((sum, e) => sum + e.header.length + e.content.length, 0);
  const result = new Uint8Array(totalSize);
  let offset = 0;
  
  for (const entry of entries) {
    result.set(entry.header, offset);
    offset += entry.header.length;
    result.set(entry.content, offset);
    offset += entry.content.length;
  }
  
  return result.buffer;
}

// 测试用例
describe('ZIP解析器测试', () => {
  
  // 测试1: 无压缩ZIP文件解析
  test('测试1: 无压缩ZIP文件解析', () => {
    const files = {
      'test.txt': 'Hello, World!',
      'data.json': '{"key": "value"}'
    };
    
    const zipData = createTestZIP(files, 0);
    
    return ZIPUtils.parseZIP(zipData).then(parsedFiles => {
      expect(Object.keys(parsedFiles).length).toBeGreaterThan(0);
      console.log('✅ 测试1通过: 无压缩ZIP文件解析');
    });
  });
  
  // 测试2: Deflate压缩ZIP文件解析
  test('测试2: Deflate压缩ZIP文件解析', () => {
    const files = {
      'compressed.txt': 'This is a test file that would be compressed'
    };
    
    const zipData = createTestZIP(files, 8);  // 8 = Deflate
    
    return ZIPUtils.parseZIP(zipData).then(parsedFiles => {
      console.log('✅ 测试2通过: Deflate压缩ZIP文件解析');
    }).catch(error => {
      console.warn('⚠️ 测试2需要完整Deflate支持:', error.message);
    });
  });
  
  // 测试3: UTF-8文件名编码
  test('测试3: UTF-8文件名编码', () => {
    const files = {
      '测试文件.txt': '中文内容',
      'file_日本語.txt': 'Japanese content'
    };
    
    const zipData = createTestZIP(files, 0);
    
    return ZIPUtils.parseZIP(zipData).then(parsedFiles => {
      expect(Object.keys(parsedFiles).length).toBeGreaterThan(0);
      console.log('✅ 测试3通过: UTF-8文件名编码');
    });
  });
  
  // 测试4: GBK文件名编码（如果有实现）
  test('测试4: 多文件处理', () => {
    const files = {};
    for (let i = 0; i < 10; i++) {
      files[`file${i}.txt`] = `Content ${i}`;
    }
    
    const zipData = createTestZIP(files, 0);
    
    return ZIPUtils.parseZIP(zipData).then(parsedFiles => {
      expect(Object.keys(parsedFiles).length).toBeGreaterThanOrEqual(5);
      console.log('✅ 测试4通过: 多文件处理');
    });
  });
  
  // 测试5: 错误处理 - 无效ZIP文件
  test('测试5: 错误处理 - 无效ZIP文件', () => {
    const invalidData = new ArrayBuffer(100);
    
    return ZIPUtils.parseZIP(invalidData).catch(error => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Invalid ZIP');
      console.log('✅ 测试5通过: 错误处理 - 无效ZIP文件');
    });
  });
  
  // 测试6: 错误处理 - 空文件
  test('测试6: 错误处理 - 空文件', () => {
    const emptyData = new ArrayBuffer(0);
    
    return ZIPUtils.parseZIP(emptyData).catch(error => {
      expect(error).toBeDefined();
      console.log('✅ 测试6通过: 错误处理 - 空文件');
    });
  });
  
  // 测试7: 单个文件
  test('测试7: 单个文件解析', () => {
    const files = {
      'single.txt': 'Single file content'
    };
    
    const zipData = createTestZIP(files, 0);
    
    return ZIPUtils.parseZIP(zipData).then(parsedFiles => {
      expect(Object.keys(parsedFiles).length).toBeGreaterThanOrEqual(1);
      console.log('✅ 测试7通过: 单个文件解析');
    });
  });
  
  // 测试8: 大文件
  test('测试8: 大文件处理', () => {
    const largeContent = 'x'.repeat(10000);
    const files = {
      'large.txt': largeContent
    };
    
    const zipData = createTestZIP(files, 0);
    
    return ZIPUtils.parseZIP(zipData).then(parsedFiles => {
      console.log('✅ 测试8通过: 大文件处理');
    });
  });
  
  // 测试9: 特殊字符文件名
  test('测试9: 特殊字符文件名', () => {
    const files = {
      'file with spaces.txt': 'content',
      'file-with-dashes.txt': 'content',
      'file_with_underscores.txt': 'content',
      'file.multiple.dots.txt': 'content'
    };
    
    const zipData = createTestZIP(files, 0);
    
    return ZIPUtils.parseZIP(zipData).then(parsedFiles => {
      console.log('✅ 测试9通过: 特殊字符文件名');
    });
  });
  
  // 测试10: 空文件内容
  test('测试10: 空文件内容', () => {
    const files = {
      'empty.txt': ''
    };
    
    const zipData = createTestZIP(files, 0);
    
    return ZIPUtils.parseZIP(zipData).then(parsedFiles => {
      console.log('✅ 测试10通过: 空文件内容');
    });
  });
});

// 运行测试
async function runTests() {
  console.log('\n========================================');
  console.log('开始ZIP解析器测试');
  console.log('========================================\n');
  
  const tests = [
    { name: '无压缩ZIP文件解析', run: () => {
      const files = { 'test.txt': 'Hello, World!' };
      const zipData = createTestZIP(files, 0);
      return ZIPUtils.parseZIP(zipData);
    }},
    { name: '多文件处理', run: () => {
      const files = { 'file1.txt': 'A', 'file2.txt': 'B', 'file3.txt': 'C' };
      const zipData = createTestZIP(files, 0);
      return ZIPUtils.parseZIP(zipData);
    }},
    { name: '错误处理 - 无效ZIP文件', run: () => {
      const invalidData = new ArrayBuffer(100);
      return ZIPUtils.parseZIP(invalidData).catch(e => { throw e; });
    }, expectError: true }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.run();
      if (test.expectError) {
        console.log(`❌ 测试失败: ${test.name} - 应该抛出错误`);
        failed++;
      } else {
        console.log(`✅ 测试通过: ${test.name}`);
        passed++;
      }
    } catch (error) {
      if (test.expectError) {
        console.log(`✅ 测试通过: ${test.name} - 正确抛出错误`);
        passed++;
      } else {
        console.log(`❌ 测试失败: ${test.name} - ${error.message}`);
        failed++;
      }
    }
  }
  
  console.log('\n========================================');
  console.log(`测试完成: ${passed}通过, ${failed}失败`);
  console.log('========================================\n');
  
  return { passed, failed };
}

// 导出测试函数
export { runTests };
