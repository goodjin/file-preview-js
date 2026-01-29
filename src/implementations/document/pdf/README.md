# PDF预览功能使用说明

## 功能特性

- ✅ PDF文件加载和渲染
- ✅ 缩放控制（25%-400%）
- ✅ 翻页控制（上一页/下一页/跳转）
- ✅ 加载进度显示
- ✅ 友好的错误提示
- ✅ 纯JavaScript实现，无服务端依赖

## 快速开始

### 基本用法

```javascript
import { createPDFPreviewer } from './pdf/index.js';

// 创建预览器实例
const previewer = createPDFPreviewer({
  container: document.getElementById('pdf-container'),
  fileInfo: {
    name: 'example.pdf',
    size: 1024000
  },
  onLoad: () => {
    console.log('PDF加载完成');
  },
  onError: (error) => {
    console.error('加载失败:', error.message);
  },
  onProgress: (progress) => {
    console.log('加载进度:', progress + '%');
  }
});

// 加载PDF文件
const fileInput = document.getElementById('file-input');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) {
    await previewer.load(file);
  }
});
```

### 高级用法

```javascript
// 控制页面
previewer.previousPage();  // 上一页
previewer.nextPage();       // 下一页
previewer.goToPage(5);      // 跳转到第6页（索引从0开始）

// 控制缩放
previewer.zoomIn();         // 放大
previewer.zoomOut();        // 缩小
previewer.setScale(1.5);    // 设置缩放为150%

// 获取信息
const totalPages = previewer.getTotalPages();  // 总页数
const currentPage = previewer.getCurrentPage();  // 当前页码
const scale = previewer.getScale();  // 当前缩放比例

// 销毁预览器
previewer.destroy();
```

## 依赖库

- PDF.js (v3.11.174) - Mozilla开源PDF渲染库
  * CDN地址: https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js
  * Worker: https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js

## 文件结构

```
pdf/
├── PDFPreviewer.js   # PDF预览器主类
├── PDFRenderer.js    # PDF渲染引擎
├── PDFControls.js    # PDF控制组件
├── index.js          # 模块入口
└── README.md         # 本文档
```

## 浏览器兼容性

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## API文档

### createPDFPreviewer(options)

创建PDF预览器实例。

**参数:**
- `options.container` (HTMLElement) - 容器元素
- `options.fileInfo` (Object) - 文件信息
  - `name` (string) - 文件名
  - `size` (number) - 文件大小（字节）
- `options.onLoad` (Function) - 加载完成回调
- `options.onError` (Function) - 错误回调
- `options.onProgress` (Function) - 进度回调

**返回:** PDFPreviewer实例

### PDFPreviewer方法

#### load(file)
加载PDF文件。
- `file` (File) - 文件对象

#### renderPage(pageIndex)
渲染指定页面。
- `pageIndex` (number) - 页面索引（从0开始）

#### setScale(scale)
设置缩放级别。
- `scale` (number) - 缩放比例（0.25-4.0）

#### zoomIn()
放大一级（+0.25）

#### zoomOut()
缩小一级（-0.25）

#### goToPage(pageIndex)
跳转到指定页。
- `pageIndex` (number) - 页面索引

#### previousPage()
上一页

#### nextPage()
下一页

#### getTotalPages()
获取总页数。
- 返回: number

#### getCurrentPage()
获取当前页码。
- 返回: number

#### getScale()
获取当前缩放比例。
- 返回: number

#### destroy()
销毁预览器，释放资源。

## 错误处理

预览器会通过onError回调传递错误信息，常见错误类型：

- **不支持的文件格式**: 文件不是PDF格式
- **PDF加载失败**: 文件损坏或格式错误
- **页面渲染失败**: 特定页面渲染错误
- **文件读取失败**: 文件读取过程中的错误

## 性能优化

- 按需渲染：只渲染当前页面
- 页面缓存：缓存已渲染的页面
- 进度反馈：大文件加载显示进度

## 注意事项

1. 首次加载会从CDN获取PDF.js库
2. 大文件（>10MB）加载可能需要较长时间
3. 加密的PDF文件可能无法预览
4. 建议在使用前调用destroy()释放资源

## 示例

详见 `demo.html` 文件。
