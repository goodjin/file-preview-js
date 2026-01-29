# docx子模块单元测试文档

## 概述

本文档说明docx子模块的单元测试配置和使用方法。

## 测试框架

使用 **Jest** 作为测试框架，配置如下：

### 安装依赖

```bash
npm install --save-dev jest @jest/globals
```

### 配置文件

在项目根目录创建 `jest.config.js`：

```javascript
module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  testMatch: [
    '**/test/**/*.test.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/test/**/*.js'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

## 测试文件结构

```
docx/test/
├── DocxParser.test.js    # DocxParser单元测试
├── DocxRenderer.test.js  # DocxRenderer单元测试
├── index.test.js         # 子模块主入口单元测试
└── README.md             # 本文档
```

## 测试覆盖范围

### DocxParser.test.js

**测试内容**：
- 构造函数
- 库加载（loadLibrary）
- 文件解析（parse）
  - File对象输入
  - ArrayBuffer输入
  - Uint8Array输入
  - 错误处理
  - 消息过滤
- 获取解析数据（getParsedData）
- 清理数据（clear）

**测试用例数**：12个

### DocxRenderer.test.js

**测试内容**：
- 构造函数
- 渲染（render）
  - 基本渲染
  - 自定义选项（缩放、宽度、高度、行号）
  - 错误处理
- 缩放控制（setZoom, getZoom）
- 更新渲染（update）
- 清空渲染（clear）
- 获取HTML（getRenderedHTML）
- 图片处理
- 表格处理
- 段落处理

**测试用例数**：20个

### index.test.js

**测试内容**：
- 构造函数
- 解析（parse）
- 渲染（render）
- 重新渲染（rerender）
- 缩放控制（setZoom, getZoom）
- 文件信息（getFileInfo）
  - 文件名、大小、类型
  - 字数统计
  - 字符数统计
- 原始文本（getRawText）
- 警告和错误（getWarnings, getErrors）
- 销毁（destroy）
- 完整工作流程集成测试

**测试用例数**：18个

**总测试用例数**：50个

## 运行测试

### 运行所有测试

```bash
npm test
```

### 运行特定测试文件

```bash
npm test DocxParser.test.js
```

### 运行特定测试套件

```bash
npm test -t "DocxParser"
```

### 生成测试覆盖率报告

```bash
npm test -- --coverage
```

## 测试数据准备

### 模拟文件

测试中使用 `File` 构造函数创建模拟文件：

```javascript
const mockFile = new File(
  ['Test content'],
  'test.docx',
  {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
);
```

### 模拟mammoth.js

测试中使用 Jest 模拟 mammoth.js：

```javascript
global.mammoth = {
  convertToHtml: jest.fn(),
  extractRawText: jest.fn()
};
```

## 测试覆盖率目标

| 指标 | 目标值 |
|------|--------|
| 语句覆盖率 | ≥ 80% |
| 分支覆盖率 | ≥ 80% |
| 函数覆盖率 | ≥ 80% |
| 行覆盖率 | ≥ 80% |

## 持续集成

### GitHub Actions

创建 `.github/workflows/test.yml`：

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '14'
      - run: npm install
      - run: npm test -- --coverage
```

### GitLab CI

创建 `.gitlab-ci.yml`：

```yaml
test:
  script:
    - npm install
    - npm test -- --coverage
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
```

## 已知限制

1. **DOM依赖**：DocxRenderer测试需要 jsdom 环境
2. **异步测试**：所有异步操作需要正确使用 async/await
3. **Mock限制**：部分功能需要精细的 mock 配置

## 测试最佳实践

1. **测试独立性**：每个测试用例应该独立，不依赖其他测试
2. **使用 beforeEach**：在每个测试前重置状态
3. **清理资源**：使用 afterEach 清理创建的DOM元素
4. **模拟外部依赖**：使用 Jest mock 模拟第三方库
5. **测试边界情况**：包含正常情况和异常情况的测试

## 故障排查

### 测试失败

如果测试失败，检查以下内容：

1. 检查 jsdom 配置是否正确
2. 确认所有依赖已正确安装
3. 查看测试日志了解具体错误信息
4. 检查 mock 是否正确配置

### 覆盖率不足

如果覆盖率不足：

1. 添加缺失的测试用例
2. 确保所有分支都被测试
3. 添加错误处理测试
4. 添加边界条件测试

## 未来改进

- [ ] 添加E2E测试
- [ ] 添加性能测试
- [ ] 添加大文件解析测试
- [ ] 添加内存泄漏测试
- [ ] 添加跨浏览器兼容性测试

## 参考资源

- [Jest文档](https://jestjs.io/)
- [jsdom文档](https://github.com/jsdom/jsdom)
- [JavaScript测试最佳实践](https://github.com/goldbergyoni/javascript-testing-best-practices)

## 版本历史

### v1.0.0 (2024)
- 初始测试套件
- 50个测试用例
- 覆盖率目标80%
