# docx子模块文档

## 概述

docx子模块负责docx格式文件的预览功能，基于mammoth.js库实现，支持大文件流式解析和HTML渲染。

## 功能特性

- **纯JavaScript实现**：无需服务端解析
- **大文件支持**：支持流式解析大文件（100MB+）
- **完整渲染**：支持文本、样式、图片、表格等元素
- **响应式布局**：自适应容器大小
- **缩放控制**：支持0.5x-3.0x缩放
- **错误处理**：完善的错误处理和警告机制

## 架构设计

```
docx/
├── index.js           # 子模块主入口（对外接口）
├── DocxParser.js      # docx解析器
├── DocxRenderer.js    # docx渲染器
└── README.md          # 本文档
```

### 组件职责

#### DocxParser.js（解析器）
- 动态加载mammoth.js库
- 解析docx文件结构
- 提取文本、样式、图片等元素
- 生成HTML中间表示
- 处理解析错误和警告

**代码行数**：~140行（限制300行）

#### DocxRenderer.js（渲染器）
- 将HTML渲染到容器
- 处理图片样式和响应式布局
- 处理表格样式和边框
- 支持缩放控制
- 支持行号显示（可选）

**代码行数**：~200行（限制350行）

#### index.js（主入口）
- 集成Parser和Renderer
- 提供统一的预览接口
- 管理子模块生命周期
- 文件信息统计（字数、字符数）

**代码行数**：~140行（限制150行）

**总代码量**：~480行（限制500行）

## 接口说明

### 对外接口

docx子模块默认导出一个单例实例，提供以下方法：

```javascript
import docxPreview from './src/implementations/office/docx/index.js';

// 解析docx文件
await docxPreview.parse(file, options);

// 渲染到容器
docxPreview.render(container, options);

// 设置缩放
docxPreview.setZoom(1.5);

// 获取缩放级别
const zoom = docxPreview.getZoom();

// 获取文件信息
const info = docxPreview.getFileInfo();

// 获取原始文本
const text = docxPreview.getRawText();

// 获取警告
const warnings = docxPreview.getWarnings();

// 获取错误
const errors = docxPreview.getErrors();

// 销毁实例
docxPreview.destroy();
```

### parse() 方法

**参数**：
- `file`: File | ArrayBuffer | Uint8Array - docx文件
- `options`: Object - 解析选项

**解析选项**：
```javascript
{
  styleMap: Array,           // 自定义样式映射
  transformDocument: Function, // 文档转换函数
  includeDefaultStyleMap: Boolean, // 是否包含默认样式
  ignoreEmptyParagraphs: Boolean  // 是否忽略空段落
}
```

**返回值**：
```javascript
{
  html: String,      // 解析后的HTML
  rawText: String,   // 原始文本
  messages: Array,   // 所有消息
  warnings: Array,   // 警告消息
  errors: Array      // 错误消息
}
```

### render() 方法

**参数**：
- `container`: HTMLElement - 渲染容器
- `options`: Object - 渲染选项

**渲染选项**：
```javascript
{
  zoom: Number,              // 缩放级别 (0.5 - 3.0)
  width: String,             // 容器宽度，默认 '100%'
  maxHeight: String,         // 最大高度，默认 'none'
  showLineNumbers: Boolean   // 是否显示行号，默认 false
}
```

**返回值**：
```javascript
{
  warnings: Array,   // 渲染警告
  errors: Array     // 渲染错误
}
```

### setZoom() 方法

**参数**：
- `level`: Number - 缩放级别，范围 0.5 - 3.0

### getZoom() 方法

**返回值**：
- `Number`: 当前缩放级别

### getFileInfo() 方法

**返回值**：
```javascript
{
  fileName: String,    // 文件名
  fileSize: Number,    // 文件大小（字节）
  fileType: String,    // 文件类型，固定为 'docx'
  wordCount: Number,   // 字数
  charCount: Number    // 字符数
}
```

### getRawText() 方法

**返回值**：
- `String`: 文档的原始文本内容

### getWarnings() 方法

**返回值**：
- `Array`: 警告消息数组

### getErrors() 方法

**返回值**：
- `Array`: 错误消息数组

### destroy() 方法

清理所有资源，销毁实例。

## 使用示例

### 基本用法

```javascript
import docxPreview from './src/implementations/office/docx/index.js';

// 1. 解析文件
const file = document.getElementById('file-input').files[0];
await docxPreview.parse(file);

// 2. 渲染到容器
const container = document.getElementById('preview-container');
docxPreview.render(container, {
  zoom: 1.0,
  width: '100%'
});

// 3. 获取文件信息
const info = docxPreview.getFileInfo();
console.log(`文件: ${info.fileName}, 字数: ${info.wordCount}`);
```

### 高级用法

```javascript
// 自定义样式映射
await docxPreview.parse(file, {
  styleMap: [
    "p[style-name='My Title'] => h1:fresh",
    "p[style-name='My Subtitle'] => h2:fresh"
  ]
});

// 渲染并显示行号
docxPreview.render(container, {
  zoom: 1.2,
  maxHeight: '800px',
  showLineNumbers: true
});

// 动态缩放
document.getElementById('zoom-in').addEventListener('click', () => {
  const currentZoom = docxPreview.getZoom();
  docxPreview.setZoom(Math.min(3.0, currentZoom + 0.1));
});

document.getElementById('zoom-out').addEventListener('click', () => {
  const currentZoom = docxPreview.getZoom();
  docxPreview.setZoom(Math.max(0.5, currentZoom - 0.1));
});

// 获取警告和错误
const warnings = docxPreview.getWarnings();
const errors = docxPreview.getErrors();

if (errors.length > 0) {
  console.error('渲染错误:', errors);
}
if (warnings.length > 0) {
  console.warn('渲染警告:', warnings);
}

// 使用完成后销毁
docxPreview.destroy();
```

### 多实例用法

如果需要同时预览多个docx文件，可以使用类创建多个实例：

```javascript
import { DocxPreview } from './src/implementations/office/docx/index.js';

const preview1 = new DocxPreview();
const preview2 = new DocxPreview();

await preview1.parse(file1);
preview1.render(container1);

await preview2.parse(file2);
preview2.render(container2);

// 使用完成后销毁
preview1.destroy();
preview2.destroy();
```

## CSS样式

docx预览使用以下CSS类，可以在外部样式表中自定义：

```css
/* 预览容器 */
.docx-preview-container {
  /* 容器样式 */
}

/* 文档包装器 */
.docx-wrapper {
  /* 文档内容样式 */
}

/* 行号 */
.line-numbers {
  /* 行号样式 */
}
```

## 依赖项

### mammoth.js
- **用途**：docx文件解析
- **版本**：1.4.0+
- **CDN地址**：`/libs/mammoth.browser.min.js`
- **动态加载**：DocxParser会在首次使用时自动加载

## 性能优化

### 流式解析
- mammoth.js支持流式解析，大文件边解析边渲染
- 自动处理大文件内存占用

### 图片懒加载
- 图片自动适配容器大小
- 使用max-width: 100%确保响应式

### 内存管理
- destroy()方法会清理所有资源
- 避免内存泄漏

## 错误处理

### 常见错误

1. **文件格式错误**
   - 错误信息：`Failed to parse docx file`
   - 原因：文件不是有效的docx格式或已损坏
   - 处理：提示用户重新上传文件

2. **库加载失败**
   - 错误信息：`Failed to load mammoth.js library`
   - 原因：mammoth.js文件路径错误或网络问题
   - 处理：检查CDN路径或网络连接

3. **容器未提供**
   - 错误信息：`Container is required`
   - 原因：render()方法未传入container参数
   - 处理：确保传入有效的DOM元素

### 错误和警告

- **警告**：解析过程中遇到的非致命问题，不影响预览
- **错误**：解析或渲染过程中的严重问题，可能影响预览效果

使用`getWarnings()`和`getErrors()`方法获取详细信息。

## 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

不支持IE11及以下版本。

## 限制

1. **复杂格式**：部分复杂docx格式可能无法完美渲染
2. **动态内容**：不支持动态字段、公式等
3. **宏**：不支持宏和VBA
4. **批注**：批注默认不显示

## 未来改进

- [ ] 支持批注显示
- [ ] 支持修订模式
- [ ] 支持更多样式格式
- [ ] 性能优化：WebWorker解析
- [ ] 搜索功能
- [ ] 导出PDF功能

## 版本历史

### v1.0.0 (2024)
- 初始版本
- 基于mammoth.js实现
- 支持基本docx预览功能
- 支持缩放控制
- 支持文件信息统计

## 参考资源

- [mammoth.js文档](https://github.com/mwilliamson/mammoth.js)
- [Office Open XML标准](https://www.ecma-international.org/publications-and-standards/standards/ecma-376/)
- [Office模块设计文档](../README.md)

## 贡献者

- Office模块负责人
- docx子模块开发者

## 许可证

遵循项目整体许可证。
