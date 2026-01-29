/**
 * XlsxModule 单元测试
 */

import { XlsxModule } from '../index.js';

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
    console.log('开始运行 XlsxModule 测试...\n');
    
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

  assertNull(value, message) {
    if (value !== null && value !== undefined) {
      throw new Error(message || '期望 null');
    }
  }

  async assertThrows(fn, message) {
    let threw = false;
    try {
      await fn();
    } catch (e) {
      threw = true;
    }
    if (!threw) {
      throw new Error(message || '期望抛出异常');
    }
  }
}

// 创建模拟DOM容器
function createMockContainer() {
  return {
    innerHTML: '',
    className: '',
    querySelector: () => null,
    querySelectorAll: () => []
  };
}

// 创建模拟File对象
function createMockFile() {
  return {
    name: 'test.xlsx',
    size: 1024,
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };
}

// 测试主函数
export async function runXlsxModuleTests() {
  const runner = new TestRunner();

  // 测试1: 模块初始化
  runner.test('模块应该正确初始化', () => {
    const module = new XlsxModule();
    runner.assertNotNull(module, '模块实例不能为空');
    runner.assertFalse(module.isLoaded, '初始状态应该未加载');
    runner.assertEqual(typeof module.load, 'function', 'load方法存在');
    runner.assertEqual(typeof module.render, 'function', 'render方法存在');
    runner.assertEqual(typeof module.switchSheet, 'function', 'switchSheet方法存在');
  });

  // 测试2: 解析器实例存在
  runner.test('应该有解析器实例', () => {
    const module = new XlsxModule();
    runner.assertNotNull(module.parser, '解析器实例存在');
    runner.assertEqual(typeof module.parser.parse, 'function', '解析器有parse方法');
  });

  // 测试3: 渲染器实例存在
  runner.test('应该有渲染器实例', () => {
    const module = new XlsxModule();
    runner.assertNotNull(module.renderer, '渲染器实例存在');
    runner.assertEqual(typeof module.renderer.render, 'function', '渲染器有render方法');
  });

  // 测试4: 未加载时调用render抛出异常
  runner.test('未加载时调用render应该抛出异常', async () => {
    const module = new XlsxModule();
    const container = createMockContainer();
    
    await runner.assertThrows(
      () => module.render(container),
      '期望抛出"请先加载xlsx文件"异常'
    );
  });

  // 测试5: 未加载时调用switchSheet抛出异常
  runner.test('未加载时调用switchSheet应该抛出异常', async () => {
    const module = new XlsxModule();
    
    await runner.assertThrows(
      () => module.switchSheet(0),
      '期望抛出"请先加载xlsx文件"异常'
    );
  });

  // 测试6: 获取当前工作表索引（未加载）
  runner.test('未加载时获取当前工作表索引应该返回0', () => {
    const module = new XlsxModule();
    const index = module.getCurrentSheetIndex();
    runner.assertEqual(index, 0, '应该返回0');
  });

  // 测试7: 获取工作表数量（未加载）
  runner.test('未加载时获取工作表数量应该返回0', () => {
    const module = new XlsxModule();
    const count = module.getSheetCount();
    runner.assertEqual(count, 0, '应该返回0');
  });

  // 测试8: 获取文件信息（未加载）
  runner.test('未加载时获取文件信息应该返回null', () => {
    const module = new XlsxModule();
    const info = module.getFileInfo();
    runner.assertNull(info, '应该返回null');
  });

  // 测试9: 销毁模块
  runner.test('应该正确销毁模块资源', () => {
    const module = new XlsxModule();
    module.parseResult = { test: 'data' };
    module.isLoaded = true;
    
    module.destroy();
    
    runner.assertFalse(module.isLoaded, 'isLoaded应该为false');
    runner.assertEqual(module.parseResult, null, 'parseResult应该被清空');
  });

  // 测试10: 模拟加载成功
  runner.test('应该能够模拟加载成功', async () => {
    const module = new XlsxModule();
    
    // 模拟解析器返回结果
    const mockParseResult = {
      sheets: [{ name: 'Sheet1', data: [], mergedCells: [] }],
      currentSheetIndex: 0,
      sheetCount: 1
    };
    
    module.parser.parse = async () => mockParseResult;
    
    await module.load(createMockFile());
    
    runner.assertTrue(module.isLoaded, 'isLoaded应该为true');
    runner.assertEqual(module.parseResult, mockParseResult, '解析结果已保存');
  });

  // 测试11: 模拟加载失败
  runner.test('应该能够处理加载失败', async () => {
    const module = new XlsxModule();
    
    // 模拟解析器抛出错误
    module.parser.parse = async () => {
      throw new Error('解析失败');
    };
    
    try {
      await module.load(createMockFile());
      throw new Error('期望load抛出异常');
    } catch (error) {
      runner.assertFalse(module.isLoaded, '加载失败后isLoaded应该为false');
    }
  });

  // 测试12: 渲染到容器（加载后）
  runner.test('加载后应该能够渲染到容器', async () => {
    const module = new XlsxModule();
    const mockParseResult = {
      sheets: [{ name: 'Sheet1', data: [], mergedCells: [] }],
      currentSheetIndex: 0,
      sheetCount: 1
    };
    
    module.parser.parse = async () => mockParseResult;
    await module.load(createMockFile());
    
    const container = createMockContainer();
    module.renderer.render = (c) => {
      c.innerHTML = '<table></table>';
    };
    
    module.render(container);
    
    runner.assertTrue(container.innerHTML.includes('table'), '容器应该包含表格');
  });

  // 测试13: 切换工作表（加载后）
  runner.test('加载后应该能够切换工作表', async () => {
    const module = new XlsxModule();
    const mockParseResult = {
      sheets: [{ name: 'Sheet1' }, { name: 'Sheet2' }],
      currentSheetIndex: 0,
      sheetCount: 2
    };
    
    module.parser.parse = async () => mockParseResult;
    await module.load(createMockFile());
    
    module.switchSheet(1);
    
    runner.assertEqual(module.renderer.currentSheetIndex, 1, '工作表索引应该更新');
  });

  // 测试14: 获取文件信息（加载后）
  runner.test('加载后应该能够获取文件信息', async () => {
    const module = new XlsxModule();
    const mockParseResult = {
      sheets: [{ name: 'Sheet1' }, { name: 'Sheet2' }],
      currentSheetIndex: 0,
      sheetCount: 2
    };
    
    module.parser.parse = async () => mockParseResult;
    await module.load(createMockFile());
    
    const info = module.getFileInfo();
    
    runner.assertNotNull(info, '文件信息不应该为null');
    runner.assertEqual(info.sheetCount, 2, '工作表数量正确');
    runner.assertEqual(info.currentSheet, 0, '当前工作表正确');
  });

  // 运行所有测试
  return await runner.run();
}

// 如果直接运行此文件
if (typeof window === 'undefined') {
  runXlsxModuleTests().then(result => {
    process.exit(result.failed > 0 ? 1 : 0);
  });
}
