# Office模块设计文档

## 1. 模块概述

### 1.1 模块职责
Office模块负责Office文件类型的预览实现，支持10种Office格式：
- **Word类**：doc, docx
- **Excel类**：xls, xlsx, csv
- **PowerPoint类**：ppt, pptx
- **WPS Office类**：wps, et, dps

### 1.2 设计目标
- 纯JavaScript实现，不依赖服务端解析
- 支持大文件预览（100MB+）
- 流畅的用户体验
- 代码量控制在500行以内（每个子模块）

### 1.3 开发阶段
- **P0（第一阶段）**：docx, xlsx, pptx
- **P1（第二阶段）**：doc, xls, ppt, csv
- **P2（第三阶段）**：wps, et, dps

## 2. 模块架构设计

### 2.1 整体架构

```
office/
├── index.js                    # Office模块主入口
├── OfficeAdapter.js            # Office适配器（统一接口）
├── docx/                       # docx格式预览子模块
│   ├── index.js               # docx主入口
│   ├── DocxParser.js          # docx解析器
│   ├── DocxRenderer.js        # docx渲染器
│   └── README.md              # docx子模块文档
├── xlsx/                       # xlsx格式预览子模块
│   ├── index.js               # xlsx主入口
│   ├── XlsxParser.js          # xlsx解析器
│   ├── XlsxRenderer.js        # xlsx渲染器
│   └── README.md              # xlsx子模块文档
├── pptx/                       # pptx格式预览子模块
│   ├── index.js               # pptx主入口
│   ├── PptxParser.js          # pptx解析器
│   ├── PptxRenderer.js        # pptx渲染器
│   └── README.md              # pptx子模块文档
└── README.md                   # Office模块总文档（本文件）
```

### 2.2 模块依赖关系

```
核心框架层
    ↓
OfficeAdapter（适配器层）
    ↓
┌─────────┬─────────┬─────────┐
│ docx/   │ xlsx/   │ pptx/   │
│ 子模块  │ 子模块  │ 子模块  │
└─────────┴─────────┴─────────┘
    ↓
UI层（通过接口回调）
```

## 3. 核心组件设计

### 3.1 OfficeAdapter.js（Office适配器）

**职责**：
- 作为Office模块与核心框架的统一接口
- 文件类型分发到对应的子模块
- 统一的错误处理和状态管理
- 向UI层提供标准化的预览接口

**接口定义**：
```javascript
class OfficeAdapter {
  // 支持的文件类型列表
  static getSupportedTypes();
  
  // 检测是否支持该文件类型
  static isSupported(fileType);
  
  // 加载Office文件
  load(file, options);
  
  // 渲染到容器
  render(container);
  
  // 页面导航（PPTX）
  goToPage(pageNum);
  nextPage();
  prevPage();
  
  // 缩放控制
  setZoom(zoomLevel);
  getZoom();
  
  // 获取文件信息
  getFileInfo();
  
  // 销毁实例
  destroy();
  
  // 事件监听
  on(event, callback);
  off(event, callback);
}
```

**代码行数限制**：不超过400行

### 3.2 docx子模块

#### 3.2.1 DocxParser.js（docx解析器）

**职责**：
- 解析docx文件结构
- 提取文本、样式、图片等元素
- 生成中间表示格式
- 处理大文件流式解析

**代码行数限制**：不超过300行

#### 3.2.2 DocxRenderer.js（docx渲染器）

**职责**：
- 将解析结果渲染为HTML
- 处理文本格式（字体、颜色、对齐等）
- 处理段落结构
- 处理图片和表格
- 支持响应式布局

**代码行数限制**：不超过350行

#### 3.2.3 index.js（docx主入口）

**职责**：
- 子模块对外接口
- 集成Parser和Renderer
- 管理子模块生命周期
- 错误处理

**代码行数限制**：不超过150行

### 3.3 xlsx子模块

#### 3.3.1 XlsxParser.js（xlsx解析器）

**职责**：
- 解析xlsx文件结构
- 提取工作表数据
- 提取单元格样式
- 处理合并单元格
- 处理公式

**代码行数限制**：不超过300行

#### 3.3.2 XlsxRenderer.js（xlsx渲染器）

**职责**：
- 将工作表数据渲染为HTML表格
- 处理单元格样式
- 支持冻结首行/首列
- 支持工作表切换
- 响应式表格布局

**代码行数限制**：不超过350行

#### 3.3.3 index.js（xlsx主入口）

**职责**：
- 子模块对外接口
- 集成Parser和Renderer
- 管理工作表切换
- 错误处理

**代码行数限制**：不超过150行

### 3.4 pptx子模块

#### 3.4.1 PptxParser.js（pptx解析器）

**职责**：
- 解析pptx文件结构
- 提取幻灯片数据
- 提取幻灯片元素（文本、图片、形状）
- 提取幻灯片布局
- 提取母板样式

**代码行数限制**：不超过300行

#### 3.4.2 PptxRenderer.js（pptx渲染器）

**职责**：
- 将幻灯片渲染为HTML
- 处理幻灯片布局
- 处理动画（可选，基础效果）
- 支持幻灯片切换
- 支持缩放

**代码行数限制**：不超过350行

#### 3.4.3 index.js（pptx主入口）

**职责**：
- 子模块对外接口
- 集成Parser和Renderer
- 管理幻灯片切换
- 错误处理

**代码行数限制**：不超过150行

## 4. 技术选型

### 4.1 第三方库（P0阶段）

#### docx解析
- **mammoth.js**：将docx转换为HTML
- 优点：成熟稳定，支持大多数docx特性
- 缺点：不支持复杂格式

#### xlsx解析
- **SheetJS (xlsx)**：解析Excel文件
- 优点：功能强大，支持各种Excel特性
- 缺点：文件较大

#### pptx解析
- **PptxGenJS** 或 **pptxjs**：解析PPTX文件
- 优点：支持基本PPTX特性
- 缺点：部分高级特性不支持

**注**：如果这些库不能满足需求，可以考虑自行实现解析器（基于Office Open XML标准）

### 4.2 不使用外部库的情况
如果第三方库不能满足需求（如文件过大、性能问题），将考虑：
- 基于Office Open XML标准自行实现
- 使用WebAssembly提升性能
- 流式解析大文件

## 5. 接口设计

### 5.1 OfficeAdapter接口

```javascript
interface OfficeAdapter {
  // 文件加载
  load(file: File, options: Object): Promise<void>
  
  // 渲染
  render(container: HTMLElement): void
  
  // 页面导航（PPTX专用）
  goToPage(pageNum: number): void
  nextPage(): void
  prevPage(): void
  
  // 缩放控制
  setZoom(zoomLevel: number): void
  getZoom(): number
  
  // 获取信息
  getFileInfo(): {
    fileName: string,
    fileSize: number,
    fileType: string,
    pageCount?: number,      // PPTX
    sheetCount?: number,     // XLSX
    author?: string,
    createdDate?: Date
  }
  
  // 销毁
  destroy(): void
  
  // 事件
  on(event: string, callback: Function): void
  off(event: string, callback: Function): void
  
  // 支持的事件类型
  // 'load' - 文件加载完成
  // 'error' - 加载失败
  // 'pageChange' - 页面变化（PPTX）
  // 'zoomChange' - 缩放变化
  // 'sheetChange' - 工作表变化（XLSX）
}
```

### 5.2 UI层接口回调

```javascript
// 渲染容器应该提供的CSS类
.office-preview-container {
  /* Office预览容器 */
}

.docx-preview {
  /* docx预览内容 */
}

.xlsx-preview {
  /* xlsx预览内容 */
}

.pptx-preview {
  /* pptx预览内容 */
}

.xlsx-sheet-tabs {
  /* 工作表标签 */
}

.pptx-page-nav {
  /* 幻灯片导航 */
}
```

## 6. 数据流设计

### 6.1 文件加载流程

```
用户上传文件
    ↓
FileTypeDetector检测文件类型
    ↓
OfficeAdapter.load(file)
    ↓
分发到对应子模块（docx/xlsx/pptx）
    ↓
子模块Parser解析文件
    ↓
生成中间表示
    ↓
子模块Renderer渲染HTML
    ↓
OfficeAdapter.render(container)
    ↓
UI显示预览内容
```

### 6.2 交互流程

```
用户操作（翻页、缩放、切换工作表）
    ↓
UI层触发操作
    ↓
OfficeAdapter接收操作
    ↓
调用子模块对应方法
    ↓
子模块更新渲染结果
    ↓
触发事件回调
    ↓
UI层更新界面
```

## 7. 错误处理

### 7.1 错误类型
- **文件格式错误**：文件损坏或格式不正确
- **文件过大**：超过内存限制
- **不支持特性**：文件包含不支持的特性
- **解析失败**：第三方库解析失败
- **渲染失败**：渲染过程出错

### 7.2 错误处理策略
```javascript
// 在OfficeAdapter中统一处理
try {
  await subModule.parse(file);
} catch (error) {
  if (error.type === 'file_format_error') {
    throw new PreviewError('文件格式不正确或文件已损坏');
  } else if (error.type === 'file_too_large') {
    throw new PreviewError('文件过大，暂不支持预览');
  } else {
    throw new PreviewError('文件加载失败，请重试');
  }
}
```

## 8. 性能优化

### 8.1 大文件优化
- **流式解析**：边解析边渲染，不等待整个文件解析完成
- **分页加载**：PPTX按需加载幻灯片
- **懒加载**：图片按需加载
- **内存管理**：及时清理不再使用的数据

### 8.2 渲染优化
- **虚拟滚动**：长文档使用虚拟滚动
- **Canvas渲染**：复杂表格考虑使用Canvas
- **WebWorker**：解析过程放在WebWorker中

### 8.3 缓存策略
- **文件缓存**：解析结果缓存到内存
- **Local Storage**：用户偏好设置缓存

## 9. 测试计划

### 9.1 单元测试
- 每个子模块的Parser测试
- 每个子模块的Renderer测试
- OfficeAdapter接口测试

### 9.2 集成测试
- 文件加载流程测试
- 交互功能测试
- 跨浏览器测试

### 9.3 性能测试
- 大文件加载测试（100MB+）
- 内存占用测试
- 渲染性能测试

## 10. 开发规范

### 10.1 代码规范
- 使用ES6+语法
- 每个文件代码行数不超过500行
- 充分的注释
- JSDoc类型注解

### 10.2 命名规范
- 文件名：PascalCase（如 DocxParser.js）
- 类名：PascalCase（如 DocxParser）
- 函数名：camelCase（如 parseDocx）
- 常量：UPPER_SNAKE_CASE（如 MAX_FILE_SIZE）

### 10.3 错误处理规范
- 所有异步操作必须try-catch
- 自定义错误类型
- 错误信息用户友好

## 11. 第一阶段开发任务（P0）

### 11.1 docx子模块（优先级：高）
- [ ] 创建docx子模块目录结构
- [ ] 实现DocxParser.js
- [ ] 实现DocxRenderer.js
- [ ] 实现index.js主入口
- [ ] 编写单元测试
- [ ] 性能测试和优化

### 11.2 xlsx子模块（优先级：高）
- [ ] 创建xlsx子模块目录结构
- [ ] 实现XlsxParser.js
- [ ] 实现XlsxRenderer.js
- [ ] 实现index.js主入口（支持工作表切换）
- [ ] 编写单元测试
- [ ] 性能测试和优化

### 11.3 pptx子模块（优先级：高）
- [ ] 创建pptx子模块目录结构
- [ ] 实现PptxParser.js
- [ ] 实现PptxRenderer.js
- [ ] 实现index.js主入口（支持幻灯片切换）
- [ ] 编写单元测试
- [ ] 性能测试和优化

### 11.4 OfficeAdapter（优先级：高）
- [ ] 实现OfficeAdapter.js
- [ ] 实现文件类型分发
- [ ] 实现统一错误处理
- [ ] 实现事件系统
- [ ] 编写集成测试

### 11.5 集成测试（优先级：中）
- [ ] 端到端测试
- [ ] 跨浏览器测试
- [ ] 性能基准测试

## 12. 待开发格式（后续阶段）

### 12.1 P1阶段
- doc
- xls
- ppt
- csv

### 12.2 P2阶段
- wps
- et
- dps

## 13. 风险与挑战

### 13.1 技术风险
- **第三方库限制**：第三方库可能不支持某些特性
- **大文件性能**：大Office文件的解析和渲染性能
- **格式兼容性**：不同版本的Office文件格式差异

### 13.2 解决方案
- 评估多个第三方库，选择最适合的
- 必要时自行实现解析器
- 流式处理和懒加载优化性能

## 14. 参考资源

### 14.1 Office Open XML标准
- [ECMA-376](https://www.ecma-international.org/publications-and-standards/standards/ecma-376/)
- [MS-OI29500](https://docs.microsoft.com/en-us/openspecs/office_standards/)

### 14.2 第三方库文档
- [mammoth.js](https://github.com/mwilliamson/mammoth.js)
- [SheetJS](https://github.com/SheetJS/sheetjs)
- [PptxGenJS](https://github.com/gitbrent/PptxGenJS)

---

**文档版本**: 1.0  
**创建日期**: 2024  
**负责人**: Office模块负责人  
**审核状态**: 待审核
