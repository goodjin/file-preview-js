# 适配器层 API 文档

## 概述

适配器层为文件预览系统提供统一的文件解析接口，位于核心框架层和实现层之间。适配器负责将不同格式的文件解析为统一的数据结构，供预览器使用。

### 设计原则

- **单一职责**：每个适配器只负责一类文件格式
- **统一接口**：所有适配器继承自BaseAdapter，提供统一的接口
- **纯前端**：不依赖服务端解析
- **可扩展**：易于添加新的文件类型支持

## BaseAdapter

### 简介

BaseAdapter是所有适配器的基类，定义了适配器的通用方法和接口。所有具体适配器都应该继承此类。

### 类定义

```javascript
class BaseAdapter {
  constructor()
  canHandle(fileType: string): boolean
  parse(file: File): Promise<Object>
  render(data: Object): HTMLElement|string
  getSupportedTypes(): string[]
  validateFile(file: File): boolean
  getFileExtension(fileName: string): string
}
```

### 方法

#### canHandle(fileType)

判断是否能处理该文件类型。

**参数**：
- `fileType` (string): 文件类型，如 'pdf', 'jpg' 等

**返回值**：
- (boolean): 是否支持该文件类型

**示例**：
```javascript
const adapter = new DocumentAdapter();
adapter.canHandle('pdf'); // true
adapter.canHandle('jpg'); // false
```

#### parse(file)

解析文件，返回解析后的数据。这是一个抽象方法，必须由子类实现。

**参数**：
- `file` (File): 文件对象

**返回值**：
- (Promise<Object>): 解析后的数据对象

**示例**：
```javascript
const file = new File(['Hello'], 'test.txt');
const adapter = new DocumentAdapter();
const data = await adapter.parse(file);
console.log(data); // { fileType: 'txt', content: 'Hello', ... }
```

#### render(data)

渲染数据，返回渲染结果。这是一个抽象方法，必须由子类实现。

**参数**：
- `data` (Object): 解析后的数据对象

**返回值**：
- (HTMLElement|string): 渲染结果

**示例**：
```javascript
const data = { fileType: 'txt', content: 'Hello' };
const adapter = new DocumentAdapter();
const element = adapter.render(data);
document.body.appendChild(element);
```

#### getSupportedTypes()

获取支持的文件类型列表。这是一个抽象方法，必须由子类实现。

**返回值**：
- (string[]): 支持的文件类型数组

**示例**：
```javascript
const adapter = new DocumentAdapter();
adapter.getSupportedTypes(); // ['pdf', 'txt', 'md', 'json', 'xml', 'ofd', 'rtf', 'epub']
```

#### validateFile(file)

验证文件对象是否有效。

**参数**：
- `file` (File): 文件对象

**返回值**：
- (boolean): 文件是否有效

**抛出错误**：
- 如果文件为null或undefined，抛出 'File is required' 错误
- 如果文件不是File实例，抛出 'Invalid file object' 错误

**示例**：
```javascript
const adapter = new DocumentAdapter();
const file = new File(['content'], 'test.txt');
adapter.validateFile(file); // true
adapter.validateFile(null); // 抛出错误
```

#### getFileExtension(fileName)

获取文件的扩展名。

**参数**：
- `fileName` (string): 文件名

**返回值**：
- (string): 文件扩展名（小写），如果没有扩展名则返回空字符串

**示例**：
```javascript
const adapter = new DocumentAdapter();
adapter.getFileExtension('document.pdf'); // 'pdf'
adapter.getFileExtension('data.JSON'); // 'json'
adapter.getFileExtension('Makefile'); // ''
```

## DocumentAdapter

### 简介

DocumentAdapter用于处理文本文档类文件，提供统一的文档解析接口。

### 支持的文件类型

- `pdf` - PDF文档
- `txt` - 纯文本文件
- `md` - Markdown文件
- `json` - JSON数据文件
- `xml` - XML文档
- `ofd` - OFD文档
- `rtf` - RTF文档
- `epub` - EPUB电子书

### 类定义

```javascript
class DocumentAdapter extends BaseAdapter {
  constructor()
  canHandle(fileType: string): boolean
  parse(file: File): Promise<Object>
  render(data: Object): HTMLElement
  getSupportedTypes(): string[]
}
```

### parse方法返回的数据结构

```javascript
{
  fileType: string,      // 文件类型
  fileName: string,      // 文件名
  fileSize: number,      // 文件大小（字节）
  lastModified: number,  // 最后修改时间戳
  content: string|Object|null,  // 文本内容（txt, md, json, xml）
  data: ArrayBuffer|null        // 二进制数据（pdf, ofd, rtf, epub）
}
```

### 示例

#### 解析文本文件

```javascript
const adapter = new DocumentAdapter();
const file = new File(['Hello, World!'], 'test.txt');
const data = await adapter.parse(file);
console.log(data);
// {
//   fileType: 'txt',
//   fileName: 'test.txt',
//   fileSize: 13,
//   lastModified: 1234567890,
//   content: 'Hello, World!',
//   data: null
// }
```

#### 解析JSON文件

```javascript
const adapter = new DocumentAdapter();
const file = new File(['{"name": "John", "age": 30}'], 'test.json');
const data = await adapter.parse(file);
console.log(data.content); // { name: 'John', age: 30 }
```

#### 解析PDF文件

```javascript
const adapter = new DocumentAdapter();
const file = new File([arrayBuffer], 'test.pdf');
const data = await adapter.parse(file);
console.log(data.data); // ArrayBuffer
```

### 渲染说明

- **txt文件**: 显示为纯文本，保留换行
- **md文件**: 简化版Markdown渲染，支持标题、粗体、斜体、代码
- **json文件**: 格式化JSON显示，带语法高亮
- **xml文件**: 格式化XML显示
- **pdf/ofd/rtf/epub文件**: 显示占位符，提示需要专门的预览器

## ImageAdapter

### 简介

ImageAdapter用于处理图片文件，提供统一的图片解析接口，支持缩放、旋转等操作。

### 支持的文件类型

- `jpg` / `jpeg` - JPEG图片
- `png` - PNG图片
- `gif` - GIF图片
- `bmp` - BMP图片
- `svg` - SVG图片
- `tif` / `tiff` - TIFF图片
- `webp` - WebP图片
- `psd` - Photoshop文件

### 类定义

```javascript
class ImageAdapter extends BaseAdapter {
  constructor()
  canHandle(fileType: string): boolean
  parse(file: File): Promise<Object>
  render(data: Object, options?: Object): HTMLElement
  getSupportedTypes(): string[]
  fitToContainer(data: Object, containerWidth: number, containerHeight: number): number
  fitToWidth(data: Object, containerWidth: number): number
  fitToHeight(data: Object, containerHeight: number): number
  getMetadata(data: Object): Object
}
```

### parse方法返回的数据结构

```javascript
{
  fileType: string,      // 文件类型
  fileName: string,      // 文件名
  fileSize: number,      // 文件大小（字节）
  lastModified: number,  // 最后修改时间戳
  dataUrl: string,       // Data URL（base64编码）
  width: number,         // 当前宽度
  height: number,        // 当前高度
  naturalWidth: number,  // 原始宽度
  naturalHeight: number  // 原始高度
}
```

### render方法参数

```javascript
{
  zoom: number,    // 缩放比例，默认1.0
  rotation: number // 旋转角度（度），默认0
}
```

### 示例

#### 解析图片文件

```javascript
const adapter = new ImageAdapter();
const file = new File([blob], 'photo.jpg');
const data = await adapter.parse(file);
console.log(data);
// {
//   fileType: 'jpg',
//   fileName: 'photo.jpg',
//   fileSize: 102400,
//   lastModified: 1234567890,
//   dataUrl: 'data:image/jpeg;base64,/9j/4AAQ...',
//   width: 800,
//   height: 600,
//   naturalWidth: 800,
//   naturalHeight: 600
// }
```

#### 渲染图片

```javascript
const adapter = new ImageAdapter();
const data = await adapter.parse(file);

// 默认渲染
let element = adapter.render(data);
document.body.appendChild(element);

// 缩放渲染
element = adapter.render(data, { zoom: 1.5 });

// 旋转渲染
element = adapter.render(data, { rotation: 90 });

// 缩放+旋转
element = adapter.render(data, { zoom: 2.0, rotation: 180 });
```

#### 适应容器

```javascript
const adapter = new ImageAdapter();
const data = await adapter.parse(file);

// 适应容器
const scale = adapter.fitToContainer(data, 400, 300);
element = adapter.render(data, { zoom: scale });

// 适应宽度
const scale = adapter.fitToWidth(data, 400);

// 适应高度
const scale = adapter.fitToHeight(data, 300);
```

#### 获取元数据

```javascript
const adapter = new ImageAdapter();
const data = await adapter.parse(file);
const metadata = adapter.getMetadata(data);
console.log(metadata);
// {
//   fileName: 'photo.jpg',
//   fileSize: 102400,
//   fileType: 'jpg',
//   width: 800,
//   height: 600,
//   aspectRatio: 1.333,
//   lastModified: 1234567890
// }
```

### 辅助方法

#### formatFileSize(bytes)

格式化文件大小显示。

**参数**：
- `bytes` (number): 文件大小（字节）

**返回值**：
- (string): 格式化后的文件大小，如 '1.00 KB', '2.50 MB'

**示例**：
```javascript
adapter._formatFileSize(1024);        // '1.00 KB'
adapter._formatFileSize(1024 * 1024); // '1.00 MB'
```

## 使用示例

### 基本使用

```javascript
import DocumentAdapter from './adapters/DocumentAdapter.js';
import ImageAdapter from './adapters/ImageAdapter.js';

// 创建适配器实例
const docAdapter = new DocumentAdapter();
const imgAdapter = new ImageAdapter();

// 解析文件
const file = document.querySelector('input[type="file"]').files[0];
const fileType = file.name.split('.').pop().toLowerCase();

// 根据文件类型选择适配器
let adapter;
if (docAdapter.canHandle(fileType)) {
  adapter = docAdapter;
} else if (imgAdapter.canHandle(fileType)) {
  adapter = imgAdapter;
}

if (adapter) {
  const data = await adapter.parse(file);
  const element = adapter.render(data);
  document.getElementById('preview').appendChild(element);
} else {
  console.error('Unsupported file type');
}
```

### 与预览器集成

```javascript
import DocumentAdapter from './adapters/DocumentAdapter.js';
import PDFPreviewer from './implementations/document/PDFPreviewer.js';

async function previewPDF(file) {
  // 使用适配器解析文件
  const adapter = new DocumentAdapter();
  const data = await adapter.parse(file);
  
  // 使用预览器渲染
  const previewer = new PDFPreviewer(data);
  await previewer.load();
  const element = await previewer.render();
  
  document.getElementById('preview').appendChild(element);
}
```

### 批量文件处理

```javascript
import DocumentAdapter from './adapters/DocumentAdapter.js';
import ImageAdapter from './adapters/ImageAdapter.js';

const adapters = [
  new DocumentAdapter(),
  new ImageAdapter()
];

async function processFiles(files) {
  for (const file of files) {
    const fileType = file.name.split('.').pop().toLowerCase();
    
    for (const adapter of adapters) {
      if (adapter.canHandle(fileType)) {
        try {
          const data = await adapter.parse(file);
          const element = adapter.render(data);
          document.getElementById('preview').appendChild(element);
          break;
        } catch (error) {
          console.error(`Failed to process ${file.name}:`, error);
        }
      }
    }
  }
}
```

## 错误处理

### 常见错误

1. **Unsupported file type**
   ```javascript
   try {
     const adapter = new DocumentAdapter();
     await adapter.parse(file); // 文件类型不支持
   } catch (error) {
     console.error(error.message); // 'Unsupported file type: jpg'
   }
   ```

2. **Invalid file object**
   ```javascript
   try {
     adapter.validateFile(null); // 无效的文件对象
   } catch (error) {
     console.error(error.message); // 'File is required'
   }
   ```

3. **Invalid JSON file**
   ```javascript
   try {
     const adapter = new DocumentAdapter();
     const file = new File(['{invalid}'], 'test.json');
     await adapter.parse(file);
   } catch (error) {
     console.error(error.message); // 'Invalid JSON file'
   }
   ```

4. **Failed to read file**
   ```javascript
   try {
     const adapter = new DocumentAdapter();
     await adapter.parse(file); // 读取失败
   } catch (error) {
     console.error(error.message); // 'Failed to read text file'
   }
   ```

## 性能优化建议

1. **缓存解析结果**
   ```javascript
   const adapter = new DocumentAdapter();
   const cache = new Map();

   async function parseWithCache(file) {
     const key = `${file.name}-${file.size}-${file.lastModified}`;
     if (cache.has(key)) {
       return cache.get(key);
     }
     const data = await adapter.parse(file);
     cache.set(key, data);
     return data;
   }
   ```

2. **延迟渲染**
   ```javascript
   const adapter = new ImageAdapter();
   const data = await adapter.parse(file);
   
   // 延迟渲染，避免阻塞UI
   requestAnimationFrame(() => {
     const element = adapter.render(data);
     document.getElementById('preview').appendChild(element);
   });
   ```

3. **缩略图生成**
   ```javascript
   const adapter = new ImageAdapter();
   const data = await adapter.parse(file);
   
   // 生成缩略图
   const thumbnail = adapter.render(data, { zoom: 0.1 });
   ```

## 测试

适配器层提供了完整的单元测试，覆盖率达到80%以上。

运行测试：
```bash
npm test -- tests/unit/adapters/
```

测试覆盖：
- 文件类型检测
- 文件解析
- 数据渲染
- 错误处理
- 边界情况

## 扩展指南

### 添加新的适配器

1. 创建新适配器类，继承BaseAdapter
2. 实现所有抽象方法
3. 添加支持的文件类型
4. 编写单元测试

示例：
```javascript
import BaseAdapter from './BaseAdapter.js';

class MyAdapter extends BaseAdapter {
  constructor() {
    super();
    this._supportedTypes = new Set(['mytype']);
  }

  canHandle(fileType) {
    return this._supportedTypes.has(fileType.toLowerCase());
  }

  async parse(file) {
    this.validateFile(file);
    // 实现解析逻辑
    return { fileType: 'mytype', ... };
  }

  render(data) {
    // 实现渲染逻辑
    return document.createElement('div');
  }

  getSupportedTypes() {
    return Array.from(this._supportedTypes);
  }
}

export default MyAdapter;
```

---

**文档版本**: 1.0  
**编写日期**: 2026-01-29  
**维护者**: 适配器开发负责人
