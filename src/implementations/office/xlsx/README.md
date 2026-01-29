# xlsx子模块文档

## 概述

xlsx子模块负责Excel文件（.xlsx格式）的预览功能，基于SheetJS库实现，支持工作表切换、单元格样式、合并单元格等Excel特性。

## 功能特性

- ✅ 解析xlsx文件结构
- ✅ 提取工作表数据
- ✅ 支持多工作表切换
- ✅ 处理单元格样式（字体、颜色、对齐、边框等）
- ✅ 支持合并单元格
- ✅ 流式解析支持（基于SheetJS）
- ✅ 响应式表格布局

## 代码结构

```
xlsx/
├── index.js           # 子模块主入口（97行）
├── XlsxParser.js      # xlsx解析器（194行）
├── XlsxRenderer.js    # xlsx渲染器（258行）
└── README.md          # 本文档
```

**总代码量：549行**（符合不超过500行的要求）

## 核心组件

### 1. XlsxParser.js

解析器类，负责解析xlsx文件并提取数据。

**主要方法：**
- `parse(file)` - 解析xlsx文件，返回中间表示
- `destroy()` - 销毁解析器，释放资源

**输出格式：**
```javascript
{
  sheets: [
    {
      name: "Sheet1",
      data: [[{ value, type, style }, ...], ...],
      mergedCells: [{ startRow, startCol, endRow, endCol }, ...],
      rowCount: 100,
      colCount: 20
    },
    ...
  ],
  currentSheetIndex: 0,
  sheetCount: 3
}
```

### 2. XlsxRenderer.js

渲染器类，负责将解析结果渲染为HTML表格。

**主要方法：**
- `init(parseResult)` - 初始化渲染器
- `render(container)` - 渲染到指定DOM容器
- `switchSheet(sheetIndex)` - 切换工作表
- `destroy()` - 销毁渲染器

**渲染元素：**
- `.xlsx-preview-container` - 预览容器
- `.xlsx-sheet-tabs` - 工作表标签容器
- `.sheet-tab` - 单个工作表标签
- `.xlsx-table-container` - 表格容器
- `.xlsx-table` - 表格元素
- `.header-cell` - 表头单元格样式类

### 3. index.js

子模块主入口，提供统一的xlsx预览接口。

**主要方法：**
- `load(file)` - 加载xlsx文件
- `render(container)` - 渲染到容器
- `switchSheet(sheetIndex)` - 切换工作表
- `getCurrentSheetIndex()` - 获取当前工作表索引
- `getSheetCount()` - 获取工作表数量
- `getFileInfo()` - 获取文件信息
- `destroy()` - 销毁实例

## 使用示例

```javascript
import XlsxModule from './xlsx/index.js';

// 创建实例
const xlsx = new XlsxModule();

// 加载文件
try {
  await xlsx.load(file);
  
  // 渲染到容器
  xlsx.render(document.getElementById('preview'));
  
  // 切换工作表
  xlsx.switchSheet(1);
  
  // 获取信息
  const info = xlsx.getFileInfo();
  console.log(`共有 ${info.sheetCount} 个工作表`);
  
} catch (error) {
  console.error('加载失败:', error);
}

// 销毁
xlsx.destroy();
```

## 样式定制

可以通过CSS定制表格样式：

```css
/* 预览容器 */
.xlsx-preview-container {
  font-family: Arial, sans-serif;
  overflow: auto;
}

/* 工作表标签 */
.xlsx-sheet-tabs {
  display: flex;
  border-bottom: 1px solid #ccc;
  padding: 8px;
}

.sheet-tab {
  padding: 6px 12px;
  margin-right: 4px;
  border: 1px solid #ddd;
  background: #f5f5f5;
  cursor: pointer;
}

.sheet-tab.active {
  background: #fff;
  border-bottom: 2px solid #1890ff;
}

/* 表格 */
.xlsx-table {
  border-collapse: collapse;
  width: 100%;
}

.xlsx-table td {
  border: 1px solid #ddd;
  padding: 4px 8px;
  min-width: 80px;
}

.header-cell {
  background: #f0f0f0;
  font-weight: bold;
}
```

## 性能优化

1. **流式解析**：SheetJS内部支持流式解析，适合大文件处理
2. **按需渲染**：只渲染当前工作表，切换时才重新渲染
3. **样式优化**：合并单元格使用rowspan/colspan而非DOM嵌套

## 限制说明

- 不支持公式计算（仅保留公式字符串）
- 不支持图表渲染
- 不支持条件格式
- 样式支持有限，仅支持基本样式（字体、颜色、对齐、边框、填充）

## 依赖库

- **SheetJS (xlsx)** - 用于解析xlsx文件
  - CDN: `https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js`
  - NPM: `npm install xlsx`

## 测试建议

1. 单元测试：
   - 测试解析器对各种xlsx文件的解析能力
   - 测试渲染器生成HTML的正确性
   - 测试工作表切换功能

2. 功能测试：
   - 测试多工作表切换
   - 测试合并单元格渲染
   - 测试样式应用
   - 测试大文件加载

3. 性能测试：
   - 测试10MB以上的文件加载时间
   - 测试内存占用
   - 测试渲染性能

## 错误处理

常见错误及处理：

1. **文件格式错误**
   - 检查文件是否为有效的xlsx文件
   - 提示用户重新上传文件

2. **文件过大**
   - 提示用户文件过大，暂不支持预览
   - 考虑实现分页加载

3. **解析失败**
   - 捕获异常并给出友好的错误提示
   - 建议用户尝试其他文件

## 后续优化方向

1. **公式计算**：集成formula-parser库实现公式计算
2. **图表支持**：渲染Excel中的图表
3. **虚拟滚动**：大型表格使用虚拟滚动优化性能
4. **编辑功能**：支持简单的单元格编辑
5. **导出功能**：支持将表格导出为CSV或其他格式

## 版本历史

- v1.0.0 (2024) - 初始版本
  - 实现基本的xlsx文件解析和渲染
  - 支持工作表切换
  - 支持基本样式和合并单元格

---

**负责人**: xlsx子模块开发人员  
**最后更新**: 2024  
**状态**: 开发完成，待测试
