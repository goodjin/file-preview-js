# 图片预览模块设计文档

## 1. 模块概述

### 1.1 职责
图片预览模块负责在浏览器中直接展示图片文件内容，支持jpg、png、gif、bmp、svg、webp、psd、tif等8种图片格式。

### 1.2 设计目标
- 快速加载和渲染图片
- 支持图片缩放、旋转等基本操作
- 支持GIF动画播放
- 支持矢量格式（SVG）无损缩放
- 支持特殊格式（PSD、TIFF）的兼容预览
- 良好的用户体验和交互反馈

## 2. 技术选型

### 2.1 核心技术
- **原生Image对象**：用于加载和渲染图片
- **Canvas API**：用于图片缩放、旋转等高级操作
- **FileReader API**：用于读取本地图片文件
- **SVG DOM API**：用于SVG格式操作
- **DataURL和Blob**：用于文件解析

### 2.2 不使用第三方库
- 本模块纯JavaScript实现，不依赖任何第三方图片处理库
- 使用浏览器原生能力实现所有功能

## 3. 模块架构

### 3.1 模块结构
```
src/implementations/image/
├── image-module-design.md          # 模块设计文档（本文件）
├── ImagePreviewer.js               # 图片预览器主类
├── JpgPreviewer.js                 # JPG格式预览器
├── PngPreviewer.js                 # PNG格式预览器
├── GifPreviewer.js                 # GIF格式预览器
├── BmpPreviewer.js                 # BMP格式预览器
├── SvgPreviewer.js                 # SVG格式预览器
├── WebpPreviewer.js                # WebP格式预览器
├── PsdPreviewer.js                 # PSD格式预览器
├── TifPreviewer.js                 # TIFF格式预览器
├── ImageUtils.js                   # 图片工具函数
└── ImageConstants.js               # 常量定义
```

### 3.2 类设计

#### 3.2.1 ImagePreviewer (主类)
**职责**：图片预览模块的统一入口
**代码量**：约280行

```javascript
主要方法：
- constructor(options)              // 构造函数
- preview(file, container)          // 预览图片主方法
- getFileType(file)                // 获取图片类型
- createPreviewer(type)            // 创建对应格式的预览器
- destroy()                        // 销毁资源
```

#### 3.2.2 JpgPreviewer
**职责**：JPG格式图片预览
**代码量**：约380行

```javascript
主要方法：
- load(file)                       // 加载JPG文件
- render(container)                // 渲染到容器
- scale(factor)                    // 缩放
- rotate(angle)                    // 旋转
- reset()                          // 重置视图
```

#### 3.2.3 PngPreviewer
**职责**：PNG格式图片预览（支持透明度）
**代码量**：约400行

```javascript
主要方法：
- load(file)                       // 加载PNG文件
- render(container)                // 渲染到容器（棋盘格背景）
- scale(factor)                    // 缩放
- rotate(angle)                    // 旋转
- reset()                          // 重置视图
```

#### 3.2.4 GifPreviewer
**职责**：GIF格式图片预览（支持动画）
**代码量**：约450行

```javascript
主要方法：
- load(file)                       // 加载GIF文件
- render(container)                // 渲染到容器
- play()                           // 播放动画
- pause()                          // 暂停动画
- scale(factor)                    // 缩放
- rotate(angle)                    // 旋转
```

#### 3.2.5 BmpPreviewer
**职责**：BMP格式图片预览
**代码量**：约350行

```javascript
主要方法：
- load(file)                       // 加载BMP文件（支持未压缩格式）
- render(container)                // 渲染到容器
- scale(factor)                    // 缩放
- rotate(angle)                    // 旋转
- reset()                          // 重置视图

特殊处理：
- BMP文件头部解析
- 位图数据解码
- 支持不同色彩深度（1/4/8/24/32位）
```

#### 3.2.6 SvgPreviewer
**职责**：SVG格式图片预览（矢量图）
**代码量**：约400行

```javascript
主要方法：
- load(file)                       // 加载SVG文件
- render(container)                // 渲染到容器（嵌入DOM）
- scale(factor)                    // 缩放（无损）
- rotate(angle)                    // 旋转
- reset()                          // 重置视图

特殊处理：
- SVG作为DOM元素嵌入（而非img标签）
- 支持无限缩放
- 保持矢量特性
- 支持SVG内部动画
```

#### 3.2.7 WebpPreviewer
**职责**：WebP格式图片预览
**代码量**：约350行

```javascript
主要方法：
- load(file)                       // 加载WebP文件
- render(container)                // 渲染到容器
- scale(factor)                    // 缩放
- rotate(angle)                    // 旋转
- reset()                          // 重置视图

特殊处理：
- 浏览器兼容性检查（现代浏览器支持）
- 动画WebP支持
- 损失压缩特性处理
```

#### 3.2.8 PsdPreviewer
**职责**：PSD格式图片预览（兼容模式）
**代码量**：约450行

```javascript
主要方法：
- load(file)                       // 加载PSD文件
- render(container)                // 渲染到容器
- scale(factor)                    // 缩放
- rotate(angle)                    // 旋转
- reset()                          // 重置视图

特殊处理：
- PSD文件头部解析
- 合成图层预览（仅渲染合并后的图像）
- 提取缩略图或位图数据
- 不支持图层编辑（仅预览）
- 不支持智能对象（显示占位符）
```

#### 3.2.9 TifPreviewer
**职责**：TIFF格式图片预览
**代码量**：约450行

```javascript
主要方法：
- load(file)                       // 加载TIFF文件
- render(container)                // 渲染到容器
- scale(factor)                    // 缩放
- rotate(angle)                    // 旋转
- reset()                          // 重置视图

特殊处理：
- TIFF文件头部解析（IFD结构）
- 支持单页TIFF
- 基础压缩格式支持（未压缩、LZW）
- 支持RGB和灰度模式
- 不支持多页TIFF（仅预览第一页）
```

#### 3.2.10 ImageUtils
**职责**：图片处理工具函数
**代码量**：约300行

```javascript
主要函数：
- validateFile(file, type)         // 验证文件类型
- loadImage(file)                  // 加载图片
- getDimensions(img)               // 获取图片尺寸
- createCanvas(img, options)       // 创建Canvas
- parseBMP(arrayBuffer)            // 解析BMP文件
- parsePSD(arrayBuffer)            // 解析PSD文件
- parseTIFF(arrayBuffer)           // 解析TIFF文件
- isSvgContent(content)            // 判断SVG内容
```

#### 3.2.11 ImageConstants
**职责**：常量定义
**代码量**：约100行

```javascript
主要常量：
- SUPPORTED_FORMATS               // 支持的格式列表（扩展到8种）
- FILE_TYPES                       // 文件类型映射
- ERROR_MESSAGES                  // 错误信息
- DEFAULT_OPTIONS                 // 默认配置
- BMP_SIGNATURES                  // BMP文件签名
- PSD_SIGNATURES                  // PSD文件签名
- TIFF_SIGNATURES                 // TIFF文件签名
```

## 4. 功能设计

### 4.1 核心功能

#### 4.1.1 文件加载
- 使用FileReader读取文件为DataURL
- 创建Image对象加载图片
- 支持大文件的加载提示
- 特殊格式解析（BMP、PSD、TIFF）

#### 4.1.2 图片渲染
- 使用img标签渲染位图（JPG、PNG、GIF、BMP、WebP）
- 使用DOM嵌入渲染SVG
- 使用Canvas渲染特殊格式（PSD、TIFF）
- 图片居中显示
- 自适应容器大小

#### 4.1.3 缩放控制
- 支持缩放比例：25%, 50%, 75%, 100%, 150%, 200%, 300%, 400%
- 支持鼠标滚轮缩放
- 保持图片宽高比
- SVG支持无损缩放

#### 4.1.4 旋转控制
- 支持90度旋转（顺时针/逆时针）
- 重置视图功能

#### 4.1.5 动画支持
- GIF动画自动播放
- 提供播放/暂停控制
- SVG内部动画支持
- 动画WebP支持

### 4.2 交互功能

#### 4.2.1 鼠标交互
- 拖拽平移图片
- 滚轮缩放
- 双击重置视图

#### 4.2.2 触摸交互（移动端）
- 单指拖拽平移
- 双指缩放
- 双击重置视图

#### 4.2.3 键盘交互
- 方向键：平移图片
- +/-键：缩放
- R键：旋转
- ESC键：重置视图

### 4.3 UI集成

#### 4.3.1 与UI层接口
- 支持自定义容器
- 支持事件回调：加载成功、加载失败、缩放变化、旋转变化
- 提供图片元数据：尺寸、类型、大小

#### 4.3.2 工具栏集成
- 缩放控制按钮
- 旋转按钮
- 重置按钮
- 播放/暂停按钮（仅GIF、动画WebP）

## 5. 数据流设计

### 5.1 预览流程
```
用户上传文件
  ↓
验证文件类型
  ↓
如果是普通格式（JPG/PNG/GIF/BMP/WebP）
  → FileReader读取为DataURL
  → 创建Image对象
  → Image加载完成
  → 创建对应预览器
  → 渲染到容器

如果是SVG
  → FileReader读取为文本
  → 解析SVG内容
  → 嵌入DOM
  → 创建SvgPreviewer
  → 渲染到容器

如果是特殊格式（PSD/TIFF）
  → FileReader读取为ArrayBuffer
  → 解析文件头部
  → 提取位图数据
  → 创建Canvas绘制
  → 创建对应预览器
  → 渲染到容器
  ↓
绑定交互事件
  ↓
完成预览
```

### 5.2 错误处理流程
```
文件加载失败
  ↓
验证文件类型和大小
  ↓
如果不是支持的格式，返回错误
  ↓
如果是支持的格式但解析失败，显示友好提示
  ↓
记录错误日志
```

## 6. 性能优化

### 6.1 加载优化
- 大文件显示加载进度
- 超大图片（>10MB）提示用户
- 使用渐进式加载
- PSD/TIFF只提取必要数据

### 6.2 渲染优化
- 使用CSS transform实现缩放和旋转（硬件加速）
- 缩放时使用图片标签，高级操作使用Canvas
- SVG使用DOM元素利用浏览器优化
- 动画使用requestAnimationFrame

### 6.3 内存管理
- 及时释放不再使用的Image对象
- 预览器销毁时清理所有资源
- 避免内存泄漏
- 大文件及时清理

## 7. 错误处理

### 7.1 错误类型
- 文件类型不支持
- 文件损坏
- 加载超时
- 内存不足
- 解析失败（PSD/TIFF）
- 浏览器不支持（WebP）

### 7.2 错误处理策略
- 友好的错误提示
- 提供重试机制
- 记录错误信息
- 不影响其他模块运行
- 降级处理（PSD无法解析时显示占位符）

## 8. 测试要点

### 8.1 功能测试
- 所有8种格式的正常预览
- 缩放功能
- 旋转功能
- GIF/动画WebP播放
- SVG无损缩放
- PSD/TIFF基本预览
- 大文件加载

### 8.2 边界测试
- 极小图片（1px）
- 超大图片（100MB+）
- 空文件
- 损坏的图片文件
- 不支持的TIFF压缩格式
- 复杂的PSD文件

### 8.3 兼容性测试
- Chrome（全部格式）
- Firefox（WebP可能不支持）
- Safari（WebP可能不支持）
- Edge（全部格式）
- 移动端浏览器

### 8.4 性能测试
- 加载时间
- 缩放响应速度
- 内存占用
- CPU占用

## 9. 开发规范

### 9.1 代码规范
- 使用ES6+语法
- 遵循驼峰命名法
- 每个方法添加JSDoc注释
- 代码量控制在500行以内

### 9.2 命名规范
- 类名：大驼峰（PascalCase）
- 方法名：小驼峰（camelCase）
- 常量：大写下划线（UPPER_SNAKE_CASE）
- 私有方法：下划线前缀（_privateMethod）

### 9.3 注释规范
```javascript
/**
 * PSD格式预览器
 * @class PsdPreviewer
 * @description 负责PSD格式图片的预览（兼容模式，仅支持合成图预览）
 */
class PsdPreviewer {
  /**
   * 解析PSD文件头部
   * @private
   * @param {ArrayBuffer} arrayBuffer - 文件数据
   * @returns {Object} 解析结果
   */
  _parseHeader(arrayBuffer) {
    // ...
  }
}
```

## 10. 扩展性设计

### 10.1 格式扩展
- 模块设计支持后续添加更多格式
- 新增格式只需实现相同接口
- 无需修改主预览器代码

### 10.2 功能扩展
- 预留滤镜功能接口
- 预留裁剪功能接口
- 预留标注功能接口

## 11. 与其他模块的交互

### 11.1 核心框架层
- 注册到预览器工厂
- 实现统一的预览器接口
- 通过事件总线通信

### 11.2 UI层
- 接收UI层传入的容器
- 向UI层提供控制接口
- 响应UI层的事件触发

### 11.3 状态管理
- 保存缩放状态
- 保存旋转状态
- 保存播放状态（GIF、动画WebP）

## 12. 交付标准

### 12.1 第一阶段交付（v0.1.0 - 已完成）
- ✅ JPG格式预览
- ✅ PNG格式预览（支持透明度）
- ✅ GIF格式预览（含动画）
- ✅ 缩放功能
- ✅ 旋转功能
- ✅ 触摸交互（移动端）
- ✅ 错误处理

### 12.2 第二阶段交付（v0.2.0 - 进行中）
- ⏳ BMP格式预览
- ⏳ SVG格式预览（矢量，无损缩放）
- ⏳ WebP格式预览（含动画支持）
- ⏳ PSD格式预览（兼容模式）
- ⏳ TIFF格式预览（单页）

### 12.3 性能交付
- 加载时间 < 2s（10MB以内）
- 缩放响应 < 100ms
- 内存占用 < 50MB（单张图片）

### 12.4 质量交付
- 代码注释率 > 30%
- 单元测试覆盖率 > 80%
- 代码无lint警告
- 所有测试通过

## 13. 版本记录

### v0.1.0 - 第一阶段（已完成）
- 实现jpg、png、gif三种格式预览
- 基础缩放、旋转功能
- 移动端触摸支持
- PNG透明度支持
- GIF动画控制

### v0.2.0 - 第二阶段（进行中）
- 添加bmp、svg、webp、psd、tif格式
- SVG矢量支持
- PSD兼容预览
- TIFF基础支持

### 后续版本计划
- 增加滤镜功能
- 增加裁剪功能
- 增加标注功能
- 支持TIFF多页
- 支持PSD图层预览

---

**文档版本**: 2.0  
**编写日期**: 2024  
**模块负责人**: 图片模块设计师  
**审核人**: 架构师
