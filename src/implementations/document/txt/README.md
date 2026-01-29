# TXT预览器模块

## 概述

TXT预览器是一个纯JavaScript实现的文本文件预览组件，支持多种文本编码、自动编码检测、行号显示和文本搜索等功能。

## 功能特性

### 核心功能
- ✅ **多编码支持**：支持UTF-8、GBK、GB18030、GB2312、Big5、Shift_JIS等常用编码
- ✅ **自动编码检测**：通过BOM标记和试探性解码自动识别文件编码
- ✅ **文本格式化显示**：保留文本格式，正确显示换行和缩进
- ✅ **滚动查看**：支持鼠标滚轮和滚动条查看长文本
- ✅ **行号显示**：可选显示行号，便于定位内容
- ✅ **文本搜索**：支持关键词搜索，高亮显示匹配结果，支持上下导航

### 技术特性
- 纯JavaScript实现，无第三方依赖
- 继承DocumentPreviewer基类，符合模块架构
- 代码量控制在500行以内
- 支持进度回调
- 完善的错误处理机制

## 文件结构

```
txt/
├── index.js              # 模块入口，导出TXTPreviewer类
├── TXTPreviewer.js       # TXT预览器核心实现（约440行）
├── TXTPreviewer.css      # 样式文件
└── README.md            # 模块文档
```

## 使用方法

### 基本使用

```javascript
import TXTPreviewer from './txt/index.js';

// 创建预览器实例
const previewer = new TXTPreviewer({
  container: document.getElementById('preview-container'),
  fileInfo: {
    name: 'example.txt',
    size: 10240
  },
  onLoad: () => {
    console.log('TXT文件加载完成');
  },
  onError: (error) => {
    console.error('加载失败:', error);
  },
  onProgress: (progress) => {
    console.log('加载进度:', progress + '%');
  },
  showLineNumbers: true  // 显示行号（可选）
});

// 加载文件
const file = document.getElementById('file-input').files[0];
await previewer.load(file);
```

### 方法说明

#### 核心方法（继承自DocumentPreviewer）
- `load(file)` - 加载TXT文件
- `renderPage(pageIndex)` - 渲染页面（TXT不分页，此方法为接口兼容）
- `destroy()` - 销毁实例，释放资源

#### TXTPreviewer特有方法

**获取信息**
- `getLineCount()` - 获取总行数
- `getEncoding()` - 获取检测到的文本编码

**搜索功能**
- `setSearchKeyword(keyword)` - 设置搜索关键词并执行搜索
- `_performSearch()` - 执行搜索（内部方法）
- `_navigateSearch(direction)` - 导航搜索结果（内部方法）

**显示控制**
- `setShowLineNumbers(show)` - 设置是否显示行号
- `_toggleLineNumbers()` - 切换行号显示（内部方法）

## 编码检测机制

TXT预览器使用以下策略检测文件编码：

1. **BOM标记检测**：优先检测文件开头的字节顺序标记（BOM）
   - UTF-8 BOM: `EF BB BF`
   - UTF-16LE BOM: `FF FE`
   - UTF-16BE BOM: `FE FF`

2. **试探性解码**：如果无BOM标记，依次尝试常用编码解码
   - 尝试使用`{ fatal: true }`模式解码文件前1024字节
   - 成功则使用该编码，失败则尝试下一个编码
   - 编码列表：UTF-8, GBK, GB18030, GB2312, Big5, Shift_JIS等

3. **默认编码**：如果所有编码都失败，默认使用UTF-8（非严格模式）

## UI界面

### 工具栏
- **文件信息**：显示检测到的编码和总行数
- **搜索区域**：搜索输入框、搜索按钮、上一个/下一个按钮、匹配计数
- **选项区域**：行号显示开关

### 预览区域
- **行号列**：左侧显示行号，与文本同步滚动
- **文本区域**：显示文本内容，支持滚动查看
- **搜索高亮**：匹配的关键词高亮显示，当前结果额外标识

## 样式说明

TXTPreviewer.css包含完整的样式定义，主要样式类：

- `.txt-preview-container` - 预览器容器
- `.txt-preview-toolbar` - 工具栏
- `.txt-info` - 文件信息区域
- `.txt-search` - 搜索区域
- `.txt-options` - 选项区域
- `.txt-preview-content` - 预览内容区域
- `.txt-line-numbers` - 行号区域
- `.txt-text-content` - 文本内容区域
- `.txt-search-highlight` - 搜索高亮
- `.txt-current-result` - 当前搜索结果

## 性能优化

1. **按需渲染**：只在load时渲染一次文本内容
2. **搜索优化**：使用正则表达式一次性匹配所有结果
3. **内存管理**：destroy方法清理所有引用和DOM元素
4. **事件委托**：合理绑定事件，避免内存泄漏

## 错误处理

预览器处理以下错误情况：
- 文件格式不支持
- 编码解码失败
- DOM操作异常
- 文件加载超时

所有错误通过onError回调传递给调用者。

## 兼容性

- 浏览器：现代浏览器（Chrome、Firefox、Safari、Edge）
- TextDecoder API：需要浏览器支持
- ES6模块：需要支持ES6模块导入

## 代码规范

- 遵循项目JavaScript代码规范
- 代码量控制在500行以内
- 充分的代码注释
- 清晰的方法命名
- 合理的错误处理

## 未来扩展

可能的扩展功能：
- 字体大小调整
- 深色模式支持
- 正则表达式搜索
- 文件编码手动选择
- 导出功能（复制文本）
- 打印功能
- 大文件虚拟滚动

## 维护者

文档模块负责人

## 更新日志

### v1.0.0 (2024-01-29)
- 初始版本
- 实现基本文本预览功能
- 支持多种编码和自动检测
- 实现行号显示和文本搜索
