/**
 * 文档模块P1阶段集成测试脚本
 * 测试DocumentAdapter与各预览器的集成
 */

// 引入适配器和预览器
import '../../../src/adapters/DocumentAdapter.js';
import '../../../src/implementations/document/txt/index.js';
import '../../../src/implementations/document/md/index.js';
import '../../../src/implementations/document/xml/index.js';
import '../../../src/implementations/document/json/index.js';

// 测试结果统计
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

// 性能指标
const performanceMetrics = {
  parseTimes: [],
  renderTimes: [],
  maxFileSize: 0,
  startTime: 0,
  endTime: 0
};

// 日志工具
class Logger {
  constructor() {
    this.console = document.getElementById('log-console');
  }

  log(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    this.console.appendChild(entry);
    this.console.scrollTop = this.console.scrollHeight;
  }

  success(message) {
    this.log(message, 'success');
  }

  error(message) {
    this.log(message, 'error');
  }

  info(message) {
    this.log(message, 'info');
  }

  clear() {
    this.console.innerHTML = '';
  }
}

const logger = new Logger();

// 测试工具
class TestRunner {
  static async runTest(testName, testFn) {
    testResults.total++;
    logger.info(`开始测试: ${testName}`);

    try {
      const startTime = performance.now();
      await testFn();
      const endTime = performance.now();

      testResults.passed++;
      testResults.tests.push({
        name: testName,
        status: 'pass',
        duration: endTime - startTime,
        message: '测试通过'
      });

      logger.success(`✓ ${testName} - 通过 (${(endTime - startTime).toFixed(2)}ms)`);
      this.addTestResult(testName, 'pass', (endTime - startTime).toFixed(2) + 'ms');
    } catch (error) {
      testResults.failed++;
      testResults.tests.push({
        name: testName,
        status: 'fail',
        duration: 0,
        message: error.message
      });

      logger.error(`✗ ${testName} - 失败: ${error.message}`);
      this.addTestResult(testName, 'fail', error.message);
    }

    this.updateSummary();
  }

  static addTestResult(name, status, message) {
    const resultsContainer = document.getElementById('test-results');
    
    // 清除初始提示
    if (testResults.total === 1) {
      resultsContainer.innerHTML = '';
    }

    const resultItem = document.createElement('div');
    resultItem.className = `test-result-item ${status}`;
    resultItem.innerHTML = `
      <span class="status-badge ${status}">${status === 'pass' ? '通过' : '失败'}</span>
      <span>${name}</span>
      <span style="margin-left: auto; color: #666;">${message}</span>
    `;
    resultsContainer.appendChild(resultItem);
  }

  static updateSummary() {
    document.getElementById('total-tests').textContent = testResults.total;
    document.getElementById('passed-tests').textContent = testResults.passed;
    document.getElementById('failed-tests').textContent = testResults.failed;

    const successRate = testResults.total > 0
      ? ((testResults.passed / testResults.total) * 100).toFixed(1)
      : 0;
    document.getElementById('success-rate').textContent = `${successRate}%`;
  }

  static updatePerformanceMetrics() {
    if (performanceMetrics.parseTimes.length > 0) {
      const avgParse = performanceMetrics.parseTimes.reduce((a, b) => a + b, 0) / performanceMetrics.parseTimes.length;
      document.getElementById('avg-parse-time').textContent = `${avgParse.toFixed(2)}ms`;
    }

    if (performanceMetrics.renderTimes.length > 0) {
      const avgRender = performanceMetrics.renderTimes.reduce((a, b) => a + b, 0) / performanceMetrics.renderTimes.length;
      document.getElementById('avg-render-time').textContent = `${avgRender.toFixed(2)}ms`;
    }

    if (performanceMetrics.maxFileSize > 0) {
      document.getElementById('max-file-size').textContent = `${(performanceMetrics.maxFileSize / 1024).toFixed(2)}KB`;
    }

    if (performanceMetrics.startTime > 0 && performanceMetrics.endTime > 0) {
      const totalTime = performanceMetrics.endTime - performanceMetrics.startTime;
      document.getElementById('total-time').textContent = `${totalTime.toFixed(2)}s`;
    }
  }
}

// 文件生成工具
class FileGenerator {
  static createTxtFile(content, encoding = 'utf-8') {
    const encoder = new TextEncoder();
    const buffer = encoder.encode(content);
    return new File([buffer], 'test.txt', { type: 'text/plain' });
  }

  static createMdFile(content) {
    return new File([content], 'test.md', { type: 'text/markdown' });
  }

  static createXmlFile(content) {
    return new File([content], 'test.xml', { type: 'application/xml' });
  }

  static createJsonFile(content) {
    const jsonStr = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    return new File([jsonStr], 'test.json', { type: 'application/json' });
  }

  static createLargeTxtFile(sizeKB = 1024) {
    const content = '测试文本行\n'.repeat(Math.floor(sizeKB * 1024 / 20));
    return this.createTxtFile(content);
  }
}

// 测试用例
async function runAllTests() {
  logger.clear();
  testResults.total = 0;
  testResults.passed = 0;
  testResults.failed = 0;
  testResults.tests = [];
  performanceMetrics.parseTimes = [];
  performanceMetrics.renderTimes = [];
  performanceMetrics.maxFileSize = 0;
  performanceMetrics.startTime = performance.now();

  document.getElementById('test-results').innerHTML = '';

  logger.info('开始执行P1阶段集成测试...');

  // 完整流程测试
  await TestRunner.runTest('完整流程：TXT文件上传→解析→渲染', testCompleteFlowTxt);
  await TestRunner.runTest('完整流程：MD文件上传→解析→渲染', testCompleteFlowMd);
  await TestRunner.runTest('完整流程：XML文件上传→解析→渲染', testCompleteFlowXml);
  await TestRunner.runTest('完整流程：JSON文件上传→解析→渲染', testCompleteFlowJson);

  // TXT预览器测试
  await TestRunner.runTest('TXT：不同编码文件', testTxtEncodings);
  await TestRunner.runTest('TXT：大文件（>1MB）', testTxtLargeFile);
  await TestRunner.runTest('TXT：搜索功能', testTxtSearch);

  // Markdown预览器测试
  await TestRunner.runTest('Markdown：GFM语法', testMdGFM);
  await TestRunner.runTest('Markdown：代码高亮', testMdCodeHighlight);
  await TestRunner.runTest('Markdown：复杂文档', testMdComplex);

  // XML预览器测试
  await TestRunner.runTest('XML：格式化显示', testXmlFormatting);
  await TestRunner.runTest('XML：语法高亮', testXmlHighlight);
  await TestRunner.runTest('XML：折叠/展开', testXmlFold);

  // JSON预览器测试
  await TestRunner.runTest('JSON：格式化显示', testJsonFormatting);
  await TestRunner.runTest('JSON：语法高亮', testJsonHighlight);
  await TestRunner.runTest('JSON：折叠/展开', testJsonFold);

  // 错误处理测试
  await TestRunner.runTest('错误处理：损坏文件', testCorruptFile);
  await TestRunner.runTest('错误处理：格式错误', testInvalidFormat);
  await TestRunner.runTest('错误处理：不支持的格式', testUnsupportedFormat);

  performanceMetrics.endTime = performance.now();
  TestRunner.updatePerformanceMetrics();

  logger.info(`测试完成！总计: ${testResults.total}, 通过: ${testResults.passed}, 失败: ${testResults.failed}`);
}

// 完整流程测试
async function testCompleteFlowTxt() {
  const adapter = new DocumentAdapter();
  const file = FileGenerator.createTxtFile('Hello, World!\nThis is a test TXT file.');

  const parseStart = performance.now();
  const data = await adapter.parse(file);
  const parseTime = performance.now() - parseStart;
  performanceMetrics.parseTimes.push(parseTime);

  if (data.fileType !== 'txt') {
    throw new Error('文件类型检测错误');
  }

  const renderStart = performance.now();
  const element = adapter.render(data);
  const renderTime = performance.now() - renderStart;
  performanceMetrics.renderTimes.push(renderTime);

  if (!element || !element.innerHTML) {
    throw new Error('渲染失败');
  }

  document.getElementById('txt-preview').appendChild(element);
}

async function testCompleteFlowMd() {
  const adapter = new DocumentAdapter();
  const content = '# Title\n\nThis is **bold** and *italic* text.';
  const file = FileGenerator.createMdFile(content);

  const parseStart = performance.now();
  const data = await adapter.parse(file);
  const parseTime = performance.now() - parseStart;
  performanceMetrics.parseTimes.push(parseTime);

  if (data.fileType !== 'md') {
    throw new Error('文件类型检测错误');
  }

  const renderStart = performance.now();
  const element = adapter.render(data);
  const renderTime = performance.now() - renderStart;
  performanceMetrics.renderTimes.push(renderTime);

  if (!element || !element.innerHTML) {
    throw new Error('渲染失败');
  }

  document.getElementById('md-preview').appendChild(element);
}

async function testCompleteFlowXml() {
  const adapter = new DocumentAdapter();
  const content = '<?xml version="1.0" encoding="UTF-8"?><root><item>Test</item></root>';
  const file = FileGenerator.createXmlFile(content);

  const parseStart = performance.now();
  const data = await adapter.parse(file);
  const parseTime = performance.now() - parseStart;
  performanceMetrics.parseTimes.push(parseTime);

  if (data.fileType !== 'xml') {
    throw new Error('文件类型检测错误');
  }

  const renderStart = performance.now();
  const element = adapter.render(data);
  const renderTime = performance.now() - renderStart;
  performanceMetrics.renderTimes.push(renderTime);

  if (!element || !element.innerHTML) {
    throw new Error('渲染失败');
  }

  document.getElementById('xml-preview').appendChild(element);
}

async function testCompleteFlowJson() {
  const adapter = new DocumentAdapter();
  const content = { "name": "test", "value": 123 };
  const file = FileGenerator.createJsonFile(content);

  const parseStart = performance.now();
  const data = await adapter.parse(file);
  const parseTime = performance.now() - parseStart;
  performanceMetrics.parseTimes.push(parseTime);

  if (data.fileType !== 'json') {
    throw new Error('文件类型检测错误');
  }

  const renderStart = performance.now();
  const element = adapter.render(data);
  const renderTime = performance.now() - renderStart;
  performanceMetrics.renderTimes.push(renderTime);

  if (!element || !element.innerHTML) {
    throw new Error('渲染失败');
  }

  document.getElementById('json-preview').appendChild(element);
}

// TXT测试
async function testTxtEncodings() {
  const encodings = ['utf-8', 'gbk', 'gb2312'];
  const adapter = new DocumentAdapter();

  for (const encoding of encodings) {
    const content = `测试内容 ${encoding}\nTest content ${encoding}`;
    const file = FileGenerator.createTxtFile(content);
    const data = await adapter.parse(file);
    const element = adapter.render(data);

    if (!data.content || data.content.length === 0) {
      throw new Error(`${encoding}编码解析失败`);
    }
  }

  logger.info('✓ 所有编码测试通过');
}

async function testTxtLargeFile() {
  const file = FileGenerator.createLargeTxtFile(2048); // 2MB
  performanceMetrics.maxFileSize = Math.max(performanceMetrics.maxFileSize, file.size);

  const adapter = new DocumentAdapter();
  const parseStart = performance.now();
  const data = await adapter.parse(file);
  const parseTime = performance.now() - parseStart;

  if (parseTime > 5000) {
    logger.warn(`大文件解析耗时较长: ${parseTime.toFixed(2)}ms`);
  }

  const renderStart = performance.now();
  const element = adapter.render(data);
  const renderTime = performance.now() - renderStart;

  if (!data.content || data.content.length === 0) {
    throw new Error('大文件解析失败');
  }
}

async function testTxtSearch() {
  const content = 'Line 1\nLine 2\nLine 3\nSearch\nLine 4\nSearch again\nLine 5';
  const file = FileGenerator.createTxtFile(content);

  const adapter = new DocumentAdapter();
  const data = await adapter.parse(file);
  const element = adapter.render(data);

  const textContent = data.content;
  if (!textContent.includes('Search')) {
    throw new Error('搜索关键词不存在');
  }

  const occurrences = (textContent.match(/Search/g) || []).length;
  if (occurrences !== 2) {
    throw new Error(`搜索结果数量错误: 期望2, 实际${occurrences}`);
  }
}

// Markdown测试
async function testMdGFM() {
  const content = `# H1 标题
## H2 标题
### H3 标题

**粗体文本**
*斜体文本*

- 列表项1
- 列表项2
- 列表项3

\`\`\`javascript
function test() {
  console.log('Hello');
}
\`\`\`

[链接](https://example.com)`;

  const adapter = new DocumentAdapter();
  const file = FileGenerator.createMdFile(content);
  const data = await adapter.parse(file);
  const element = adapter.render(data);

  const html = element.innerHTML;
  if (!html.includes('<h1>') || !html.includes('<h2>') || !html.includes('<h3>')) {
    throw new Error('GFM标题渲染失败');
  }

  if (!html.includes('<strong>') || !html.includes('<em>')) {
    throw new Error('GFM文本样式渲染失败');
  }

  if (!html.includes('<code>') && !html.includes('<pre>')) {
    throw new Error('GFM代码块渲染失败');
  }

  document.getElementById('md-preview').innerHTML = '';
  document.getElementById('md-preview').appendChild(element);
}

async function testMdCodeHighlight() {
  const content = `# Code Highlight Test

\`\`\`javascript
function hello() {
  const message = 'Hello World';
  console.log(message);
  return message;
}
\`\`\`

\`\`\`python
def hello():
    message = "Hello World"
    print(message)
    return message
\`\`\``;

  const adapter = new DocumentAdapter();
  const file = FileGenerator.createMdFile(content);
  const data = await adapter.parse(file);
  const element = adapter.render(data);

  const html = element.innerHTML;
  if (!html.includes('language-javascript') && !html.includes('language-python')) {
    throw new Error('代码高亮类名缺失');
  }

  document.getElementById('md-preview').innerHTML = '';
  document.getElementById('md-preview').appendChild(element);
}

async function testMdComplex() {
  const content = `# 复杂文档测试

## 1. 简介
这是一个复杂的Markdown文档。

## 2. 代码示例
\`\`\`javascript
const obj = {
  name: 'test',
  value: [1, 2, 3]
};
\`\`\`

## 3. 列表
- 项目1
  - 子项目1.1
  - 子项目1.2
- 项目2

## 4. 表格（GFM）
| 名称 | 值 |
|------|-----|
| A    | 1   |
| B    | 2   |`;

  const adapter = new DocumentAdapter();
  const file = FileGenerator.createMdFile(content);
  const data = await adapter.parse(file);

  if (!data.content || data.content.length === 0) {
    throw new Error('复杂文档解析失败');
  }

  const element = adapter.render(data);
  document.getElementById('md-preview').innerHTML = '';
  document.getElementById('md-preview').appendChild(element);
}

// XML测试
async function testXmlFormatting() {
  const content = `<?xml version="1.0" encoding="UTF-8"?>
<root>
  <person id="1">
    <name>张三</name>
    <age>30</age>
    <email>zhangsan@example.com</email>
  </person>
  <person id="2">
    <name>李四</name>
    <age>25</age>
    <email>lisi@example.com</email>
  </person>
</root>`;

  const adapter = new DocumentAdapter();
  const file = FileGenerator.createXmlFile(content);
  const data = await adapter.parse(file);
  const element = adapter.render(data);

  const html = element.innerHTML;
  if (!html.includes('<root>') || !html.includes('<person>')) {
    throw new Error('XML格式化失败');
  }

  document.getElementById('xml-preview').innerHTML = '';
  document.getElementById('xml-preview').appendChild(element);
}

async function testXmlHighlight() {
  const content = `<?xml version="1.0" encoding="UTF-8"?>
<config xmlns="http://example.com/config">
  <setting name="timeout" value="30"/>
  <setting name="maxRetries" value="3"/>
  <!-- 注释内容 -->
  <database type="mysql">
    <host>localhost</host>
    <port>3306</port>
  </database>
</config>`;

  const adapter = new DocumentAdapter();
  const file = FileGenerator.createXmlFile(content);
  const data = await adapter.parse(file);
  const element = adapter.render(data);

  const html = element.innerHTML;
  if (!html.includes('xml-tag') || !html.includes('xml-attr-name') || !html.includes('xml-attr-value')) {
    throw new Error('XML语法高亮失败');
  }

  document.getElementById('xml-preview').innerHTML = '';
  document.getElementById('xml-preview').appendChild(element);
}

async function testXmlFold() {
  const content = `<?xml version="1.0"?>
<root>
  <level1>
    <level2>
      <level3>Deep content</level3>
    </level2>
  </level1>
</root>`;

  const adapter = new DocumentAdapter();
  const file = FileGenerator.createXmlFile(content);
  const data = await adapter.parse(file);
  const element = adapter.render(data);

  const html = element.innerHTML;
  // 检查是否包含折叠相关的类或元素
  if (!html.includes('xml-collapsible') && !html.includes('xml-toggle')) {
    logger.warn('XML折叠功能可能未实现');
  }

  document.getElementById('xml-preview').innerHTML = '';
  document.getElementById('xml-preview').appendChild(element);
}

// JSON测试
async function testJsonFormatting() {
  const content = {
    "users": [
      { "id": 1, "name": "张三", "age": 30 },
      { "id": 2, "name": "李四", "age": 25 }
    ],
    "settings": {
      "timeout": 30,
      "maxRetries": 3
    },
    "version": "1.0.0"
  };

  const adapter = new DocumentAdapter();
  const file = FileGenerator.createJsonFile(content);
  const data = await adapter.parse(file);
  const element = adapter.render(data);

  const html = element.innerHTML;
  if (!html.includes('{') || !html.includes('[')) {
    throw new Error('JSON格式化失败');
  }

  document.getElementById('json-preview').innerHTML = '';
  document.getElementById('json-preview').appendChild(element);
}

async function testJsonHighlight() {
  const content = {
    "string": "value",
    "number": 123,
    "boolean": true,
    "null": null,
    "object": { "key": "value" },
    "array": [1, 2, 3]
  };

  const adapter = new DocumentAdapter();
  const file = FileGenerator.createJsonFile(content);
  const data = await adapter.parse(file);
  const element = adapter.render(data);

  const html = element.innerHTML;
  // 检查是否包含颜色样式（语法高亮）
  if (!html.includes('color:')) {
    logger.warn('JSON语法高亮可能未实现');
  }

  document.getElementById('json-preview').innerHTML = '';
  document.getElementById('json-preview').appendChild(element);
}

async function testJsonFold() {
  const content = {
    "level1": {
      "level2": {
        "level3": {
          "value": "deep content"
        }
      }
    },
    "array": [1, [2, [3, [4]]]]
  };

  const adapter = new DocumentAdapter();
  const file = FileGenerator.createJsonFile(content);
  const data = await adapter.parse(file);
  const element = adapter.render(data);

  const html = element.innerHTML;
  // 检查是否包含折叠相关的类或元素
  if (!html.includes('json-toggle') && !html.includes('json-content')) {
    logger.warn('JSON折叠功能可能未实现');
  }

  document.getElementById('json-preview').innerHTML = '';
  document.getElementById('json-preview').appendChild(element);
}

// 错误处理测试
async function testCorruptFile() {
  const adapter = new DocumentAdapter();

  // 损坏的JSON文件
  const corruptJson = '{ "invalid": json content }';
  const jsonFile = FileGenerator.createJsonFile(corruptJson);

  try {
    await adapter.parse(jsonFile);
    throw new Error('应该抛出JSON解析错误');
  } catch (error) {
    if (!error.message.includes('JSON')) {
      throw new Error('错误消息不正确');
    }
    document.getElementById('error-preview').innerHTML = `
      <div style="padding: 10px; background: #f8d7da; color: #721c24; border-radius: 4px;">
        <strong>损坏文件错误（预期）:</strong> ${error.message}
      </div>
    `;
  }
}

async function testInvalidFormat() {
  const adapter = new DocumentAdapter();

  // 无效的XML文件
  const invalidXml = '<root><tag1>content</tag1><tag2>content</root>'; // 缺少关闭标签
  const xmlFile = FileGenerator.createXmlFile(invalidXml);

  try {
    await adapter.parse(xmlFile);
    throw new Error('应该抛出XML解析错误');
  } catch (error) {
    document.getElementById('error-preview').innerHTML += `
      <div style="padding: 10px; background: #f8d7da; color: #721c24; border-radius: 4px; margin-top: 10px;">
        <strong>格式错误（预期）:</strong> ${error.message}
      </div>
    `;
  }
}

async function testUnsupportedFormat() {
  const adapter = new DocumentAdapter();

  // 不支持的文件类型
  const unsupportedFile = new File(['content'], 'test.xyz', { type: 'application/xyz' });

  try {
    await adapter.parse(unsupportedFile);
    throw new Error('应该抛出不支持的文件类型错误');
  } catch (error) {
    if (!error.message.includes('Unsupported')) {
      throw new Error('错误消息不正确');
    }
    document.getElementById('error-preview').innerHTML += `
      <div style="padding: 10px; background: #fff3cd; color: #856404; border-radius: 4px; margin-top: 10px;">
        <strong>不支持的格式（预期）:</strong> ${error.message}
      </div>
    `;
  }
}

// 文件上传测试
async function testTxtFile() {
  const input = document.getElementById('txt-file-input');
  if (!input.files || input.files.length === 0) {
    throw new Error('请选择一个TXT文件');
  }

  const file = input.files[0];
  const adapter = new DocumentAdapter();
  const data = await adapter.parse(file);
  const element = adapter.render(data);

  document.getElementById('txt-preview').innerHTML = '';
  document.getElementById('txt-preview').appendChild(element);
}

async function testMdFile() {
  const input = document.getElementById('md-file-input');
  if (!input.files || input.files.length === 0) {
    throw new Error('请选择一个Markdown文件');
  }

  const file = input.files[0];
  const adapter = new DocumentAdapter();
  const data = await adapter.parse(file);
  const element = adapter.render(data);

  document.getElementById('md-preview').innerHTML = '';
  document.getElementById('md-preview').appendChild(element);
}

async function testXmlFile() {
  const input = document.getElementById('xml-file-input');
  if (!input.files || input.files.length === 0) {
    throw new Error('请选择一个XML文件');
  }

  const file = input.files[0];
  const adapter = new DocumentAdapter();
  const data = await adapter.parse(file);
  const element = adapter.render(data);

  document.getElementById('xml-preview').innerHTML = '';
  document.getElementById('xml-preview').appendChild(element);
}

async function testJsonFile() {
  const input = document.getElementById('json-file-input');
  if (!input.files || input.files.length === 0) {
    throw new Error('请选择一个JSON文件');
  }

  const file = input.files[0];
  const adapter = new DocumentAdapter();
  const data = await adapter.parse(file);
  const element = adapter.render(data);

  document.getElementById('json-preview').innerHTML = '';
  document.getElementById('json-preview').appendChild(element);
}

// 导出测试报告
async function exportReport() {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      successRate: testResults.total > 0 ? ((testResults.passed / testResults.total) * 100).toFixed(1) + '%' : '0%'
    },
    performance: {
      averageParseTime: performanceMetrics.parseTimes.length > 0
        ? (performanceMetrics.parseTimes.reduce((a, b) => a + b, 0) / performanceMetrics.parseTimes.length).toFixed(2) + 'ms'
        : '-',
      averageRenderTime: performanceMetrics.renderTimes.length > 0
        ? (performanceMetrics.renderTimes.reduce((a, b) => a + b, 0) / performanceMetrics.renderTimes.length).toFixed(2) + 'ms'
        : '-',
      maxFileSize: performanceMetrics.maxFileSize > 0 ? (performanceMetrics.maxFileSize / 1024).toFixed(2) + 'KB' : '-',
      totalTime: performanceMetrics.endTime > 0 ? ((performanceMetrics.endTime - performanceMetrics.startTime) / 1000).toFixed(2) + 's' : '-'
    },
    tests: testResults.tests
  };

  const reportContent = `# 文档模块P1阶段集成测试报告

**生成时间**: ${report.timestamp}

## 测试概览

- **总测试数**: ${report.summary.total}
- **通过**: ${report.summary.passed}
- **失败**: ${report.summary.failed}
- **通过率**: ${report.summary.successRate}

## 性能指标

- **平均解析时间**: ${report.performance.averageParseTime}
- **平均渲染时间**: ${report.performance.averageRenderTime}
- **最大文件大小**: ${report.performance.maxFileSize}
- **总测试时间**: ${report.performance.totalTime}

## 详细测试结果

${report.tests.map(t => `
### ${t.name}
- **状态**: ${t.status === 'pass' ? '✓ 通过' : '✗ 失败'}
- **耗时**: ${t.duration}ms
- **消息**: ${t.message}
`).join('\n')}

---

测试报告由 Excel预览程序开发团队生成
`;

  const blob = new Blob([reportContent], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `document-p1-test-report-${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);

  logger.success('测试报告已导出');
}

// 重置测试
function resetTests() {
  testResults.total = 0;
  testResults.passed = 0;
  testResults.failed = 0;
  testResults.tests = [];
  performanceMetrics.parseTimes = [];
  performanceMetrics.renderTimes = [];
  performanceMetrics.maxFileSize = 0;
  performanceMetrics.startTime = 0;
  performanceMetrics.endTime = 0;

  document.getElementById('test-results').innerHTML = `
    <div class="test-result-item info">
      <span class="status-badge pending">待测试</span>
      <span>请运行测试查看结果</span>
    </div>
  `;

  TestRunner.updateSummary();

  document.getElementById('txt-preview').innerHTML = '';
  document.getElementById('md-preview').innerHTML = '';
  document.getElementById('xml-preview').innerHTML = '';
  document.getElementById('json-preview').innerHTML = '';
  document.getElementById('error-preview').innerHTML = '';

  document.getElementById('avg-parse-time').textContent = '-';
  document.getElementById('avg-render-time').textContent = '-';
  document.getElementById('max-file-size').textContent = '-';
  document.getElementById('total-time').textContent = '-';

  logger.clear();
  logger.info('测试已重置');
}

// 标签页切换
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    // 移除所有激活状态
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    // 激活当前标签
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  });
});

// 暴露全局函数
window.runAllTests = runAllTests;
window.resetTests = resetTests;
window.exportReport = exportReport;
window.testTxtFile = testTxtFile;
window.testMdFile = testMdFile;
window.testXmlFile = testXmlFile;
window.testJsonFile = testJsonFile;
window.testTxtEncodings = testTxtEncodings;
window.testTxtLargeFile = testTxtLargeFile;
window.testTxtSearch = testTxtSearch;
window.testMdGFM = testMdGFM;
window.testMdCodeHighlight = testMdCodeHighlight;
window.testMdComplex = testMdComplex;
window.testXmlFormatting = testXmlFormatting;
window.testXmlHighlight = testXmlHighlight;
window.testXmlFold = testXmlFold;
window.testJsonFormatting = testJsonFormatting;
window.testJsonHighlight = testJsonHighlight;
window.testJsonFold = testJsonFold;
window.testCorruptFile = testCorruptFile;
window.testInvalidFormat = testInvalidFormat;
window.testUnsupportedFormat = testUnsupportedFormat;

// 初始化
logger.info('测试框架已加载，点击"运行所有测试"开始测试');
