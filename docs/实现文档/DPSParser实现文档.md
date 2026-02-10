# WPS演示解析器实现文档

## 1. 概述

### 1.1 实现目标
开发一个纯前端的WPS演示（.DPS）文件解析器，支持：
- 解析压缩的XML格式
- 提取幻灯片内容
- 处理共享字符串
- 提取并转换媒体文件

### 1.2 技术栈
- **语言**: JavaScript ES6+
- **解析方式**: ZIP解压 + XML解析
- **编码支持**: UTF-8
- **不依赖**: 任何第三方库

### 1.3 文件结构
```
src/parsers/DPSParser.js       # 主解析器（< 500行）
tests/unit/parsers/DPSParser.test.js  # 单元测试
docs/实现文档/DPSParser实现文档.md   # 本文档
```

## 2. WPS演示文件格式

### 2.1 文件结构
.DPS文件是ZIP压缩的XML格式：

```
example.dps
├── [Content_Types].xml
├── _rels/
├── Presentation.xml 或 1.xml       # 演示文稿定义
├── 2.xml, 3.xml, ...              # 幻灯片文件
├── SharedStrings.xml               # 共享字符串表
├── media/                          # 媒体文件
│   ├── image1.png
│   └── image2.jpg
└── ...
```

### 2.2 与PPTX的对比

| 特性 | PPTX | DPS |
|------|------|-----|
| 格式 | ZIP + XML | ZIP + XML |
| 演示文稿 | ppt/presentation.xml | Presentation.xml 或 1.xml |
| 幻灯片 | ppt/slides/slideN.xml | 2.xml, 3.xml, 4.xml... |
| 命名规则 | slideN.xml | 简单数字序列 |
| 共享字符串 | ppt/sharedStrings.xml | SharedStrings.xml |

## 3. 核心类设计

### 3.1 DPSParser类

#### 类属性
```javascript
class DPSParser {
  sharedStrings: Array<string>   // 共享字符串表
  presentation: Object          // 演示文稿信息
  dpsFiles: Object             // ZIP解压后的文件映射
}
```

#### 主要方法

| 方法名 | 参数 | 返回值 | 说明 |
|--------|------|--------|------|
| `parse(fileData)` | ArrayBuffer | Promise<Object> | 解析.DPS文件 |
| `validate(fileData)` | ArrayBuffer | boolean | 验证文件格式 |
| `getMetadata(fileData)` | ArrayBuffer | Object | 获取元数据 |
| `parseZIP(fileData)` | ArrayBuffer | Promise<void> | 解压ZIP文件 |
| `parsePresentation(xmlData)` | ArrayBuffer | Object | 解析演示文稿 |
| `parseSlide(xmlData)` | ArrayBuffer | Object | 解析幻灯片 |
| `parseShape(shapeElement)` | Element | Object | 解析形状 |
| `parseImage(imageElement)` | Element | Object | 解析图片 |
| `parseSharedStrings(xmlData)` | ArrayBuffer | void | 解析共享字符串 |
| `parseMedia()` | - | Array<Object> | 解析媒体文件 |
| `arrayBufferToBase64(buffer)` | ArrayBuffer | string | ArrayBuffer转Base64 |
| `decodeXML(data)` | ArrayBuffer | string | 解码XML |

## 4. 解析流程

### 4.1 整体流程图

```
输入: .DPS文件 (ArrayBuffer)
    ↓
[1] ZIP解压
    ↓
    ├─→ Presentation.xml (演示文稿)
    ├─→ 2.xml, 3.xml, ... (幻灯片)
    ├─→ SharedStrings.xml (共享字符串)
    └─→ media/ (媒体文件)
            ↓
[2] 解析演示文稿
            ↓
    └─→ 获取幻灯片列表
            ↓
[3] 解析每个幻灯片
            ↓
    ├─→ 形状元素
    ├─→ 文本元素
    └─→ 图片引用
            ↓
[4] 解析共享字符串
            ↓
[5] 提取媒体文件
            ↓
    └─→ 转换为Base64
            ↓
输出: 结构化演示文稿数据
```

### 4.2 详细步骤

#### 步骤1: ZIP解压
```javascript
async parseZIP(fileData) {
  const zipParser = new ZIPParser();
  const zipResult = await zipParser.parse(fileData);
  
  // 转换为文件名映射
  this.dpsFiles = {};
  for (const fileInfo of zipResult.files) {
    const content = await zipParser.readFile(fileInfo.name);
    this.dpsFiles[fileInfo.name] = content.buffer;
  }
}
```

#### 步骤2: 解析演示文稿
```javascript
parsePresentation(xmlData) {
  const text = this.decodeXML(xmlData);
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'application/xml');
  
  const slides = [];
  const slideElements = doc.getElementsByTagName('slide');
  
  for (let i = 0; i < slideElements.length; i++) {
    const slide = slideElements[i];
    const id = slide.getAttribute('id') || (i + 1);
    const fileName = slide.getAttribute('filename') || `${i + 2}.xml`;
    const name = slide.getAttribute('name') || `幻灯片${i + 1}`;
    
    slides.push({ id: parseInt(id), name, fileName });
  }
  
  return { slides };
}
```

#### 步骤3: 解析幻灯片
```javascript
async parseSlide(xmlData) {
  const text = this.decodeXML(xmlData);
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'application/xml');
  
  const slide = {
    elements: [],
    shapes: [],
    texts: []
  };
  
  // 解析形状
  const shapeElements = doc.getElementsByTagName('shape');
  for (let i = 0; i < shapeElements.length; i++) {
    const shape = this.parseShape(shapeElements[i]);
    if (shape) {
      slide.shapes.push(shape);
    }
  }
  
  // 解析文本
  const textElements = doc.getElementsByTagName('text');
  for (let i = 0; i < textElements.length; i++) {
    const textNode = textElements[i].getElementsByTagName('t')[0];
    if (textNode) {
      // 处理共享字符串引用
      let displayText = textNode.textContent;
      if (displayText.startsWith('#')) {
        const index = parseInt(displayText.substring(1));
        displayText = this.sharedStrings[index] || displayText;
      }
      
      slide.texts.push({
        content: displayText,
        position: { x: 0, y: 0 },
        style: null
      });
    }
  }
  
  // 解析图片
  const imageElements = doc.getElementsByTagName('image');
  for (let i = 0; i < imageElements.length; i++) {
    const image = this.parseImage(imageElements[i]);
    if (image) {
      slide.elements.push(image);
    }
  }
  
  return slide;
}
```

#### 步骤4: 媒体文件处理
```javascript
parseMedia() {
  const media = [];
  
  for (const fileName of Object.keys(this.dpsFiles)) {
    if (fileName.startsWith('media/')) {
      const fileData = this.dpsFiles[fileName];
      const mediaType = this.getMediaType(fileName);
      const base64 = this.arrayBufferToBase64(fileData);
      
      media.push({
        fileName: fileName,
        type: mediaType,
        data: base64,
        size: fileData.byteLength
      });
    }
  }
  
  return media;
}
```

## 5. 数据结构

### 5.1 解析结果格式

```javascript
{
  type: 'wps-presentation',
  version: 'dps',
  slides: [
    {
      id: 1,
      name: '幻灯片1',
      data: {
        elements: [
          { type: 'image', ref: 'media/image1.png', position: {...} },
          { type: 'shape', id: 'shape1', position: {...}, size: {...} }
        ],
        shapes: [...],
        texts: [
          { content: '标题', position: {...}, style: null }
        ]
      }
    }
  ],
  media: [
    {
      fileName: 'media/image1.png',
      type: 'image/png',
      data: 'iVBORw0KGgoAAAANS...',
      size: 1024
    }
  ],
  metadata: {
    slideCount: 2,
    hasSharedStrings: true,
    hasMedia: true
  }
}
```

## 6. 单元测试

### 6.1 测试覆盖

#### 单元测试（20个用例）
- ✅ ArrayBuffer转Base64（2个）
- ✅ 媒体类型识别（4个）
- ✅ XML解码（2个）
- ✅ 文件验证（2个）
- ✅ 元数据获取（1个）
- ✅ 演示文稿解析（2个）
- ✅ 形状解析（3个）
- ✅ 图片元素解析（2个）
- ✅ 共享字符串解析（2个）

## 7. 已知限制

### 7.1 功能限制
- ⚠️ 样式解析未实现（V1.0.0）
- ⚠️ 动画效果未解析
- ⚠️ 转场效果未解析
- ⚠️ 音频和视频未完全支持

### 7.2 性能限制
- ⚠️ 大文件可能占用较多内存
- ⚠️ Base64转换会增加数据体积约33%

## 8. 使用示例

### 8.1 基本使用

```javascript
import { DPSParser } from './DPSParser.js';

// 创建解析器实例
const parser = new DPSParser();

// 读取文件
const fileInput = document.getElementById('fileInput');
const file = fileInput.files[0];
const fileData = await file.arrayBuffer();

// 解析文件
try {
  const result = await parser.parse(fileData);
  
  console.log('幻灯片数量:', result.slides.length);
  console.log('媒体文件数量:', result.media.length);
  
  // 遍历幻灯片
  for (const slide of result.slides) {
    console.log(`幻灯片: ${slide.name}`);
    
    for (const text of slide.data.texts) {
      console.log(`  文本: ${text.content}`);
    }
    
    for (const shape of slide.data.shapes) {
      console.log(`  形状: ${shape.type} at (${shape.position.x}, ${shape.position.y})`);
    }
  }
  
  // 查看媒体
  for (const media of result.media) {
    console.log(`媒体: ${media.fileName} (${media.type}), ${media.size} bytes`);
  }
  
} catch (error) {
  console.error('解析失败:', error);
}
```

## 9. 总结

### 9.1 实现成果
- ✅ 完整的WPS演示解析器
- ✅ 纯JavaScript实现，无第三方依赖
- ✅ 支持核心功能（幻灯片解析、共享字符串、媒体提取）
- ✅ 完整的单元测试（20个用例）
- ✅ 详细的技术文档

### 9.2 代码质量
- ✅ 代码量控制（400行）
- ✅ 完整的JSDoc注释
- ✅ 清晰的模块划分
- ✅ 良好的错误处理

---

**实现日期**: 2026-02-09  
**实现人员**: 程序员（Excel解析器）  
**文档版本**: v1.0
