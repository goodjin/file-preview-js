# WordParser 实现文档

## 1. 概述

WordParser是文件预览系统的核心组件之一，用于解析Word文档（DOCX格式）。它使用ZIPParser解压DOCX文件，然后使用DOMParser解析内部的XML文档，提取文本、样式、图片、表格等内容。

## 2. 设计目标

- **完全自研**：不依赖任何第三方库（如mammoth.js）
- **功能完整**：支持文本提取、样式处理、图片提取、表格解析
- **性能优化**：大文件处理时使用分块加载
- **兼容性好**：支持主流浏览器

## 3. DOCX文件格式

### 3.1 DOCX文件结构

DOCX是Office Open XML格式，本质上是ZIP压缩包，内部包含多个XML文件：

```
DOCX文件（ZIP格式）
├── [Content_Types].xml          # 内容类型定义
├── _rels/
│   └── .rels                     # 包级关系
├── word/
│   ├── document.xml              # 主文档内容
│   ├── styles.xml                # 样式定义
│   ├── _rels/
│   │   └── document.xml.rels    # 文档关系
│   ├── media/                    # 嵌入的图片
│   ├── header1.xml               # 页眉
│   └── footer1.xml               # 页脚
└── docProps/
    ├── core.xml                  # 核心属性
    └── app.xml                   # 应用程序属性
```

### 3.2 Office Open XML命名空间

主要命名空间：
- `w` (WordprocessingML): `http://schemas.openxmlformats.org/wordprocessingml/2006/main`
- `r` (Relationships): `http://schemas.openxmlformats.org/package/2006/relationships`
- `ct` (Content Types): `http://schemas.openxmlformats.org/package/2006/content-types`

### 3.3 word/document.xml结构

主文档包含以下主要元素：

```xml
<w:document>
  <w:body>
    <w:p>                          <!-- 段落 -->
      <w:pPr>                      <!-- 段落属性 -->
        <w:jc w:val="both"/>       <!-- 对齐方式 -->
      </w:pPr>
      <w:r>                        <!-- 文本运行 -->
        <w:rPr>                    <!-- Run属性 -->
          <w:b/>                   <!-- 粗体 -->
          <w:sz w:val="24"/>       <!-- 字体大小（半点） -->
          <w:color w:val="FF0000"/><!-- 颜色 -->
        </w:rPr>
        <w:t>文本内容</w:t>        <!-- 文本 -->
      </w:r>
    </w:p>
    <w:tbl>                        <!-- 表格 -->
      <w:tr>                       <!-- 行 -->
        <w:tc>单元格</w:tc>        <!-- 单元格 -->
      </w:tr>
    </w:tbl>
  </w:body>
</w:document>
```

## 4. 实现细节

### 4.1 解析流程

1. **验证文件格式**：使用ZIPParser验证DOCX格式
2. **解压ZIP文件**：使用ZIPParser解压DOCX
3. **解析主文档**：解析word/document.xml提取内容
4. **解析样式**：解析word/styles.xml获取样式定义
5. **提取图片**：解析关系文件，提取嵌入的图片

### 4.2 文本提取

文本提取的核心是遍历`w:p`（段落）元素：

```javascript
const paragraphs = xmlDoc.getElementsByTagName('w:p');
for (const paragraph of paragraphs) {
  const paraData = this.parseParagraph(paragraph);
  if (paraData) {
    content.push(paraData);
  }
}
```

每个段落包含多个`w:r`（Run），每个Run包含`w:t`（文本）元素。

### 4.3 样式处理

V1.0.0支持的基本样式：

| 样式 | XML元素 | CSS对应 |
|------|---------|---------|
| 粗体 | `<w:b/>` | `font-weight: bold` |
| 斜体 | `<w:i/>` | `font-style: italic` |
| 下划线 | `<w:u w:val="single"/>` | `text-decoration: underline` |
| 字体大小 | `<w:sz w:val="24"/>` | `font-size: 12pt` |
| 字体颜色 | `<w:color w:val="FF0000"/>` | `color: #FF0000` |
| 字体 | `<w:rFonts w:ascii="Arial"/>` | `font-family: Arial` |
| 对齐方式 | `<w:jc w:val="center"/>` | `text-align: center` |

**注意**：
- Word的字体大小单位是"半点"（half-point），24对应12pt
- Word的颜色是6位十六进制数（不带#前缀）
- 对齐方式值：left、right、center、both（justify）

### 4.4 表格解析

表格通过查找`w:tbl`元素识别：

```javascript
const table = this.findTableElement(paragraphElement);
if (table) {
  return this.parseTable(table);
}
```

表格结构：
- `w:tbl` - 表格
- `w:tr` - 行
- `w:tc` - 单元格

### 4.5 图片提取

图片提取步骤：

1. **解析关系文件**：`word/_rels/document.xml.rels`
2. **查找图片关系**：Type包含`/image`的Relationship
3. **读取图片数据**：根据Target路径读取media文件夹中的图片
4. **转换为Base64**：生成data URL用于显示

示例关系文件：

```xml
<Relationships xmlns="...">
  <Relationship Id="rId1" 
               Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" 
               Target="media/image1.png"/>
</Relationships>
```

### 4.6 样式继承

Word支持样式继承（BasedOn），V1.0.0简化处理，只提取样式定义，不解析继承关系。

## 5. API接口

### 5.1 parse(fileData)

解析Word文档。

**参数**：
- `fileData` (ArrayBuffer): DOCX文件二进制数据

**返回值**：
- Promise<Object>: 解析结果
  ```javascript
  {
    type: 'word',
    format: 'DOCX',
    content: [
      {
        type: 'paragraph',
        text: '段落文本',
        runs: [
          {
            text: '文本片段',
            styles: {
              bold: true,
              italic: false,
              fontSize: 12,
              color: '#FF0000'
            }
          }
        ],
        styles: {
          align: 'left'
        }
      }
    ],
    styles: {
      'Normal': { type: 'paragraph', name: 'Normal' },
      'Heading1': { type: 'paragraph', name: 'Heading1' }
    },
    images: [
      {
        id: 'rId1',
        data: 'data:image/png;base64,iVBORw0KG...',
        mimeType: 'image/png',
        originalPath: 'media/image1.png'
      }
    ],
    metadata: { /* ZIP文件元数据 */ }
  }
  ```

**示例**：
```javascript
const parser = new WordParser();
const result = await parser.parse(fileData);
console.log(result.content);
```

### 5.2 validate(fileData)

验证Word文档格式。

**参数**：
- `fileData` (ArrayBuffer): DOCX文件二进制数据

**返回值**：
- Promise<boolean>: 是否为有效的DOCX文件

### 5.3 getMetadata(fileData)

获取Word文档的元数据。

**参数**：
- `fileData` (ArrayBuffer): DOCX文件二进制数据

**返回值**：
- Promise<Object>: 元数据

## 6. 使用示例

### 6.1 基本使用

```javascript
import WordParser from './src/parsers/WordParser.js';

// 创建解析器实例
const parser = new WordParser();

// 解析DOCX文件
const arrayBuffer = await fetch('document.docx').then(r => r.arrayBuffer());
const result = await parser.parse(arrayBuffer);

// 输出文本内容
result.content.forEach(para => {
  console.log(para.text);
});

// 输出图片
result.images.forEach(img => {
  console.log(`图片: ${img.mimeType}, 大小: ${img.data.length}`);
});
```

### 6.2 渲染为HTML

```javascript
function renderWordToHTML(wordData) {
  const html = wordData.content.map(para => {
    if (para.type === 'paragraph') {
      const runs = para.runs.map(run => {
        const styles = [];
        if (run.styles.bold) styles.push('font-weight: bold');
        if (run.styles.italic) styles.push('font-style: italic');
        if (run.styles.fontSize) styles.push(`font-size: ${run.styles.fontSize}pt`);
        if (run.styles.color) styles.push(`color: ${run.styles.color}`);
        
        const style = styles.length > 0 ? ` style="${styles.join(';')}"` : '';
        return `<span${style}>${run.text}</span>`;
      }).join('');
      
      return `<p>${runs}</p>`;
    } else if (para.type === 'table') {
      const rows = para.rows.map(row => {
        const cells = row.cells.map(cell => `<td>${cell}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `<table>${rows}</table>`;
    }
  }).join('');

  return `<div class="word-content">${html}</div>`;
}

const result = await parser.parse(fileData);
const html = renderWordToHTML(result);
document.getElementById('preview').innerHTML = html;
```

## 7. 性能考虑

### 7.1 大文件处理

对于大Word文档（>10MB），建议：

1. 使用Web Worker在后台线程中解析
2. 显示进度条提升用户体验
3. 按需加载，不一次性渲染所有内容

### 7.2 内存优化

- 及时释放不再需要的XML文档对象
- 使用Transferable Objects传递大数据
- 避免频繁的内存分配和回收

## 8. 测试

### 8.1 单元测试

单元测试覆盖以下方面：

- ✓ 文件格式验证
- ✓ 文本提取
- ✓ 段落解析
- ✓ 表格解析
- ✓ 样式解析（粗体、斜体、大小、颜色）
- ✓ 颜色值转换
- ✓ 图片提取
- ✓ MIME类型识别

### 8.2 测试文件

建议的测试用例：

1. 纯文本文档
2. 包含多个样式的文档
3. 包含表格的文档
4. 包含图片的文档（PNG、JPEG）
5. 包含页眉页脚的文档
6. 大型文档（>10MB）
7. 包含特殊字符的文档
8. 嵌套表格

### 8.3 运行测试

```bash
npm test
```

## 9. 已知限制

### 9.1 V1.0.0限制

1. **样式简化**：只支持基础样式，不支持复杂的样式继承和样式集
2. **图片简化**：只支持图片提取，不支持图片在文档中的位置信息
3. **页眉页脚**：暂不解析页眉页脚
4. **批注修订**：不支持批注和修订标记
5. **域**：不支持Word域（如目录、索引）
6. **OLE对象**：不支持嵌入的OLE对象（如Excel表格）

### 9.2 浏览器兼容性

| 浏览器 | 最低版本 | 说明 |
|--------|----------|------|
| Chrome | 80+ | 支持DOMParser、DecompressionStream |
| Firefox | 113+ | 支持DOMParser、DecompressionStream |
| Safari | 16.4+ | 支持DOMParser、DecompressionStream |
| Edge | 80+ | 支持DOMParser、DecompressionStream |

**注意**：依赖ZIPParser的浏览器兼容性要求。

## 10. 后续优化方向

1. **样式增强**：支持更多Word样式（阴影、边框、背景色等）
2. **图片定位**：支持图片在文档中的位置和尺寸
3. **页眉页脚**：支持页眉页脚解析
4. **批注修订**：支持批注和修订标记
5. **性能优化**：使用Web Worker提升大文件处理性能
6. **增量渲染**：支持分页渲染，提升用户体验
7. **DOC格式**：支持旧版本的DOC格式（二进制格式）

## 11. Office Open XML规范参考

### 11.1 重要文档

- [Office Open XML规范](https://www.ecma-international.org/publications-and-standards/standards/ecma-376/)
- [WordprocessingML参考](https://learn.microsoft.com/en-us/office/open-xml/word-processing)

### 11.2 关键元素

| 元素 | 说明 |
|------|------|
| `w:document` | 文档根元素 |
| `w:body` | 文档主体 |
| `w:p` | 段落 |
| `w:r` | 文本运行 |
| `w:t` | 文本 |
| `w:tbl` | 表格 |
| `w:tr` | 表格行 |
| `w:tc` | 表格单元格 |
| `w:pPr` | 段落属性 |
| `w:rPr` | Run属性 |
| `w:b` | 粗体 |
| `w:i` | 斜体 |
| `w:sz` | 字体大小 |
| `w:color` | 字体颜色 |

## 12. 常见问题

### Q1: 如何处理加密的DOCX文件？

A: 当前版本不支持加密的DOCX文件。如果尝试解析加密文件，会抛出错误。

### Q2: 图片为什么是Base64格式？

A: Base64格式的data URL可以直接在HTML中使用，无需额外加载图片文件，适合纯前端预览。

### Q3: 如何处理超大文档？

A: 建议使用Web Worker在后台线程解析，并显示进度条。对于特别大的文档，可以考虑分页加载。

### Q4: 支持哪些图片格式？

A: 支持Word中常见的图片格式：PNG、JPEG、GIF、BMP、TIFF。

### Q5: 样式为什么不完整？

A: V1.0.0采用简化策略，只支持基础样式。完整样式支持需要更多的代码量和复杂度，将在后续版本中逐步完善。

## 13. 总结

WordParser实现了完整的DOCX文件解析功能，包括：
- ✓ 文本内容提取
- ✓ 基础样式解析
- ✓ 表格解析
- ✓ 图片提取
- ✓ 完整的单元测试

代码结构清晰，注释完整，符合架构设计规范。通过JSDoc提供完善的API文档，便于其他模块调用。

---

**文档版本**：v1.0  
**最后更新**：2024年1月  
**作者**：文件预览系统研发团队
