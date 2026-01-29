/**
 * XlsxRenderer 单元测试
 */

import { XlsxRenderer } from '../XlsxRenderer.js';

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
    console.log('开始运行 XlsxRenderer 测试...\n');
    
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

// 创建模拟DOM环境
function createMockContainer() {
  const div = {
    innerHTML: '',
    className: '',
    querySelector: function(selector) {
      if (selector === '.xlsx-table-container') {
        return this._tableContainer;
      }
      return null;
    },
    querySelectorAll: function(selector) {
      if (selector === '.sheet-tab') {
        return this._tabs || [];
      }
      return [];
    },
    appendChild: function(child) {
      if (child.className === 'xlsx-table-container') {
        this._tableContainer = child;
      } else if (child.className === 'xlsx-sheet-tabs') {
        this._tabsContainer = child;
      }
    }
  };
  return div;
}

// 创建模拟DOM元素
function createMockElement(tagName, className, textContent) {
  return {
    tagName: tagName,
    className: className,
    textContent: textContent || '',
    style: {},
    onclick: null,
    rowSpan: 1,
    colSpan: 1
  };
}

// 覆盖document.createElement
const originalCreateElement = document.createElement;
document.createElement = function(tagName) {
  return createMockElement(tagName.toUpperCase(), '');
};

// 创建模拟解析结果
function createMockParseResult() {
  return {
    sheets: [
      {
        name: 'Sheet1',
        data: [
          [
            { value: '姓名', type: 's', style: { font: { bold: true } } },
            { value: '年龄', type: 's' },
            { value: '城市', type: 's' }
          ],
          [
            { value: '张三', type: 's' },
            { value: 25, type: 'n' },
            { value: '北京', type: 's' }
          ]
        ],
        mergedCells: [],
        rowCount: 2,
        colCount: 3
      },
      {
        name: 'Sheet2',
        data: [
          [
            { value: '产品', type: 's' },
            { value: '价格', type: 's' }
          ],
          [
            { value: '手机', type: 's' },
            { value: 5999, type: 'n' }
          ]
        ],
        mergedCells: [],
        rowCount: 2,
        colCount: 2
      }
    ],
    currentSheetIndex: 0,
    sheetCount: 2
  };
}

// 测试主函数
export async function runXlsxRendererTests() {
  const runner = new TestRunner();

  // 测试1: 渲染器初始化
  runner.test('渲染器应该正确初始化', () => {
    const renderer = new XlsxRenderer();
    runner.assertNotNull(renderer, '渲染器实例不能为空');
    runner.assertEqual(typeof renderer.init, 'function', 'init方法存在');
    runner.assertEqual(typeof renderer.render, 'function', 'render方法存在');
    runner.assertEqual(typeof renderer.switchSheet, 'function', 'switchSheet方法存在');
  });

  // 测试2: 初始化解析结果
  runner.test('应该正确初始化解析结果', () => {
    const renderer = new XlsxRenderer();
    const parseResult = createMockParseResult();
    
    renderer.init(parseResult);
    
    runner.assertEqual(renderer.currentSheetIndex, 0, '当前工作表索引应该为0');
    runner.assertNotNull(renderer.parseResult, '解析结果已保存');
    runner.assertEqual(renderer.parseResult.sheetCount, 2, '工作表数量正确');
  });

  // 测试3: 创建工作表标签
  runner.test('应该正确创建工作表标签', () => {
    const renderer = new XlsxRenderer();
    const parseResult = createMockParseResult();
    renderer.init(parseResult);
    
    const tabsContainer = renderer._createSheetTabs();
    
    runner.assertEqual(tabsContainer.className, 'xlsx-sheet-tabs', '标签容器类名正确');
    runner.assertTrue(tabsContainer.childNodes.length > 0, '应该有标签元素');
  });

  // 测试4: 创建表格容器
  runner.test('应该正确创建表格容器', () => {
    const renderer = new XlsxRenderer();
    const tableContainer = renderer._createTableContainer();
    
    runner.assertEqual(tableContainer.className, 'xlsx-table-container', '表格容器类名正确');
  });

  // 测试5: 创建表格
  runner.test('应该正确创建表格元素', () => {
    const renderer = new XlsxRenderer();
    const parseResult = createMockParseResult();
    const sheet = parseResult.sheets[0];
    
    const table = renderer._createTable(sheet);
    
    runner.assertEqual(table.className, 'xlsx-table', '表格类名正确');
    runner.assertTrue(table.childNodes.length > 0, '应该有行元素');
  });

  // 测试6: 检查合并单元格
  runner.test('应该正确检查合并单元格', () => {
    const renderer = new XlsxRenderer();
    const mergedCells = [
      { startRow: 0, startCol: 0, endRow: 1, endCol: 1 }
    ];
    
    const isMerged1 = renderer._checkMergedCell(0, 0, mergedCells);
    const isMerged2 = renderer._checkMergedCell(2, 2, mergedCells);
    
    runner.assertTrue(isMerged1, '合并范围内的单元格应该被识别');
    runner.assertFalse(isMerged2, '合并范围外的单元格不应该被识别');
  });

  // 测试7: 应用单元格样式
  runner.test('应该正确应用单元格样式', () => {
    const renderer = new XlsxRenderer();
    const cellEl = createMockElement('TD', '');
    const style = {
      font: { name: 'Arial', sz: 12, bold: true, color: 'FF0000' },
      fill: { color: 'FFFF00' },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true }
    };
    
    renderer._applyCellStyle(cellEl, style);
    
    runner.assertEqual(cellEl.style.fontFamily, 'Arial', '字体系列正确');
    runner.assertEqual(cellEl.style.fontSize, '12pt', '字体大小正确');
    runner.assertEqual(cellEl.style.fontWeight, 'bold', '粗体正确');
    runner.assertEqual(cellEl.style.color, '#FF0000', '字体颜色正确');
    runner.assertEqual(cellEl.style.backgroundColor, '#FFFF00', '背景颜色正确');
    runner.assertEqual(cellEl.style.textAlign, 'center', '水平对齐正确');
    runner.assertEqual(cellEl.style.verticalAlign, 'middle', '垂直对齐正确');
  });

  // 测试8: 切换工作表
  runner.test('应该正确切换工作表', () => {
    const renderer = new XlsxRenderer();
    const parseResult = createMockParseResult();
    renderer.init(parseResult);
    renderer.container = createMockContainer();
    renderer._renderCurrentSheet();
    
    renderer.switchSheet(1);
    
    runner.assertEqual(renderer.currentSheetIndex, 1, '工作表索引已更新');
  });

  // 测试9: 获取当前工作表索引
  runner.test('应该正确获取当前工作表索引', () => {
    const renderer = new XlsxRenderer();
    const parseResult = createMockParseResult();
    renderer.init(parseResult);
    
    const index = renderer.getCurrentSheetIndex();
    
    runner.assertEqual(index, 0, '初始索引为0');
  });

  // 测试10: 获取工作表数量
  runner.test('应该正确获取工作表数量', () => {
    const renderer = new XlsxRenderer();
    const parseResult = createMockParseResult();
    renderer.init(parseResult);
    
    const count = renderer.getSheetCount();
    
    runner.assertEqual(count, 2, '工作表数量正确');
  });

  // 测试11: 销毁渲染器
  runner.test('应该正确销毁渲染器资源', () => {
    const renderer = new XlsxRenderer();
    renderer.container = createMockContainer();
    renderer.parseResult = createMockParseResult();
    
    renderer.destroy();
    
    runner.assertEqual(renderer.container, null, '容器已清空');
    runner.assertEqual(renderer.parseResult, null, '解析结果已清空');
  });

  // 测试12: 处理超出范围的工作表索引
  runner.test('应该正确处理超出范围的工作表索引', () => {
    const renderer = new XlsxRenderer();
    const parseResult = createMockParseResult();
    renderer.init(parseResult);
    
    const initialIndex = renderer.currentSheetIndex;
    renderer.switchSheet(10); // 超出范围
    
    runner.assertEqual(renderer.currentSheetIndex, initialIndex, '索引应该不变');
  });

  // 测试13: 处理负数工作表索引
  runner.test('应该正确处理负数工作表索引', () => {
    const renderer = new XlsxRenderer();
    const parseResult = createMockParseResult();
    renderer.init(parseResult);
    
    const initialIndex = renderer.currentSheetIndex;
    renderer.switchSheet(-1); // 负数
    
    runner.assertEqual(renderer.currentSheetIndex, initialIndex, '索引应该不变');
  });

  // 恢复document.createElement
  document.createElement = originalCreateElement;

  // 运行所有测试
  return await runner.run();
}

// 如果直接运行此文件
if (typeof window === 'undefined') {
  runXlsxRendererTests().then(result => {
    process.exit(result.failed > 0 ? 1 : 0);
  });
}
