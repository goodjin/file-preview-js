# PPTParser 实现文档

## 1. 概述

PPTParser是文件预览系统的组件之一，用于解析PPT文档（.ppt格式）。PPT是旧版Microsoft PowerPoint的二进制格式，基于OLE2复合文档。PPTParser使用OLE2Parser解析OLE2文档结构，然后解析PPTDocument流和Slide流，提取幻灯片、文本、形状、图片等内容。

## 2. 设计目标

- **完全自研**：不依赖任何第三方库
- **功能完整**：支持幻灯片提取、文本提取、形状解析、图片提取
- **兼容性好**：支持主流浏览器
- **代码精简**：代码量不超过500行

## 3. PPT文件格式

### 3.1 OLE2复合文档结构

PPT文件是OLE2复合文档格式，结构如下：

```
PPT文件（OLE2格式）
├── Header（文件头，512字节）
├── SAT（扇区分配表）
├── Directory（目录）
└── Streams（数据流）
    ├── PPT Document - 类似DOC的FIB
    ├── Slide 1 - 第一张幻灯片
    ├── Slide 2 - 第二张幻灯片
    ├── ...
    ├── Pictures - 嵌入的图片
    └── Current User - 用户信息
```

### 3.2 PPTDocument流

PPTDocument流包含PPT文件的核心信息：

```
偏移  长度  描述
0     2     Magic Number
2     2     版本号
...
幻灯片信息
```

版本号对应表：
- 0x03D4: PowerPoint 97
- 0x03D8: PowerPoint 2000
- 0x03DD: PowerPoint 2002/2003

### 3.3 Slide流

每张幻灯片是一个独立的流，包含：
- 文本内容
- 形状（矩形、椭圆、线条等）
- 图片引用
- 动画信息（V1.0.0不支持）

## 4. 实现细节

### 4.1 解析流程

1. **验证文件格式**：使用OLE2Parser验证PPT格式
2. **解析OLE2结构**：使用OLE2Parser解析文档结构
3. **解析PPTDocument流**：获取PPT核心信息
4. **解析Slide流**：提取每张幻灯片内容
5. **提取图片**：从Pictures流中提取图片

### 4.2 幻灯片提取

幻灯片提取通过遍历OLE2结构中的Slide流实现：

```javascript
for (const streamName of Object.keys(streams)) {
  if (streamName.startsWith('Slide ') || streamName.startsWith('Slide')) {
    const slideData = this.parseSlide(streams[streamName]);
    slides.push({ number: slideNumber++, ...slideData });
  }
}
```

### 4.3 文本提取

V1.0.0采用简化实现，类似于DOCParser：

```javascript
extractTextFromSlide(slideData) {
  let offset = 512; // 跳过幻灯片头部
  for (let i = offset; i < length; i++) {
    const byte = view.getUint8(i);
    if (byte >= 0x20 && byte <= 0x7E) {
      text += String.fromCharCode(byte);
    }
  }
}
```

### 4.4 形状解析

V1.0.0暂不支持形状解析，返回空数组。完整的形状解析需要：
- 解析PPT的形状记录类型
- 提取形状属性（位置、大小、颜色）
- 支持基本形状（矩形、椭圆、线条、文本框）

### 4.5 图片提取

图片提取通过遍历OLE2结构中的Picture流实现：

```javascript
for (const streamName of Object.keys(streams)) {
  if (streamName.includes('Picture') || streamName.includes('Image')) {
    const imageData = streams[streamName];
    const mimeType = this.detectMimeType(imageData);
    images.push({
      id: streamName,
      data: `data:${mimeType};base64,${...}`,
      mimeType
    });
  }
}
```

## 5. API接口

### 5.1 parse(fileData)

解析PPT文档。

**参数**：
- `fileData` (ArrayBuffer): PPT文件二进制数据

**返回值**：
- Promise<Object>: 解析结果
  ```javascript
  {
    type: 'powerpoint',
    format: 'PPT',
    slides: [
      {
        number: 1,
        text: '幻灯片文本内容',
        shapes: [],
        elements: [
          { type: 'text', content: '幻灯片文本内容' }
        ]
      }
    ],
    images: [
      {
        id: 'Picture 1',
        name: 'Picture 1',
        data: 'data:image/png;base64,iVBORw0KG...',
        mimeType: 'image/png'
      }
    ],
    metadata: {
      format: 'PPT',
      version: 'PowerPoint 97',
      slideCount: 1
    }
  }
  ```

**示例**：
```javascript
const parser = new PPTParser();
const result = await parser.parse(fileData);
console.log(result.slides);
```

### 5.2 validate(fileData)

验证PPT文档格式。

**参数**：
- `fileData` (ArrayBuffer): PPT文件二进制数据

**返回值**：
- Promise<boolean>: 是否为有效的PPT文件

### 5.3 getMetadata(fileData)

获取PPT文档的元数据。

**参数**：
- `fileData` (ArrayBuffer): PPT文件二进制数据

**返回值**：
- Promise<Object>: 元数据

## 6. 使用示例

### 6.1 基本使用

```javascript
import PPTParser from './src/parsers/PPTParser.js';

// 创建解析器实例
const parser = new PPTParser();

// 解析PPT文件
const arrayBuffer = await fetch('presentation.ppt').then(r => r.arrayBuffer());
const result = await parser.parse(arrayBuffer);

// 输出幻灯片内容
result.slides.forEach(slide => {
  console.log(`幻灯片 ${slide.number}:`);
  console.log(slide.text);
});

// 输出元数据
console.log('PowerPoint版本:', result.metadata.version);
console.log('幻灯片数量:', result.metadata.slideCount);
```

### 6.2 渲染为HTML

```javascript
function renderPPTToHTML(pptData) {
  const html = pptData.slides.map(slide => {
    return `
      <div class="slide">
        <h3>幻灯片 ${slide.number}</h3>
        <p>${slide.text.replace(/\n/g, '<br>')}</p>
      </div>
    `;
  }).join('');

  return `<div class="ppt-content">${html}</div>`;
}

const result = await parser.parse(fileData);
const html = renderPPTToHTML(result);
document.getElementById('preview').innerHTML = html;
```

## 7. 性能考虑

### 7.1 大文件处理

对于大PPT文档，建议：

1. 使用Web Worker在后台线程中解析
2. 显示进度条提升用户体验
3. 按需加载幻灯片

### 7.2 内存优化

- 及时释放不再需要的OLE2结构
- 避免一次性加载所有幻灯片到内存

## 8. 测试

### 8.1 单元测试

单元测试覆盖以下方面：

- ✓ 文件格式验证
- ✓ PPTDocument解析
- ✓ 幻灯片解析
- ✓ 文本提取
- ✓ 图片提取
- ✓ MIME类型检测
- ✓ 版本识别
- ✓ 元数据提取

### 8.2 测试文件

建议的测试用例：

1. 单张幻灯片的PPT
2. 多张幻灯片的PPT
3. 包含图片的PPT
4. 包含形状的PPT
5. PowerPoint 97文件
6. PowerPoint 2000文件
7. 大型PPT（>10MB）
8. 包含中文的PPT

### 8.3 运行测试

```bash
npm test
```

## 9. 已知限制

### 9.1 V1.0.0限制

1. **文本提取简化**：V1.0.0采用简化的文本提取算法
2. **形状不支持**：暂不支持形状解析
3. **动画不支持**：暂不支持动画效果
4. **布局不支持**：暂不支持幻灯片布局
5. **图片定位**：只支持图片提取，不支持图片在幻灯片中的位置
6. **版本兼容性**：主要支持PowerPoint 97-2003，旧版本支持有限

### 9.2 浏览器兼容性

| 浏览器 | 最低版本 | 说明 |
|--------|----------|------|
| Chrome | 80+ | 支持DataView、ArrayBuffer |
| Firefox | 113+ | 支持DataView、ArrayBuffer |
| Safari | 16.4+ | 支持DataView、ArrayBuffer |
| Edge | 80+ | 支持DataView、ArrayBuffer |

**注意**：依赖OLE2Parser，纯二进制解析。

## 10. 与其他解析器的对比

| 特性 | PPTParser | DOCParser | WordParser | WPSParser |
|------|-----------|-----------|------------|-----------|
| 基础依赖 | OLE2Parser | OLE2Parser | ZIPParser | ZIPParser |
| 文件格式 | PPT（二进制） | DOC（二进制） | DOCX（XML） | WPS（XML） |
| 解析复杂度 | 高 | 高 | 中 | 中 |
| 文本提取 | 简化实现 | 简化实现 | 完整实现 | 完整实现 |
| 形状支持 | 不支持 | 不支持 | - | - |
| 图片支持 | 支持 | 不支持 | 支持 | 支持 |
| 动画支持 | 不支持 | - | - | - |
| 代码量 | ~340行 | ~180行 | ~500行 | ~350行 |

## 11. 后续优化方向

1. **完整文本提取**：支持PPT的文本记录格式
2. **形状解析**：支持基本形状（矩形、椭圆、线条、文本框）
3. **布局支持**：支持幻灯片布局
4. **图片定位**：支持图片在幻灯片中的位置和尺寸
5. **动画支持**：支持基本的动画效果（可选）
6. **版本兼容**：增强对不同PowerPoint版本的支持

## 12. 常见问题

### Q1: PPT和PPTX有什么区别？

A: PPT是旧版PowerPoint的二进制格式，基于OLE2复合文档；PPTX是新版PowerPoint的XML格式，基于ZIP压缩。PPT格式更复杂，解析难度更高。

### Q2: 为什么文本提取是简化的？

A: PPT的文本存储采用复杂的记录格式，完整实现需要大量的代码和复杂的逻辑。V1.0.0采用简化实现以满足代码量和开发时间的限制。

### Q3: 支持哪些PowerPoint版本？

A: 当前版本主要支持PowerPoint 97-2003，对于旧版本（PowerPoint 95及以下）的支持有限。

### Q4: 为什么不支持形状？

A: PPT的形状解析需要处理复杂的形状记录类型和属性，V1.0.0优先实现核心功能（文本提取、幻灯片列表），形状解析将在后续版本中完善。

### Q5: 为什么复用OLE2Parser？

A: PPT和DOC都是基于OLE2复合文档格式，OLE2Parser作为公共工具类可以被PPT和DOC解析器复用，避免重复代码，符合架构设计。

## 13. 总结

PPTParser实现了基础的PPT文档解析功能，包括：
- ✓ OLE2复合文档结构解析（通过OLE2Parser）
- ✓ PPTDocument流解析
- ✓ 幻灯片列表提取
- ✓ 基础文本提取
- ✓ 图片提取
- ✓ PowerPoint版本识别（PowerPoint 97/2000/2002/2003）

代码结构清晰，注释完整，符合架构设计规范。由于PPT格式的复杂性，V1.0.0采用简化实现，满足基本需求。后续版本可以逐步完善更多功能。

---

**文档版本**：v1.0  
**最后更新**：2024年1月  
**作者**：文件预览系统研发团队
