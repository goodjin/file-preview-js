# docx子模块测试快速入门

## 快速开始

### 1. 安装依赖

```bash
cd src/implementations/office/docx/test
npm install
```

### 2. 运行所有测试

```bash
npm test
# 或者
node run-tests.js
```

### 3. 查看覆盖率

```bash
npm run test:coverage
# 或者
node run-tests.js --coverage
```

### 4. 运行特定测试

```bash
npm run test:parser      # 只运行Parser测试
npm run test:renderer    # 只运行Renderer测试
npm run test:index        # 只运行主入口测试
```

### 5. 监视模式

```bash
npm run test:watch
# 文件变化时自动重新运行测试
```

## 测试文件说明

### DocxParser.test.js
测试docx解析器的所有功能：
- 库加载
- 文件解析（支持多种输入格式）
- 错误处理
- 消息过滤

**运行：** `npm run test:parser`

### DocxRenderer.test.js
测试docx渲染器的所有功能：
- HTML渲染
- 缩放控制
- 图片/表格/段落处理
- 样式应用

**运行：** `npm run test:renderer`

### index.test.js
测试docx子模块主入口：
- 完整工作流程
- 文件信息统计
- 生命周期管理
- 集成测试

**运行：** `npm run test:index`

## 编写新测试

### 示例：添加一个新的测试用例

在 `DocxParser.test.js` 中添加：

```javascript
describe('新增功能测试', () => {
  test('应该处理特殊字符', async () => {
    parser.isLoaded = true;
    parser.mammoth = global.mammoth;

    const mockFile = new File(['特殊字符 < > &'], 'test.docx');
    mockFile.arrayBuffer = jest.fn(() => Promise.resolve(new ArrayBuffer(100)));

    global.mammoth.convertToHtml.mockResolvedValue({
      value: '<p>特殊字符 &lt; &gt; &amp;</p>',
      messages: []
    });

    global.mammoth.extractRawText.mockResolvedValue({
      value: '特殊字符 < > &',
      messages: []
    });

    const result = await parser.parse(mockFile);

    expect(result.html).toContain('&lt;');
    expect(result.html).toContain('&gt;');
    expect(result.html).toContain('&amp;');
  });
});
```

### 测试最佳实践

1. **使用 describe 分组**
```javascript
describe('功能名称', () => {
  test('应该做什么', () => {
    // 测试代码
  });
});
```

2. **使用 beforeEach 重置**
```javascript
beforeEach(() => {
  parser = new DocxParser();
  jest.clearAllMocks();
});
```

3. **使用 afterEach 清理**
```javascript
afterEach(() => {
  if (mockContainer.parentNode) {
    document.body.removeChild(mockContainer);
  }
});
```

4. **使用 mock 模拟外部依赖**
```javascript
jest.mock('../DocxParser.js', () => {
  return jest.fn().mockImplementation(() => ({
    parse: jest.fn().mockResolvedValue({...})
  }));
});
```

## 调试测试

### 查看详细输出

```bash
npm run test:verbose
```

### 只运行匹配的测试

```bash
npm test -t "parse"
# 运行所有名称包含"parse"的测试
```

### 在代码中添加 console.log

```javascript
test('示例测试', () => {
  console.log('调试信息');
  expect(true).toBe(true);
});
```

## 常见问题

### Q: 测试失败，提示 "Cannot find module"

A: 确保已安装所有依赖：
```bash
npm install
```

### Q: DOM相关测试失败

A: 确保 jest.config.js 中设置了 `testEnvironment: 'jsdom'`

### Q: Mock不生效

A: 检查 mock 的位置和导入顺序，确保在使用前已经定义

### Q: 测试覆盖率不足

A: 添加更多测试用例，特别是：
- 错误处理测试
- 边界条件测试
- 分支条件测试

## 测试覆盖率目标

| 文件 | 语句 | 分支 | 函数 | 行 |
|------|------|------|------|-----|
| DocxParser.js | ≥80% | ≥80% | ≥80% | ≥80% |
| DocxRenderer.js | ≥80% | ≥80% | ≥80% | ≥80% |
| index.js | ≥80% | ≥80% | ≥80% | ≥80% |

## 持续集成

### GitHub Actions

在工作流程中添加测试步骤：

```yaml
- name: Run tests
  run: |
    cd src/implementations/office/docx/test
    npm install
    npm run test:coverage
```

## 下一步

- [ ] 阅读完整测试文档：`test/README.md`
- [ ] 查看 Jest 配置：`test/jest.config.js`
- [ ] 扩展测试用例
- [ ] 添加E2E测试
- [ ] 配置CI/CD

## 参考资源

- [Jest官方文档](https://jestjs.io/docs/getting-started)
- [jsdom文档](https://github.com/jsdom/jsdom)
- [测试最佳实践](https://github.com/goldbergyoni/javascript-testing-best-practices)
