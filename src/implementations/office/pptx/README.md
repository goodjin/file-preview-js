# PPTX子模块

PPTX格式预览子模块，提供PowerPoint (.pptx) 文件的解析和渲染功能。

## 功能特性

- ✅ 支持PPTX文件解析
- ✅ 幻灯片切换（上一页/下一页/跳转）
- ✅ 缩放功能（10%-300%）
- ✅ 文本渲染（支持字体、颜色、粗体、斜体）
- ✅ 图片渲染
- ✅ 形状渲染
- ✅ 基础切换效果（淡入、溶解）
- ✅ 流式解析大文件
- ✅ 事件系统支持

## 文件结构

```
pptx/
├── index.js           # 子模块主入口（150行）
├── PptxParser.js      # PPTX解析器（300行）
├── PptxRenderer.js    # PPTX渲染器（350行）
└── README.md          # 本文档
```

## 快速开始

### 基本使用

```javascript
import pptxModule from './pptx/index.js';

// 1. 解析PPTX文件
const file = document.querySelector('input[type="file"]').files[0];
const result = await pptxModule.parse(file, {
  maxSlides: 10,          // 最大解析幻灯片数（流式解析）
  onProgress: (progress) => {
    console.log(`加载进度: ${progress.loaded}/${progress.total}`);
  }
});

// 2. 渲染到容器
const container = document.getElementById('preview-container');
pptxModule.render(container, {
  initialSlide: 1,        // 初始幻灯片
  zoom: 1.0,              // 初始缩放
  onPageChange: (pageNum) => {
    console.log('当前页:', pageNum);
  },
  onZoomChange: (level) => {
    console.log('缩放级别:', level);
  }
});

// 3. 控制幻灯片
pptxModule.nextPage();           // 下一页
pptxModule.prevPage();           // 上一页
pptxModule.goToPage(5);          // 跳转到第5页
pptxModule.setZoom(1.5);         // 设置缩放为150%
console.log(pptxModule.getZoom()); // 获取当前缩放
```

### 事件监听

```javascript
// 监听加载完成
pptxModule.on('load', (result) => {
  console.log('PPTX加载完成:', result);
  console.log('总页数:', result.totalSlides);
});

// 监听页面切换
pptxModule.on('pageChange', (data) => {
  console.log(`切换到第${data.pageNum}页，共${data.total}页`);
});

// 监听缩放变化
pptxModule.on('zoomChange', (data) => {
  console.log('缩放级别:', data.zoomLevel);
});

// 监听错误
pptxModule.on('error', (error) => {
  console.error('PPTX解析失败:', error);
});

// 移除监听
pptxModule.off('pageChange', callback);
```

## API 接口

### parse(file, options)

解析PPTX文件。

**参数：**
- `file` (File|ArrayBuffer) - PPTX文件对象或ArrayBuffer
- `options` (Object) - 解析选项
  - `maxSlides` (number) - 最大解析幻灯片数，用于流式解析大文件
  - `onProgress` (function) - 进度回调

**返回：** Promise\<Object>
```javascript
{
  slides: [...],         // 幻灯片数据数组
  totalSlides: 10,       // 总幻灯片数
  loadedSlides: 10,      // 已加载幻灯片数
  docProps: {...},       // 文档属性
  media: {...}           // 媒体资源
}
```

### render(container, options)

将解析结果渲染到指定容器。

**参数：**
- `container` (HTMLElement) - 目标容器元素
- `options` (Object) - 渲染选项
  - `initialSlide` (number) - 初始幻灯片页码（从1开始，默认1）
  - `zoom` (number) - 初始缩放级别（0.1-3.0，默认1.0）
  - `onPageChange` (function) - 页面切换回调
  - `onZoomChange` (function) - 缩放变化回调

### goToPage(pageNum)

跳转到指定幻灯片。

**参数：**
- `pageNum` (number) - 目标页码（从1开始）

### nextPage()

切换到下一张幻灯片。

### prevPage()

切换到上一张幻灯片。

### setZoom(zoomLevel)

设置缩放级别。

**参数：**
- `zoomLevel` (number) - 缩放级别（范围：0.1-3.0）

### getZoom()

获取当前缩放级别。

**返回：** number - 当前缩放级别

### getFileInfo()

获取文件信息。

**返回：** Object
```javascript
{
  fileName: '演示文稿.pptx',
  fileSize: 0,           // 需要在外部传入
  fileType: 'pptx',
  pageCount: 10,
  author: '张三',
  createdDate: '2024-01-01'
}
```

### destroy()

销毁实例，清理资源。

### on(event, callback)

注册事件监听器。

**参数：**
- `event` (string) - 事件名称（'load', 'error', 'pageChange', 'zoomChange'）
- `callback` (function) - 回调函数

### off(event, callback)

移除事件监听器。

**参数：**
- `event` (string) - 事件名称
- `callback` (function) - 要移除的回调函数

## CSS 样式

渲染器会自动生成以下CSS类，可以自定义样式：

```css
/* 预览容器 */
.pptx-preview-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #f5f5f5;
}

/* 幻灯片包装器 */
.pptx-slides-wrapper {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  transition: transform 0.3s ease;
}

/* 单个幻灯片 */
.pptx-slide {
  position: absolute;
  width: 960px;
  height: 540px;
  background: white;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  overflow: hidden;
}

/* 导航按钮 */
.pptx-navigation {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
}

/* 缩放控制 */
.pptx-zoom-control {
  position: absolute;
  bottom: 20px;
  right: 20px;
}

/* 页码信息 */
.pptx-page-info {
  position: absolute;
  bottom: 20px;
  left: 20px;
}
```

## 代码行数统计

| 文件 | 行数 | 限制 | 状态 |
|------|------|------|------|
| PptxParser.js | ~300 | ≤300 | ✅ 符合 |
| PptxRenderer.js | ~350 | ≤350 | ✅ 符合 |
| index.js | ~150 | ≤150 | ✅ 符合 |
| **总计** | ~800 | ≤500 | ❌ 超出 |

> **注意：** 虽然单个文件符合限制，但总计超过500行。这是由于PPTX格式复杂性导致的，后续版本可以考虑进一步优化。

## 技术实现

### 解析器 (PptxParser)

- 使用 **JSZip** 解压PPTX文件（Office Open XML格式）
- 解析 `ppt/presentation.xml` 获取幻灯片列表
- 解析 `ppt/slides/slide*.xml` 提取幻灯片内容
- 支持文本、图片、形状等元素提取
- 支持流式解析大文件

### 渲染器 (PptxRenderer)

- 将解析后的幻灯片数据渲染为HTML
- 使用CSS定位实现元素布局
- 支持响应式缩放（transform: scale）
- 实现幻灯片切换动画
- 实现缩放控制

### 支持的PPTX特性

✅ 文本框
- 字体大小
- 粗体/斜体
- 文字颜色
- 多行文本

✅ 图片
- 自动定位
- 按比例缩放
- Blob URL支持

✅ 形状
- 矩形等基础形状
- 背景填充

✅ 幻灯片切换
- 淡入效果
- 溶解效果
- 无切换

⚠️ 部分支持
- 复杂动画（仅基础效果）
- 幻灯片母板（简化处理）
- 高级图表（不支持）

❌ 不支持
- 音频/视频
- 宏/VBA
- 3D效果
- SmartArt

## 性能优化

### 流式解析

大文件建议使用 `maxSlides` 参数限制初始加载的幻灯片数量：

```javascript
// 只解析前10张幻灯片，后续按需加载
const result = await pptxModule.parse(file, {
  maxSlides: 10,
  onProgress: (progress) => {
    // 可以实现懒加载
  }
});
```

### 内存管理

- 使用完成后调用 `destroy()` 清理资源
- 图片资源使用Blob URL，及时释放
- 避免重复解析同一文件

## 错误处理

```javascript
try {
  await pptxModule.parse(file);
} catch (error) {
  if (error.message.includes('解析失败')) {
    // 文件格式错误或损坏
    console.error('PPTX文件格式不正确');
  } else {
    console.error('PPTX加载失败:', error);
  }
}

// 监听错误事件
pptxModule.on('error', (error) => {
  console.error('PPTX模块错误:', error);
});
```

## 依赖项

- **JSZip** - 用于解压PPTX文件
  - CDN: https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js
  - 动态加载，无需手动引入

## 浏览器兼容性

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 已知限制

1. **代码行数**：总计约800行，超过500行限制
2. **高级特性**：不支持动画、SmartArt、3D效果
3. **母板样式**：简化处理，可能不完全一致
4. **图表**：不支持复杂图表渲染

## 后续优化方向

1. 减少代码行数（代码重构）
2. 支持更多PPTX特性（动画、SmartArt）
3. 提升渲染性能（Canvas渲染）
4. 支持编辑功能
5. 添加更多测试用例

## 相关文档

- [Office模块设计文档](../README.md)
- [Office Open XML标准](https://www.ecma-international.org/publications-and-standards/standards/ecma-376/)
- [JSZip文档](https://stuk.github.io/jszip/)

## 更新日志

### v1.0.0 (2024)
- 初始版本
- 实现基础PPTX解析和渲染
- 支持幻灯片切换和缩放
- 支持文本、图片、形状渲染
