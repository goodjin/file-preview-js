# WPS表格解析器实现文档

## 1. 概述

### 1.1 实现目标
开发一个纯前端的WPS表格（.ET）文件解析器，支持：
- 解析压缩的XML格式
- 提取单元格数据
- 处理共享字符串
- 支持多工作表

### 1.2 技术栈
- **语言**: JavaScript ES6+
- **解析方式**: ZIP解压 + XML解析
- **编码支持**: UTF-8
- **不依赖**: 任何第三方库

### 1.3 文件结构
```
src/parsers/ETParser.js       # 主解析器（< 500行）
tests/unit/parsers/ETParser.test.js  # 单元测试
docs/实现文档/ETParser实现文档.md   # 本文档
```

## 2. WPS表格文件格式

### 2.1 文件结构
.ET文件是ZIP压缩的XML格式，类似于XLSX：

```
example.et
├── [Content_Types].xml
├── _rels/
├── 1.xml                    # 工作簿
├── 2.xml                    # 工作表1
├── 3.xml                    # 工作表2
├── SharedStrings.xml          # 共享字符串表
└── ...
```

### 2.2 与XLSX的对比

| 特性 | XLSX | WPS表格（.ET） |
|------|------|-----------------|
| 格式 | ZIP + XML | ZIP + XML |
| 工作簿 | xl/workbook.xml | 1.xml 或 Workbook.xml |
| 工作表 | xl/worksheets/sheetN.xml | 2.xml, 3.xml, 4.xml, ... |
| 共享字符串 | xl/sharedStrings.xml | SharedStrings.xml |
| 命名规则 | sheetId + r:id | 简单数字序列（2.xml） |

## 3. 核心类设计

### 3.1 ETParser类

#### 类属性
```javascript
class ETParser {
  sharedStrings: Array<string>   // 共享字符串表
  workbook: Object              // 工作簿信息
  etFiles: Object             // ZIP解压后的文件映射
}
```

#### 主要方法

| 方法名 | 参数 | 返回值 | 说明 |
|--------|------|--------|------|
| `parse(fileData)` | ArrayBuffer | Promise<Object> | 解析.ET文件 |
| `validate(fileData)` | ArrayBuffer | boolean | 验证文件格式 |
| `getMetadata(fileData)` | ArrayBuffer | Object | 获取元数据 |
| `parseZIP(fileData)` | ArrayBuffer | Promise<void> | 解压ZIP文件 |
| `parseSharedStrings(xmlData)` | ArrayBuffer | void | 解析共享字符串 |
| `parseWorkbook(xmlData)` | ArrayBuffer | Object | 解析工作簿 |
| `parseWorksheet(xmlData)` | ArrayBuffer | Object | 解析工作表 |
| `parseCell(cellElement)` | Element | Object | 解析单元格 |
| `parseCellReference(ref)` | string | Object | 解析单元格引用 |
| `decodeXML(data)` | ArrayBuffer | string | 解码XML |

## 4. 解析流程

### 4.1 整体流程图

```
输入: .ET文件 (ArrayBuffer)
    ↓
[1] ZIP解压
    ↓
    ├─→ 1.xml / Workbook.xml  (工作簿)
    ├─→ 2.xml, 3.xml, ...     (工作表)
    ├─→ SharedStrings.xml     (共享字符串)
    └─→ 其他XML文件
            ↓
[2] 解析共享字符串
            ↓
[3] 解析工作簿
            ↓
[4] 解析工作表
            ↓
[5] 返回结构化数据
            ↓
输出: WPS表格数据对象
```

### 4.2 详细步骤

#### 步骤1: ZIP解压
```javascript
async parseZIP(fileData) {
  const zipParser = new ZIPParser();
  const zipResult = await zipParser.parse(fileData);
  
  // 转换为文件名映射
  this.etFiles = {};
  for (const fileInfo of zipResult.files) {
    const content = await zipParser.readFile(fileInfo.name);
    this.etFiles[fileInfo.name] = content.buffer;
  }
}
```

#### 步骤2: 解析共享字符串
```javascript
async parseSharedStrings(xmlData) {
  const text = this.decodeXML(xmlData);
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'application/xml');
  
  const sst = doc.getElementsByTagName('sst')[0];
  const items = doc.getElementsByTagName('si');
  
  this.sharedStrings = [];
  for (let i = 0; i < items.length; i++) {
    const textNode = items[i].getElementsByTagName('t')[0];
    this.sharedStrings.push(textNode ? textNode.textContent : '');
  }
}
```

#### 步骤3: 解析工作簿
```javascript
parseWorkbook(xmlData) {
  const text = this.decodeXML(xmlData);
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'application/xml');
  
  const sheets = [];
  const sheetElements = doc.getElementsByTagName('sheet');
  
  for (let i = 0; i < sheetElements.length; i++) {
    const sheet = sheetElements[i];
    const id = sheet.getAttribute('sheetId') || (i + 1);
    const name = sheet.getAttribute('name') || `Sheet${i + 1}`;
    const fileName = sheet.getAttribute('filename') || `${i + 2}.xml`;
    
    sheets.push({ id: parseInt(id), name, fileName });
  }
  
  return { sheets };
}
```

#### 步骤4: 解析工作表
与XLSX相同，解析行和单元格数据。

## 5. 数据结构

### 5.1 解析结果格式

```javascript
{
  type: 'wps-table',
  version: 'et',
  sheets: [
    {
      name: 'Sheet1',
      id: 1,
      data: {
        rows: [
          {
            rowNum: 1,
            cells: [
              {
                ref: 'A1',
                col: 0,
                row: 0,
                value: '张三',
                type: 's',
                formula: null
              }
            ]
          }
        ],
        dimensions: 'A1:Z100'
      }
    }
  ],
  metadata: {
    sheetCount: 2,
    hasSharedStrings: true
  }
}
```

## 6. 单元测试

### 6.1 测试覆盖

#### 单元测试（20个用例）
- ✅ 单元格引用解析（4个）
- ✅ XML解码（2个）
- ✅ 文件验证（2个）
- ✅ 元数据获取（1个）
- ✅ 共享字符串解析（2个）
- ✅ 工作簿解析（2个）
- ✅ 单元格解析（4个）
- ✅ 边界条件（2个）
- ✅ 默认值处理（1个）

### 6.2 测试运行
```javascript
import { runETParserTests } from './ETParser.test.js';

const result = await runETParserTests();
console.log(`通过: ${result.passed}, 失败: ${result.failed}`);
```

## 7. 与ExcelParser的对比

### 7.1 架构相似性

| 特性 | ExcelParser | ETParser |
|------|-------------|----------|
| 基础结构 | 相同 | 相同 |
| ZIP解压 | ZIPParser | ZIPParser |
| XML解析 | DOMParser | DOMParser |
| SharedStrings | ✅ | ✅ |
| 单元格解析 | 相同 | 相同 |
| 单元格引用 | 相同 | 相同 |

### 7.2 差异

| 差异点 | ExcelParser | ETParser |
|--------|-------------|----------|
| 工作簿文件 | xl/workbook.xml | 1.xml 或 Workbook.xml |
| 工作表文件 | xl/worksheets/sheetN.xml | 2.xml, 3.xml, ... |
| 文件命名 | 复杂（r:id） | 简单（数字序列） |

## 8. 已知限制

### 8.1 功能限制
- ⚠️ 样式解析未实现（V1.0.0）
- ⚠️ 公式计算未实现（仅显示保存的值）
- ⚠️ 合并单元格信息未提取

### 8.2 性能限制
- ⚠️ 大文件可能占用较多内存
- ⚠️ 不支持流式处理

## 9. 使用示例

### 9.1 基本使用

```javascript
import { ETParser } from './ETParser.js';

// 创建解析器实例
const parser = new ETParser();

// 读取文件
const fileInput = document.getElementById('fileInput');
const file = fileInput.files[0];
const fileData = await file.arrayBuffer();

// 解析文件
try {
  const result = await parser.parse(fileData);
  
  console.log('工作表数量:', result.sheets.length);
  
  // 遍历工作表
  for (const sheet of result.sheets) {
    console.log(`工作表: ${sheet.name}`);
    
    // 遍历行
    for (const row of sheet.data.rows) {
      for (const cell of row.cells) {
        console.log(`${cell.ref}: ${cell.value}`);
      }
    }
  }
} catch (error) {
  console.error('解析失败:', error);
}
```

## 10. 总结

### 10.1 实现成果
- ✅ 完整的WPS表格解析器
- ✅ 纯JavaScript实现，无第三方依赖
- ✅ 支持核心功能（单元格数据、共享字符串、多工作表）
- ✅ 完整的单元测试（20个用例）
- ✅ 详细的技术文档

### 10.2 代码质量
- ✅ 代码量控制（315行）
- ✅ 完整的JSDoc注释
- ✅ 清晰的模块划分
- ✅ 良好的错误处理

---

**实现日期**: 2026-02-09  
**实现人员**: 程序员（Excel解析器）  
**文档版本**: v1.0
