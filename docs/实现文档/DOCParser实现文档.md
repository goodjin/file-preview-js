# DOCParser 实现文档

## 1. 概述

DOCParser是文件预览系统的组件之一，用于解析DOC文档（.doc格式）。DOC是旧版Microsoft Word的二进制格式，基于OLE2复合文档。DOCParser使用OLE2Parser解析OLE2文档结构，然后解析FIB（File Information Block）和WordDocument流，提取文本、样式、表格等内容。

## 2. 设计目标

- **完全自研**：不依赖任何第三方库
- **功能完整**：支持文本提取、基础样式、表格解析
- **兼容性好**：支持主流浏览器
- **代码精简**：代码量不超过500行

## 3. DOC文件格式

### 3.1 OLE2复合文档结构

DOC文件是OLE2复合文档格式，结构如下：

```
DOC文件（OLE2格式）
├── Header（文件头，512字节）
├── SAT（扇区分配表）
├── Directory（目录）
└── Streams（数据流）
    ├── WordDocument - 主文档流
    ├── 1Table - 表格信息
    ├── 0Table - 字符信息
    └── Data - 其他数据
```

### 3.2 FIB（File Information Block）

FIB是DOC文件的核心数据结构，位于WordDocument流的开头：

```
偏移  长度  描述
0     2     Magic Number（0xA5EC）
2     2     版本号（0x00C5 = Word 97）
4     2     标志
...
8     4     ccpText（文本CP数量）
...
24    4     fcMin（起始位置）
28    4     fcMac（结束位置）
```

### 3.3 文本存储格式

DOC文件的文本以压缩格式存储，使用字符对（CP）表示位置。V1.0.0采用简化实现，直接提取可打印字符。

## 4. 实现细节

### 4.1 解析流程

1. **验证文件格式**：使用OLE2Parser验证DOC格式
2. **解析OLE2结构**：使用OLE2Parser解析文档结构
3. **获取WordDocument流**：从OLE2结构中提取主文档流
4. **解析FIB**：解析文件信息块
5. **提取文本**：根据FIB信息提取文本内容

### 4.2 OLE2复合文档解析

OLE2Parser作为公共工具类，提供以下功能：

- 解析文件头（Header）
- 解析扇区分配表（SAT）
- 解析目录（Directory）
- 提取流数据（Stream Data）

关键数据结构：
- **扇区**：512字节的固定大小块
- **SAT**：扇区分配表，记录扇区链接
- **SSAT**：短扇区分配表，用于小数据流
- **目录条目**：记录存储和流的信息

### 4.3 FIB解析

FIB包含DOC文件的关键信息：

```javascript
parseFIB(wordDocumentStream) {
  const view = new DataView(wordDocumentStream.buffer);
  return {
    magic: view.getUint16(0, true),      // 魔数
    version: view.getUint16(2, true),    // 版本号
    flags: view.getUint16(4, true),      // 标志
    ccpText: view.getUint32(8 + 0x008, true), // 文本CP数量
    fcMin: view.getUint32(8 + 0x018, true),   // 起始位置
    fcMac: view.getUint32(8 + 0x01C, true)    // 结束位置
  };
}
```

### 4.4 文本提取

V1.0.0采用简化实现：

```javascript
extractText(wordDocumentStream) {
  // 跳过FIB（约68字节）
  let offset = 1024;
  for (let i = offset; i < length; i++) {
    const byte = view.getUint8(i);
    // 处理可打印ASCII字符
    if (byte >= 0x20 && byte <= 0x7E) {
      text += String.fromCharCode(byte);
    }
    // 处理GBK编码的中文
    else if (byte >= 0xC0) {
      // GBK双字节字符
    }
  }
}
```

**注意**：真实的DOC文本提取需要根据FIB中的fcMin和fcMac精确定位文本区域，并处理字符压缩格式。V1.0.0采用简化实现。

### 4.5 版本识别

根据FIB中的版本号识别Word版本：

| 版本号 | Word版本 |
|--------|----------|
| 0x00C5 | Word 97 |
| 0x00C6 | Word 2000 |
| 0x00C7 | Word 2002/2003 |
| 0x00C8 | Word 2007 |

## 5. API接口

### 5.1 parse(fileData)

解析DOC文档。

**参数**：
- `fileData` (ArrayBuffer): DOC文件二进制数据

**返回值**：
- Promise<Object>: 解析结果
  ```javascript
  {
    type: 'word',
    format: 'DOC',
    content: [
      {
        type: 'paragraph',
        text: '文档文本内容',
        runs: [{ text: '文档文本内容', styles: {} }],
        styles: {}
      }
    ],
    metadata: {
      format: 'DOC',
      version: 'Word 97',
      magic: '0xA5EC',
      flags: '0x0006'
    }
  }
  ```

**示例**：
```javascript
const parser = new DOCParser();
const result = await parser.parse(fileData);
console.log(result.content);
```

### 5.2 validate(fileData)

验证DOC文档格式。

**参数**：
- `fileData` (ArrayBuffer): DOC文件二进制数据

**返回值**：
- Promise<boolean>: 是否为有效的DOC文件

### 5.3 getMetadata(fileData)

获取DOC文档的元数据。

**参数**：
- `fileData` (ArrayBuffer): DOC文件二进制数据

**返回值**：
- Promise<Object>: 元数据

## 6. 使用示例

### 6.1 基本使用

```javascript
import DOCParser from './src/parsers/DOCParser.js';

// 创建解析器实例
const parser = new DOCParser();

// 解析DOC文件
const arrayBuffer = await fetch('document.doc').then(r => r.arrayBuffer());
const result = await parser.parse(arrayBuffer);

// 输出文本内容
result.content.forEach(para => {
  if (para.type === 'paragraph') {
    console.log(para.text);
  }
});

// 输出元数据
console.log('Word版本:', result.metadata.version);
```

### 6.2 渲染为HTML

```javascript
function renderDOCToHTML(docData) {
  const html = docData.content.map(para => {
    if (para.type === 'paragraph') {
      return `<p>${para.text}</p>`;
    }
    return '';
  }).join('');

  return `<div class="doc-content">${html}</div>`;
}

const result = await parser.parse(fileData);
const html = renderDOCToHTML(result);
document.getElementById('preview').innerHTML = html;
```

## 7. 性能考虑

### 7.1 大文件处理

对于大DOC文档，建议：

1. 使用Web Worker在后台线程中解析
2. 显示进度条提升用户体验
3. 限制文本提取的长度

### 7.2 内存优化

- 及时释放不再需要的OLE2结构
- 避免一次性加载整个文档到内存

## 8. 测试

### 8.1 单元测试

单元测试覆盖以下方面：

- ✓ 文件格式验证
- ✓ FIB解析
- ✓ 文本提取
- ✓ 版本识别
- ✓ GBK解码
- ✓ 元数据提取

### 8.2 测试文件

建议的测试用例：

1. 纯文本文档
2. 包含中文的文档
3. Word 97文档
4. Word 2000文档
5. 包含表格的文档
6. 大型文档（>5MB）

### 8.3 运行测试

```bash
npm test
```

## 9. 已知限制

### 9.1 V1.0.0限制

1. **文本提取简化**：V1.0.0采用简化的文本提取算法，可能无法精确提取所有文本
2. **样式支持有限**：只支持基础样式，不支持复杂的格式
3. **表格支持有限**：暂不支持表格解析
4. **图片不支持**：暂不支持图片提取
5. **版本兼容性**：主要支持Word 97-2007，旧版本支持有限
6. **编码处理**：GBK编码处理简化，可能无法处理所有字符

### 9.2 浏览器兼容性

| 浏览器 | 最低版本 | 说明 |
|--------|----------|------|
| Chrome | 80+ | 支持DataView、ArrayBuffer |
| Firefox | 113+ | 支持DataView、ArrayBuffer |
| Safari | 16.4+ | 支持DataView、ArrayBuffer |
| Edge | 80+ | 支持DataView、ArrayBuffer |

**注意**：纯二进制解析，不依赖特殊API。

## 10. 与其他解析器的对比

| 特性 | DOCParser | WordParser | WPSParser |
|------|-----------|------------|-----------|
| 基础依赖 | OLE2Parser | ZIPParser | ZIPParser |
| 文件格式 | DOC（二进制） | DOCX（XML） | WPS（XML） |
| 解析复杂度 | 高 | 中 | 中 |
| 文本提取 | 简化实现 | 完整实现 | 完整实现 |
| 样式支持 | 基础 | 较完整 | 基础 |
| 图片支持 | 不支持 | 支持 | 支持 |
| 表格支持 | 不支持 | 支持 | 支持 |
| 代码量 | ~180行 | ~500行 | ~350行 |

## 11. 后续优化方向

1. **完整FIB解析**：支持完整的FIB解析，精确定位文本区域
2. **字符压缩格式**：支持DOC的字符压缩格式（8-bit和16-bit）
3. **样式解析**：解析样式表和段落格式
4. **表格解析**：支持表格结构解析
5. **图片提取**：支持嵌入图片的提取
6. **版本兼容**：增强对不同Word版本的支持

## 12. 常见问题

### Q1: DOC和DOCX有什么区别？

A: DOC是旧版Word的二进制格式，基于OLE2复合文档；DOCX是新版Word的XML格式，基于ZIP压缩。DOC格式更复杂，解析难度更高。

### Q2: 为什么文本提取是简化的？

A: DOC的文本存储采用复杂的字符压缩格式，完整实现需要大量的代码和复杂的逻辑。V1.0.0采用简化实现以满足代码量和开发时间的限制。

### Q3: 支持哪些Word版本？

A: 当前版本主要支持Word 97-2007，对于旧版本（Word 95及以下）的支持有限。

### Q4: 为什么需要OLE2Parser？

A: DOC和PPT都是基于OLE2复合文档格式，OLE2Parser作为公共工具类可以被DOC和PPT解析器复用，避免重复代码。

### Q5: 中文显示为什么可能不正确？

A: DOC文件使用GBK编码存储中文，V1.0.0的GBK解码是简化的，可能无法正确处理所有字符。完整实现需要完整的GBK编码表。

## 13. 总结

DOCParser实现了基础的DOC文档解析功能，包括：
- ✓ OLE2复合文档结构解析（通过OLE2Parser）
- ✓ FIB（File Information Block）解析
- ✓ 基础文本提取
- ✓ Word版本识别
- ✓ GBK编码的中文处理（简化版）

代码结构清晰，注释完整，符合架构设计规范。由于DOC格式的复杂性，V1.0.0采用简化实现，满足基本需求。后续版本可以逐步完善更多功能。

---

**文档版本**：v1.0  
**最后更新**：2024年1月  
**作者**：文件预览系统研发团队
