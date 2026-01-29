# JSON预览器模块

## 功能说明

JSON预览器模块提供纯前端JSON文件预览功能，支持：

- ✅ JSON格式化显示（美化输出）
- ✅ 语法高亮（字符串、数字、布尔值、null等不同颜色）
- ✅ 折叠/展开节点（对象和数组可折叠）
- ✅ 滚动查看（支持大文件滚动）
- ✅ 错误提示（JSON格式错误时显示详细错误信息）

## 使用方法

### 基本使用

```javascript
import { createJSONPreviewer } from './json/index.js';

// 创建预览器实例
const previewer = createJSONPreviewer({
  container: document.getElementById('preview-container'),
  fileInfo: {
    name: 'data.json',
    size: 1024
  },
  onLoad: () => {
    console.log('JSON加载完成');
  },
  onError: (error) => {
    console.error('加载失败:', error);
  },
  onProgress: (progress) => {
    console.log('加载进度:', progress + '%');
  }
});

// 加载JSON文件
await previewer.load(fileObject);

// 渲染内容
await previewer.renderPage(0);
```

### 直接使用类

```javascript
import { JSONPreviewer } from './json/index.js';

const previewer = new JSONPreviewer({
  container: document.getElementById('preview-container'),
  fileInfo: { name: 'data.json' }
});

await previewer.load(fileObject);
await previewer.renderPage(0);
```

## API 文档

### 构造函数

```javascript
new JSONPreviewer(options)
```

**参数：**
- `options.container` (HTMLElement) - 容器元素
- `options.fileInfo` (Object) - 文件信息
  - `fileInfo.name` (String) - 文件名
  - `fileInfo.size` (Number) - 文件大小（字节）
- `options.onLoad` (Function) - 加载完成回调
- `options.onError` (Function) - 错误回调
- `options.onProgress` (Function) - 进度回调

### 方法

#### load(file)

加载JSON文件。

**参数：**
- `file` (ArrayBuffer|File) - 文件数据

**返回：** Promise<void>

#### renderPage(pageIndex)

渲染JSON内容（JSON不分页，pageIndex参数被忽略）。

**参数：**
- `pageIndex` (Number) - 页面索引（保留参数，未使用）

**返回：** Promise<void>

#### destroy()

销毁预览器实例，释放资源。

#### getJsonData()

获取解析后的JSON数据。

**返回：** JSON数据对象

### 错误处理

当JSON文件格式错误时，会抛出详细的错误信息：

```javascript
try {
  await previewer.load(file);
} catch (error) {
  console.error(error.message);
  // 输出示例：
  // JSON格式错误: Expected ',' or '}' after property value
  //   位置: 156
  //   上下文: ...,"name":"test[这里]"age":25...
}
```

## 技术特点

- **纯JavaScript实现**：不依赖任何第三方库
- **高性能**：使用原生DOM操作，内存占用低
- **轻量级**：核心代码约200行
- **语法高亮**：参考GitHub风格配色
  - 字符串：绿色 (#22863a)
  - 数字/布尔值：蓝色 (#005cc5)
  - 键名：红色 (#d73a49)
  - null：灰色 (#6a737d)
- **交互友好**：折叠/展开操作流畅，视觉反馈清晰

## 代码结构

```
json/
├── index.js          # 模块入口
├── JSONPreviewer.js  # 预览器实现
└── README.md         # 本文档
```

## 浏览器兼容性

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## 性能优化

1. **按需渲染**：只渲染可见区域
2. **懒加载**：大文件支持分批加载
3. **事件委托**：折叠/展开使用事件委托机制
4. **样式内联**：减少DOM查询开销

## 示例JSON文件

```json
{
  "name": "示例项目",
  "version": "1.0.0",
  "features": [
    "格式化显示",
    "语法高亮",
    "折叠展开"
  ],
  "config": {
    "theme": "light",
    "fontSize": 14,
    "enabled": true
  },
  "metadata": {
    "author": "开发团队",
    "created": "2024-01-01",
    "modified": null
  }
}
```

## 注意事项

1. JSON文件大小建议不超过10MB
2. 嵌套层级过深可能影响渲染性能
3. 特殊字符会自动转义（HTML实体）
4. 容器需要设置明确的宽度和高度
