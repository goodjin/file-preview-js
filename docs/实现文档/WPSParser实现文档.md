# WPSParser 实现文档

## 1. 概述

WPSParser是文件预览系统的组件之一，用于解析WPS文档（.wps格式）。WPS文档本质上是压缩的XML格式，与DOCX结构相似。WPSParser使用ZIPParser解压WPS文件，然后使用DOMParser解析内部的XML文档，提取文本、样式、图片、表格等内容。

## 2. 设计目标

- **完全自研**：不依赖任何第三方库
- **功能完整**：支持文本提取、样式处理、图片提取、表格解析
- **兼容性好**：支持主流浏览器
- **代码精简**：代码量不超过500行

## 3. WPS文件格式

### 3.1 WPS文件结构

WPS文档是压缩包格式，内部包含多个XML文件：

```
WPS文件（ZIP格式）
├── document.xml              # 主文档内容
├── styles.xml                # 样式定义
├── media/                    # 嵌入的图片
│   ├── image1.png
│   └── image2.jpg
└── [其他XML文件]
```

### 3.2 WPS XML结构

WPS文档的XML结构与DOCX相似，但命名空间和元素命名可能有所不同：

```xml
<document xmlns:w="http://www.wps.cn/office/word">
  <body>
    <p>                          <!-- 段落 -->
      <t>文本内容</t>            <!-- 文本 -->
    </p>
    <table>                      <!-- 表格 -->
      <row>                       <!-- 行 -->
        <cell>单元格</cell>       <!-- 单元格 -->
      </row>
    </table>
  </body>
</document>
```

**注意**：WPS的XML结构可能因版本不同而有所差异，因此实现采用了多种元素的兼容性处理。

## 4. 实现细节

### 4.1 解析流程

1. **验证文件格式**：使用ZIPParser验证WPS格式
2. **解压ZIP文件**：使用ZIPParser解压WPS
3. **解析主文档**：尝试多个可能的文档路径
4. **解析样式**：解析styles.xml获取样式定义
5. **提取图片**：遍历文件列表，提取图片文件

### 4.2 文本提取

由于WPS的XML结构可能有多种变体，实现了多路径尝试：

```javascript
const possiblePaths = ['document.xml', 'doc.xml', 'content.xml'];
for (const path of possiblePaths) {
  try {
    xmlContent = await this.zipParser.readFile(path);
    if (xmlContent) break;
  } catch (error) {
    continue;
  }
}
```

### 4.3 段落解析

段落解析支持多种元素命名空间：

```javascript
const paragraphSelectors = [
  'w\\:p', 'p', 'text\\:p', 'draw\\:p', 'wp\\:p'
];
```

### 4.4 表格解析

表格解析支持多种元素命名：
- `row` / `tr` - 行
- `cell` / `td` / `tc` - 单元格

### 4.5 图片提取

图片提取采用遍历文件列表的方式：

```javascript
for (const file of files) {
  if (this.isImageFile(file.name)) {
    const imageData = await this.zipParser.readFile(file.name);
    // 转换为Base64
  }
}
```

支持识别的图片格式：PNG、JPEG、GIF、BMP、TIFF、WEBP

## 5. API接口

### 5.1 parse(fileData)

解析WPS文档。

**参数**：
- `fileData` (ArrayBuffer): WPS文件二进制数据

**返回值**：
- Promise<Object>: 解析结果
  ```javascript
  {
    type: 'wps',
    format: 'WPS',
    content: [
      {
        type: 'paragraph',
        text: '段落文本',
        runs: [
          {
            text: '文本片段',
            styles: {}
          }
        ],
        styles: {
          align: 'left'
        }
      }
    ],
    styles: {
      'Normal': {
        name: 'Normal',
        attributes: { /* 样式属性 */ }
      }
    },
    images: [
      {
        id: 'image1.png',
        name: 'image1.png',
        data: 'data:image/png;base64,iVBORw0KG...',
        mimeType: 'image/png'
      }
    ],
    metadata: { /* ZIP文件元数据 */ }
  }
  ```

**示例**：
```javascript
const parser = new WPSParser();
const result = await parser.parse(fileData);
console.log(result.content);
```

### 5.2 validate(fileData)

验证WPS文档格式。

**参数**：
- `fileData` (ArrayBuffer): WPS文件二进制数据

**返回值**：
- Promise<boolean>: 是否为有效的WPS文件

### 5.3 getMetadata(fileData)

获取WPS文档的元数据。

**参数**：
- `fileData` (ArrayBuffer): WPS文件二进制数据

**返回值**：
- Promise<Object>: 元数据

## 6. 使用示例

### 6.1 基本使用

```javascript
import WPSParser from './src/parsers/WPSParser.js';

// 创建解析器实例
const parser = new WPSParser();

// 解析WPS文件
const arrayBuffer = await fetch('document.wps').then(r => r.arrayBuffer());
const result = await parser.parse(arrayBuffer);

// 输出文本内容
result.content.forEach(item => {
  if (item.type === 'paragraph') {
    console.log(item.text);
  }
});

// 输出图片
result.images.forEach(img => {
  console.log(`图片: ${img.name}, 大小: ${img.data.length}`);
});
```

### 6.2 渲染为HTML

```javascript
function renderWPSToHTML(wpsData) {
  const html = wpsData.content.map(item => {
    if (item.type === 'paragraph') {
      return `<p>${item.text}</p>`;
    } else if (item.type === 'table') {
      const rows = item.rows.map(row => {
        const cells = row.cells.map(cell => `<td>${cell}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `<table>${rows}</table>`;
    }
    return '';
  }).join('');

  return `<div class="wps-content">${html}</div>`;
}

const result = await parser.parse(fileData);
const html = renderWPSToHTML(result);
document.getElementById('preview').innerHTML = html;
```

## 7. 性能考虑

### 7.1 大文件处理

对于大WPS文档，建议：

1. 使用Web Worker在后台线程中解析
2. 显示进度条提升用户体验
3. 按需加载，不一次性渲染所有内容

### 7.2 内存优化

- 及时释放不再需要的XML文档对象
- 避免频繁的内存分配和回收

## 8. 测试

### 8.1 单元测试

单元测试覆盖以下方面：

- ✓ 文件格式验证
- ✓ 文本提取
- ✓ 段落解析
- ✓ 表格解析
- ✓ 样式解析
- ✓ 图片提取
- ✓ 文件类型识别
- ✓ MIME类型识别
- ✓ Base64转换
- ✓ 样式属性提取

### 8.2 测试文件

建议的测试用例：

1. 纯文本文档
2. 包含样式的文档
3. 包含表格的文档
4. 包含图片的文档
5. 大型文档（>10MB）
6. 包含特殊字符的文档
7. 不同版本的WPS文档

### 8.3 运行测试

```bash
npm test
```

## 9. 已知限制

### 9.1 V1.0.0限制

1. **样式简化**：只支持基础样式提取，不解析复杂的样式继承
2. **XML结构兼容性**：由于WPS版本的多样性，可能无法识别某些特殊结构的XML
3. **图片定位**：只支持图片提取，不支持图片在文档中的位置信息
4. **页眉页脚**：暂不解析页眉页脚
5. **批注修订**：不支持批注和修订标记

### 9.2 浏览器兼容性

| 浏览器 | 最低版本 | 说明 |
|--------|----------|------|
| Chrome | 80+ | 支持DOMParser、DecompressionStream |
| Firefox | 113+ | 支持DOMParser、DecompressionStream |
| Safari | 16.4+ | 支持DOMParser、DecompressionStream |
| Edge | 80+ | 支持DOMParser、DecompressionStream |

**注意**：依赖ZIPParser的浏览器兼容性要求。

## 10. 与WordParser的对比

| 特性 | WPSParser | WordParser |
|------|-----------|------------|
| 基础依赖 | ZIPParser + DOMParser | ZIPParser + DOMParser |
| 文件格式 | WPS（压缩XML） | DOCX（压缩XML） |
| XML结构 | 多种变体，兼容性处理 | 标准Office Open XML |
| 样式支持 | 基础样式 | 较完整的样式 |
| 表格支持 | 支持 | 支持 |
| 图片支持 | 支持（遍历文件） | 支持（关系文件） |
| 代码量 | ~350行 | ~500行 |

## 11. 后续优化方向

1. **样式增强**：支持更多WPS样式特性
2. **图片定位**：支持图片在文档中的位置和尺寸
3. **版本兼容**：支持更多WPS版本的XML结构
4. **性能优化**：使用Web Worker提升大文件处理性能
5. **错误处理**：增强错误提示和异常处理

## 12. 常见问题

### Q1: WPS和DOCX有什么区别？

A: WPS和DOCX都是压缩的XML格式，但WPS使用的是金山软件的私有格式，XML结构和命名空间与Office Open XML有所不同。WPSParser采用了多路径尝试和多种元素命名空间的兼容性处理。

### Q2: 为什么采用遍历文件列表提取图片？

A: WPS的图片关系文件格式与DOCX不同，为了简化实现和提高兼容性，采用了遍历文件列表的方式识别和提取图片文件。

### Q3: 为什么需要尝试多个文档路径？

A: 不同版本的WPS文档，主文档的文件名可能不同（document.xml、doc.xml、content.xml等），因此需要尝试多个可能的路径。

### Q4: 支持哪些WPS版本？

A: 当前版本主要支持较新的WPS版本（WPS Office 2019+），对于旧版本的支持可能有限。

### Q5: 样式为什么不完整？

A: V1.0.0采用简化策略，只支持基础样式。WPS的样式定义与DOCX有差异，完整的样式支持需要更多代码量和复杂度，将在后续版本中逐步完善。

## 13. 总结

WPSParser实现了完整的WPS文档解析功能，包括：
- ✓ 文本内容提取
- ✓ 段落解析
- ✓ 表格解析
- ✓ 样式定义解析
- ✓ 图片提取
- ✓ 多种XML结构兼容性处理

代码结构清晰，注释完整，符合架构设计规范。由于WPS版本的多样性，采用了多路径尝试和多种元素命名空间的兼容性处理，提高了解析的成功率。

---

**文档版本**：v1.0  
**最后更新**：2024年1月  
**作者**：文件预览系统研发团队
