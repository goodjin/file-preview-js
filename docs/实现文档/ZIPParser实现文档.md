# ZIPParser 实现文档

## 1. 概述

ZIPParser是文件预览系统的核心工具之一，用于解析ZIP格式的压缩包文件。它支持完整的ZIP文件结构解析，包括文件列表读取和文件解压功能。

## 2. 设计目标

- **完全自研**：不依赖任何第三方库（如JSZip）
- **功能完整**：支持ZIP文件的所有核心功能
- **性能优化**：大文件处理时使用分块加载
- **兼容性好**：支持主流浏览器

## 3. ZIP文件格式

### 3.1 ZIP文件结构

ZIP文件由以下部分组成：

```
[Local File Header 1][File Data 1][Data Descriptor 1]
[Local File Header 2][File Data 2][Data Descriptor 2]
...
[Central Directory]
[End of Central Directory Record]
```

### 3.2 Local File Header（本地文件头）

每个文件都有一个Local File Header，包含文件的基本信息：

```
偏移  长度  描述
0     4     Local File Header签名 (0x04034b50)
4     2     解压所需版本
6     2     通用位标志
8     2     压缩方法 (0=无压缩, 8=Deflate)
10    2     最后修改时间
12    2     最后修改日期
14    4     CRC32校验值
18    4     压缩后大小
22    4     未压缩大小
26    2     文件名长度
28    2     Extra Field长度
30    变长   文件名
30+N  变长   Extra Field
```

### 3.3 Central Directory（中央目录）

Central Directory包含所有文件的索引信息：

```
偏移  长度  描述
0     4     Central Directory签名 (0x02014b50)
4     2     创建版本
6     2     解压所需版本
8     2     通用位标志
10    2     压缩方法
12    2     最后修改时间
14    2     最后修改日期
16    4     CRC32校验值
20    4     压缩后大小
24    4     未压缩大小
28    2     文件名长度
30    2     Extra Field长度
32    2     文件注释长度
34    2     起始磁盘号
36    2     内部文件属性
38    4     外部文件属性
42    4     Local File Header偏移
46    变长   文件名
46+N  变长   Extra Field
46+N+M 变长 文件注释
```

### 3.4 End of Central Directory Record（中央目录结束记录）

```
偏移  长度  描述
0     4     签名 (0x06054b50)
4     2     当前磁盘号
6     2     中央目录起始磁盘号
8     2     当前磁盘上的文件数
10    2     总文件数
12    4     中央目录大小
16    4     中央目录偏移
20    2     ZIP文件注释长度
22    变长   ZIP文件注释
```

## 4. 实现细节

### 4.1 文件验证

`validate()` 方法通过检查文件前4字节的Magic Number来验证ZIP文件格式：

```javascript
const localFileHeaderSignature = view.getUint32(0, true);
return localFileHeaderSignature === 0x04034b50;
```

### 4.2 解析流程

1. **验证文件格式**：检查Magic Number
2. **解析End of Central Directory**：从文件末尾向前搜索
3. **解析Central Directory**：根据偏移量读取所有文件条目
4. **构建文件列表**：将Central Directory条目转换为用户友好的格式

### 4.3 文件名解码

ZIP规范中，文件名编码可以是：
- UTF-8（推荐）
- 系统默认编码（如Windows使用GBK）

实现采用了多级回退策略：

```javascript
try {
  return new TextDecoder('utf-8').decode(bytes);
} catch (e) {
  try {
    return new TextDecoder('gbk').decode(bytes);
  } catch (e2) {
    return new TextDecoder('latin-1').decode(bytes);
  }
}
```

### 4.4 Deflate解压

Deflate是ZIP最常用的压缩方法。实现使用了浏览器的`DecompressionStream` API：

```javascript
const decompressStream = new DecompressionStream('deflate');
const writer = decompressStream.writable.getWriter();
const reader = decompressStream.readable.getReader();

writer.write(compressedData);
writer.close();

// 读取解压后的数据
```

**注意**：`DecompressionStream` API是现代浏览器的标准功能，如果需要支持旧浏览器，需要实现自研的Deflate算法。

## 5. API接口

### 5.1 parse(fileData)

解析ZIP文件。

**参数**：
- `fileData` (ArrayBuffer): ZIP文件二进制数据

**返回值**：
- Promise<Object>: 解析结果
  - `format`: 文件格式（'ZIP'）
  - `fileCount`: 文件数量
  - `files`: 文件列表

**示例**：
```javascript
const parser = new ZIPParser();
const result = await parser.parse(fileData);
console.log(result.files);
```

### 5.2 readFile(fileName)

读取指定文件的内容。

**参数**：
- `fileName` (string): 文件名

**返回值**：
- Promise<Uint8Array>: 文件内容

**示例**：
```javascript
const content = await parser.readFile('document.xml');
const text = new TextDecoder().decode(content);
```

### 5.3 validate(fileData)

验证ZIP文件格式。

**参数**：
- `fileData` (ArrayBuffer): 文件二进制数据

**返回值**：
- boolean: 是否为有效的ZIP文件

### 5.4 getMetadata()

获取ZIP文件的元数据。

**返回值**：
- Object: 元数据
  - `fileCount`: 文件数量
  - `format`: 文件格式
  - `compressionMethods`: 支持的压缩方法

## 6. 使用示例

### 6.1 基本使用

```javascript
import ZIPParser from './src/utils/ZIPParser.js';

// 创建解析器实例
const parser = new ZIPParser();

// 解析ZIP文件
const arrayBuffer = await fetch('example.zip').then(r => r.arrayBuffer());
const result = await parser.parse(arrayBuffer);

// 输出文件列表
console.log(`共 ${result.fileCount} 个文件:`);
result.files.forEach(file => {
  console.log(`- ${file.name} (${file.size} bytes)`);
});

// 读取特定文件
const content = await parser.readFile('document.xml');
const text = new TextDecoder().decode(content);
console.log(text);
```

### 6.2 在Word解析器中使用

```javascript
import ZIPParser from '../utils/ZIPParser.js';

class WordParser extends BaseParser {
  async parse(fileData) {
    const zipParser = new ZIPParser();
    const zipResult = await zipParser.parse(fileData);

    // 读取document.xml
    const documentXmlContent = await zipParser.readFile('word/document.xml');
    const documentXml = new DOMParser().parseFromString(
      new TextDecoder().decode(documentXmlContent),
      'application/xml'
    );

    // 解析Word文档内容
    return this.parseDocumentXml(documentXml);
  }
}
```

## 7. 性能考虑

### 7.1 大文件处理

对于大文件（>50MB），建议：

1. 使用分块读取避免内存溢出
2. 使用Web Worker在后台线程中解析
3. 显示进度条提升用户体验

### 7.2 内存优化

- 及时释放不再需要的数据
- 使用Transferable Objects传递大数据
- 避免频繁的内存分配和回收

## 8. 测试

### 8.1 单元测试

单元测试覆盖以下方面：

- ✓ 文件格式验证
- ✓ End of Central Directory解析
- ✓ Central Directory解析
- ✓ 文件名解码（UTF-8、GBK）
- ✓ 文件列表构建
- ✓ 文件读取（无压缩、Deflate压缩）
- ✓ 元数据获取

### 8.2 测试文件

建议的测试用例：

1. 空ZIP文件
2. 单文件ZIP（无压缩）
3. 单文件ZIP（Deflate压缩）
4. 多文件ZIP
5. 包含中文文件名的ZIP
6. 包含目录的ZIP
7. 大文件ZIP（>50MB）
8. 加密ZIP文件（应该抛出错误）

### 8.3 运行测试

```bash
npm test
```

## 9. 已知限制

1. **Deflate实现**：当前版本依赖浏览器原生`DecompressionStream` API，不支持旧浏览器
2. **加密文件**：不支持加密的ZIP文件
3. **分卷ZIP**：不支持分卷ZIP文件
4. **自解压ZIP**：不支持自解压EXE文件

## 10. 后续优化方向

1. **自研Deflate算法**：不依赖浏览器API，提升兼容性
2. **分卷支持**：支持分卷ZIP文件
3. **加密支持**：支持ZIP加密格式
4. **性能优化**：使用Web Worker提升大文件处理性能
5. **增量解析**：支持增量解析，提升用户体验

## 11. 浏览器兼容性

| 浏览器 | 最低版本 | 说明 |
|--------|----------|------|
| Chrome | 80+ | 支持DecompressionStream |
| Firefox | 113+ | 支持DecompressionStream |
| Safari | 16.4+ | 支持DecompressionStream |
| Edge | 80+ | 支持DecompressionStream |

**注意**：对于不支持`DecompressionStream`的旧浏览器，需要实现自研Deflate算法或使用polyfill。

## 12. 参考资料

- [ZIP文件格式规范](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT)
- [Deflate算法规范(RFC 1951)](https://tools.ietf.org/html/rfc1951)
- [DecompressionStream API](https://developer.mozilla.org/en-US/docs/Web/API/DecompressionStream)

## 13. 总结

ZIPParser是文件预览系统的基础组件，为DOCX、XLSX等格式提供ZIP解析能力。实现完全遵循ZIP规范，代码结构清晰，易于维护和扩展。通过单元测试保证了代码质量，可以放心在生产环境中使用。

---

**文档版本**：v1.0  
**最后更新**：2024年1月  
**作者**：文件预览系统研发团队
