# 核心框架层设计文档

## 1. 模块概述

核心框架层是文件预览系统的基础设施层，为上层业务逻辑提供核心能力支持。本层采用工厂模式、发布订阅模式和状态管理模式，实现系统的核心功能。

### 1.1 设计目标

- **模块化**：各模块职责单一，松耦合
- **可扩展**：易于添加新的文件类型和预览器
- **可维护**：代码清晰，易于理解和维护
- **高性能**：支持大文件预览，快速响应
- **纯前端**：不依赖服务端解析，全部在浏览器中完成

### 1.2 技术原则

- 每个模块代码量不超过500行
- 充分的单元测试覆盖
- 清晰的代码注释和文档
- 遵循ES6+规范
- 使用TypeScript类型定义（可选）

## 2. 模块设计

### 2.1 PreviewerFactory（预览器工厂）

#### 2.1.1 职责

- 根据文件类型创建对应的预览器实例
- 管理预览器的生命周期（创建、销毁）
- 提供预览器注册和注销机制

#### 2.1.2 接口设计

```javascript
class PreviewerFactory {
  // 注册预览器类型
  register(fileType, previewerClass)
  
  // 注销预览器类型
  unregister(fileType)
  
  // 创建预览器实例
  create(fileType, file, container)
  
  // 销毁预览器实例
  destroy(previewer)
  
  // 获取支持的文件类型列表
  getSupportedTypes()
}
```

#### 2.1.3 使用示例

```javascript
// 注册预览器
PreviewerFactory.register('xlsx', ExcelPreviewer);
PreviewerFactory.register('pdf', PDFPreviewer);
PreviewerFactory.register('jpg', ImagePreviewer);

// 创建预览器实例
const previewer = PreviewerFactory.create('xlsx', file, container);

// 使用预览器
previewer.render();
previewer.zoom(1.5);

// 销毁预览器
PreviewerFactory.destroy(previewer);
```

#### 2.1.4 实现要点

- 使用Map存储文件类型到预览器类的映射
- 支持单例模式或工厂模式
- 预览器实例需要实现统一的接口（render, destroy, zoom等）
- 异常处理：文件类型不支持时抛出明确错误

---

### 2.2 FileTypeDetector（文件类型检测）

#### 2.2.1 职责

- 检测文件的实际类型
- 支持扩展名检测（第一优先级）
- 支持Magic Number检测（第二优先级）
- 处理文件类型不匹配的情况

#### 2.2.2 接口设计

```javascript
class FileTypeDetector {
  // 通过文件对象检测类型
  detect(file)
  
  // 通过文件名检测类型
  detectByFileName(fileName)
  
  // 通过Magic Number检测类型
  detectByMagicNumber(arrayBuffer)
  
  // 验证文件扩展名与实际类型是否匹配
  validate(file)
}
```

#### 2.2.3 Magic Number映射表

```javascript
const MAGIC_NUMBERS = {
  // PDF
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
  
  // Office文档（ZIP格式）
  docx: [0x50, 0x4B, 0x03, 0x04],
  xlsx: [0x50, 0x4B, 0x03, 0x04],
  pptx: [0x50, 0x4B, 0x03, 0x04],
  
  // 图片
  png: [0x89, 0x50, 0x4E, 0x47],
  jpg: [0xFF, 0xD8, 0xFF],
  gif: [0x47, 0x49, 0x46, 0x38],
  bmp: [0x42, 0x4D],
  webp: [0x52, 0x49, 0x46, 0x46],
  
  // 音频
  mp3: [0xFF, 0xFB],
  wav: [0x52, 0x49, 0x46, 0x46],
  
  // 视频
  mp4: [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70],
  
  // 压缩包
  zip: [0x50, 0x4B, 0x03, 0x04],
  rar: [0x52, 0x61, 0x72, 0x21],
  '7z': [0x37, 0x7A, 0xBC, 0xAF],
  tar: null, // 无固定Magic Number
  
  // 文本类（无固定Magic Number）
  txt: null,
  md: null,
  xml: null,
  json: null,
};
```

#### 2.2.4 实现要点

- 优先使用文件扩展名，速度快
- 对于扩展名不明确或可疑的文件，读取前N字节进行Magic Number检测
- 支持异步检测（大文件需要分块读取）
- 缓存检测结果（同一文件不重复检测）

---

### 2.3 EventBus（事件总线）

#### 2.3.1 职责

- 提供统一的发布订阅机制
- 支持跨模块通信
- 支持事件命名空间
- 支持事件优先级（可选）

#### 2.3.2 接口设计

```javascript
class EventBus {
  // 订阅事件
  on(event, callback, priority?)
  
  // 订阅一次性事件
  once(event, callback, priority?)
  
  // 取消订阅
  off(event, callback)
  
  // 发布事件
  emit(event, data)
  
  // 清除所有事件监听
  clear()
}
```

#### 2.3.3 标准事件定义

```javascript
// 系统级事件
const SystemEvents = {
  FILE_LOADED: 'system:file_loaded',
  FILE_ERROR: 'system:file_error',
  FILE_UNLOADED: 'system:file_unloaded',
  SYSTEM_READY: 'system:ready',
};

// 预览器事件
const PreviewerEvents = {
  RENDER_START: 'previewer:render_start',
  RENDER_COMPLETE: 'previewer:render_complete',
  RENDER_ERROR: 'previewer:render_error',
  PAGE_CHANGED: 'previewer:page_changed',
  ZOOM_CHANGED: 'previewer:zoom_changed',
};

// UI事件
const UIEvents = {
  FULLSCREEN_ENTER: 'ui:fullscreen_enter',
  FULLSCREEN_EXIT: 'ui:fullscreen_exit',
  RESIZE: 'ui:resize',
};
```

#### 2.3.4 使用示例

```javascript
// 订阅事件
EventBus.on(SystemEvents.FILE_LOADED, (data) => {
  console.log('文件已加载', data);
});

// 发布事件
EventBus.emit(SystemEvents.FILE_LOADED, {
  fileType: 'xlsx',
  fileSize: 1024000,
  fileName: 'report.xlsx'
});

// 订阅一次性事件
EventBus.once(PreviewerEvents.RENDER_COMPLETE, () => {
  console.log('首次渲染完成');
});

// 取消订阅
const handler = (data) => { /* 处理逻辑 */ };
EventBus.on('some:event', handler);
EventBus.off('some:event', handler);
```

#### 2.3.5 实现要点

- 使用Map存储事件和回调列表
- 支持事件命名空间（如 `previewer:*`）
- 支持异步回调处理
- 防止内存泄漏（组件销毁时自动清理）

---

### 2.4 StateManager（状态管理）

#### 2.4.1 职责

- 管理预览器的全局状态
- 提供状态查询和更新接口
- 支持状态订阅和通知
- 支持本地持久化（LocalStorage）

#### 2.4.2 接口设计

```javascript
class StateManager {
  // 获取状态
  get(key)
  
  // 设置状态
  set(key, value)
  
  // 批量更新状态
  update(changes)
  
  // 重置状态
  reset(key?)
  
  // 订阅状态变化
  subscribe(key, callback)
  
  // 取消订阅
  unsubscribe(key, callback)
  
  // 持久化状态到LocalStorage
  persist()
  
  // 从LocalStorage恢复状态
  restore()
}
```

#### 2.4.3 标准状态定义

```javascript
const DEFAULT_STATE = {
  // 当前文件
  currentFile: {
    name: null,
    type: null,
    size: 0,
    url: null,
  },
  
  // 预览器状态
  previewer: {
    zoom: 1.0,
    currentPage: 1,
    totalPages: 0,
    isLoaded: false,
    isLoading: false,
  },
  
  // UI状态
  ui: {
    isFullscreen: false,
    toolbarVisible: true,
    sidebarVisible: false,
  },
  
  // 用户偏好（持久化）
  preferences: {
    defaultZoom: 1.0,
    autoRotate: false,
    theme: 'light',
  },
};
```

#### 2.4.4 使用示例

```javascript
// 获取状态
const zoom = StateManager.get('previewer.zoom');

// 设置状态
StateManager.set('previewer.zoom', 1.5);

// 批量更新状态
StateManager.update({
  'previewer.currentPage': 5,
  'previewer.zoom': 1.2,
});

// 订阅状态变化
StateManager.subscribe('previewer.zoom', (newValue, oldValue) => {
  console.log(`缩放从 ${oldValue} 变为 ${newValue}`);
  // 更新UI显示
  updateZoomDisplay(newValue);
});

// 持久化状态
StateManager.persist(); // 保存到LocalStorage

// 恢复状态
StateManager.restore(); // 从LocalStorage加载
```

#### 2.4.5 实现要点

- 支持路径式访问（如 `previewer.zoom`）
- 支持深度监听对象属性变化
- 区分临时状态和持久化状态
- 提供状态快照和回滚功能

---

## 3. 模块协作关系

```
┌─────────────────────────────────────────────────────────┐
│                      UI层                                │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                      适配器层                            │
│  (OfficeAdapter, DocumentAdapter, ImageAdapter...)     │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    核心框架层                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │Previewer     │  │  FileType    │  │   EventBus   │ │
│  │  Factory     │◄─┤   Detector   │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│         │                                            │ │
│         ▼                                            ▼ │
│  ┌──────────────┐  ┌──────────────┐                  │ │
│  │StateManager  │  │    Previewer │                  │ │
│  └──────────────┘  │   Instance   │                  │ │
│         │          └──────────────┘                  │ │
└─────────────────────────────────────────────────────────┘
```

### 3.1 典型工作流程

1. **文件上传**
   - UI层触发文件上传
   - FileTypeDetector检测文件类型
   - PreviewerFactory创建对应的预览器实例
   - StateManager更新当前文件状态

2. **文件渲染**
   - Previewer实例调用render方法
   - 发布RENDER_START事件
   - 完成渲染后发布RENDER_COMPLETE事件
   - StateManager更新预览器状态

3. **用户交互**
   - 用户点击缩放按钮
   - UI层更新预览器
   - StateManager更新缩放状态
   - 发布ZOOM_CHANGED事件
   - 其他模块订阅事件并响应

---

## 4. 错误处理机制

### 4.1 错误类型定义

```javascript
class PreviewerError extends Error {
  constructor(code, message, details) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

// 错误码
const ErrorCodes = {
  UNSUPPORTED_FILE_TYPE: 'UNSUPPORTED_FILE_TYPE',
  FILE_CORRUPTED: 'FILE_CORRUPTED',
  RENDER_ERROR: 'RENDER_ERROR',
  STATE_ERROR: 'STATE_ERROR',
  EVENT_ERROR: 'EVENT_ERROR',
};
```

### 4.2 错误传播流程

```
检测错误 → 创建错误对象 → 发布ERROR事件 → UI层显示错误提示 → 用户选择处理方案
```

---

## 5. 性能优化策略

### 5.1 预览器工厂优化

- 预加载常用预览器类
- 延迟加载不常用的预览器
- 缓存预览器实例（单例模式）

### 5.2 文件类型检测优化

- 文件扩展名检测优先（O(1)）
- Magic Number检测按需触发
- 支持检测结果缓存

### 5.3 事件总线优化

- 批量处理事件
- 节流和防抖高频事件
- 使用WeakMap避免内存泄漏

### 5.4 状态管理优化

- 使用Proxy进行响应式监听
- 按需持久化状态
- 状态变更批量更新

---

## 6. 单元测试要求

### 6.1 测试覆盖率目标

- 核心逻辑：100%
- 边界情况：100%
- 错误处理：100%
- 整体覆盖率：≥90%

### 6.2 测试框架

- 使用Jest作为测试框架
- 支持异步测试
- 支持Mock和Stub

### 6.3 测试示例

```javascript
describe('FileTypeDetector', () => {
  test('should detect file type by extension', () => {
    const fileType = FileTypeDetector.detectByFileName('test.xlsx');
    expect(fileType).toBe('xlsx');
  });
  
  test('should detect file type by magic number', async () => {
    const file = new File(['%PDF-1.4'], 'test.pdf');
    const fileType = await FileTypeDetector.detect(file);
    expect(fileType).toBe('pdf');
  });
  
  test('should throw error for unsupported file type', () => {
    expect(() => {
      FileTypeDetector.detectByFileName('test.xyz');
    }).toThrow('Unsupported file type');
  });
});
```

---

## 7. 开发计划

### 第一阶段（P0）
- [x] 核心框架层设计文档
- [ ] PreviewerFactory实现
- [ ] FileTypeDetector实现
- [ ] EventBus实现
- [ ] StateManager实现
- [ ] 单元测试

### 第二阶段（P1）
- [ ] 性能优化
- [ ] 错误处理完善
- [ ] 文档完善

---

## 8. API文档

### 8.1 PreviewerFactory API

详见2.1.2节接口设计

### 8.2 FileTypeDetector API

详见2.2.2节接口设计

### 8.3 EventBus API

详见2.3.2节接口设计

### 8.4 StateManager API

详见2.4.2节接口设计

---

## 9. 附录

### 9.1 参考文档

- [MDN: JavaScript Classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes)
- [File API](https://developer.mozilla.org/en-US/docs/Web/API/File)
- [Magic Number Database](https://www.garykessler.net/library/file_sigs.html)

### 9.2 相关技术

- ES6 Classes
- Map和WeakMap
- Proxy（响应式）
- LocalStorage
- ArrayBuffer和TypedArray

---

**文档版本**: 1.0  
**编写日期**: 2026-01-29  
**编写人**: 核心框架层负责人
