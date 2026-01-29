# PPTX子模块测试文档

## 测试概述

本测试套件为PPTX子模块提供完整的单元测试，覆盖所有主要功能和边界情况。

## 测试文件

- **test.test.js** - 完整的单元测试套件
- **test.html** - 手动测试页面（用于浏览器端测试）

## 运行测试

### Jest环境

```bash
# 安装Jest（如果未安装）
npm install --save-dev jest

# 运行测试
npx jest src/implementations/office/pptx/test.test.js

# 带覆盖率报告
npx jest --coverage
```

### 浏览器测试

1. 打开 `test.html` 文件
2. 选择一个PPTX文件进行测试
3. 检查控制台输出

## 测试覆盖率

### PptxParser 测试

| 测试类别 | 测试用例数 | 覆盖内容 |
|---------|----------|---------|
| 初始化 | 1 | 构造函数初始化状态 |
| parse方法 | 3 | 正常解析、空文件、错误处理 |
| _parseDocProps | 2 | 正常解析、缺失文件 |
| _parseCoord | 2 | 正常解析、默认值 |
| 资源清理 | 1 | destroy方法 |
| **小计** | **9** | **主要功能** |

### PptxRenderer 测试

| 测试类别 | 测试用例数 | 覆盖内容 |
|---------|----------|---------|
| 初始化 | 2 | 正常初始化、默认参数 |
| init方法 | 2 | 带参数初始化、默认参数 |
| render方法 | 3 | 正常渲染、空容器错误、导航控制 |
| 幻灯片控制 | 6 | goToPage、nextPage、prevPage及边界情况 |
| 缩放控制 | 6 | setZoom、getZoom、范围限制、页面信息 |
| 销毁 | 1 | destroy方法 |
| **小计** | **20** | **渲染功能** |

### PptxModule 测试

| 测试类别 | 测试用例数 | 覆盖内容 |
|---------|----------|---------|
| 静态方法 | 2 | getSupportedTypes、isSupported |
| parse方法 | 3 | 正常解析、错误事件、load事件 |
| render方法 | 2 | 正常渲染、未加载错误 |
| 幻灯片控制 | 3 | goToPage、nextPage、prevPage |
| 缩放控制 | 2 | setZoom、getZoom、事件触发 |
| getFileInfo | 2 | 未加载、已加载 |
| 事件系统 | 4 | on、off、多监听器、错误隔离 |
| destroy方法 | 1 | 资源清理 |
| 错误处理 | 3 | 各种未加载错误 |
| 边界测试 | 3 | 空列表、单张幻灯片、跳转边界 |
| **小计** | **22** | **模块集成** |

### 总计

- **测试套件数**: 3
- **测试用例总数**: 51
- **预估代码覆盖率**: 85%+

## 测试用例详细说明

### 1. PptxParser 测试

#### 1.1 初始化测试
- **测试名称**: 应该正确初始化
- **验证内容**: 
  - slides 数组为空
  - slideMasters 对象为空
  - media 对象为空

#### 1.2 parse方法测试
- **空文件测试**: 验证处理空ArrayBuffer返回空结果
- **选项参数测试**: 验证maxSlides和onProgress参数正确传递
- **错误处理测试**: 验证解析失败时抛出正确错误

#### 1.3 _parseDocProps测试
- **正常解析**: 验证能正确解析XML中的文档属性
- **缺失文件**: 验证文件不存在时返回空对象

#### 1.4 _parseCoord测试
- **正常解析**: 验证EMU坐标转像素计算正确
- **默认值**: 验证元素不存在时返回默认值

#### 1.5 资源清理测试
- **destroy测试**: 验证能清理slides数组和media对象

### 2. PptxRenderer 测试

#### 2.1 初始化测试
- **正常初始化**: 验证currentSlideIndex和zoomLevel初始值
- **默认参数**: 验证init方法使用默认值

#### 2.2 init方法测试
- **带参数初始化**: 验证initialSlide、zoom、回调函数正确设置
- **默认参数**: 验证不传参数时使用默认值

#### 2.3 render方法测试
- **正常渲染**: 验证能创建preview容器和slide元素
- **空容器错误**: 验证容器为null时抛出错误
- **导航控制**: 验证创建导航按钮、缩放控制和页码显示

#### 2.4 幻灯片控制测试
- **goToPage测试**: 
  - 正常跳转
  - 超出范围时忽略
- **nextPage测试**: 
  - 正常跳转下一页
  - 到达末尾时不跳转
- **prevPage测试**: 
  - 正常跳转上一页
  - 到达开头时不跳转

#### 2.5 缩放控制测试
- **setZoom测试**: 
  - 正常设置缩放级别
  - 限制在合理范围（0.1-3.0）
- **getZoom测试**: 验证返回当前缩放级别
- **getCurrentPage测试**: 验证返回当前页码（1-based）
- **getTotalPages测试**: 验证返回总页数

#### 2.6 销毁测试
- **destroy测试**: 验证清理所有引用和DOM元素

### 3. PptxModule 测试

#### 3.1 静态方法测试
- **getSupportedTypes**: 验证返回包含'pptx'的数组
- **isSupported**: 验证正确识别支持的文件类型

#### 3.2 parse方法测试
- **正常解析**: 验证能解析PPTX文件并设置isLoaded
- **错误事件**: 验证解析失败时触发error事件
- **load事件**: 验证解析成功时触发load事件

#### 3.3 render方法测试
- **正常渲染**: 验证调用renderer的init和render方法
- **未加载错误**: 验证未加载时抛出错误

#### 3.4 幻灯片控制测试
- **goToPage**: 验证调用renderer.goToPage并触发pageChange事件
- **nextPage**: 验证调用renderer.nextPage
- **prevPage**: 验证调用renderer.prevPage

#### 3.5 缩放控制测试
- **setZoom**: 验证调用renderer.setZoom
- **getZoom**: 验证返回renderer的zoomLevel
- **事件触发**: 验证缩放变化时触发zoomChange事件

#### 3.6 getFileInfo测试
- **未加载**: 验证返回null
- **已加载**: 验证返回正确的文件信息对象

#### 3.7 事件系统测试
- **on注册**: 验证能注册事件监听器并正确触发
- **off移除**: 验证能移除指定监听器
- **多监听器**: 验证支持多个监听器
- **错误隔离**: 验证一个监听器错误不影响其他监听器

#### 3.8 destroy测试
- **资源清理**: 验证清理所有资源，重置状态

#### 3.9 错误处理测试
- **goToPage错误**: 验证未加载时抛出错误
- **nextPage错误**: 验证未加载时抛出错误
- **prevPage错误**: 验证未加载时抛出错误

#### 3.10 边界测试
- **空列表**: 验证处理空幻灯片列表
- **单张幻灯片**: 验证处理只有一张幻灯片的情况
- **跳转边界**: 验证跳转到无效页码时不执行

## 手动测试指南

使用 `test.html` 进行手动测试：

1. **基础功能测试**
   - [ ] 选择一个简单的PPTX文件（1-2张幻灯片）
   - [ ] 验证文件正确加载
   - [ ] 验证幻灯片正确显示
   - [ ] 验证页码显示正确

2. **幻灯片切换测试**
   - [ ] 点击"上一页"按钮
   - [ ] 点击"下一页"按钮
   - [ ] 验证页码正确更新

3. **缩放测试**
   - [ ] 点击"+"按钮放大
   - [ ] 点击"-"按钮缩小
   - [ ] 验证缩放百分比正确显示
   - [ ] 验证幻灯片内容随缩放变化

4. **多幻灯片测试**
   - [ ] 选择包含多张幻灯片的PPTX
   - [ ] 验证能正确加载所有幻灯片
   - [ ] 测试快速翻页
   - [ ] 测试跳转到指定页

5. **图片和文本测试**
   - [ ] 选择包含图片的PPTX
   - [ ] 验证图片正确显示
   - [ ] 选择包含不同格式文本的PPTX
   - [ ] 验证文本样式（粗体、斜体、颜色）正确显示

6. **错误处理测试**
   - [ ] 尝试上传非PPTX文件
   - [ ] 验证显示错误信息
   - [ ] 检查控制台错误日志

## 性能测试建议

### 大文件测试
```javascript
// 测试流式解析
await pptxModule.parse(largeFile, {
  maxSlides: 10,  // 只解析前10张
  onProgress: (progress) => {
    console.log(`${progress.loaded}/${progress.total}`);
  }
});
```

### 内存测试
- 使用浏览器开发者工具监控内存使用
- 测试多次加载和销毁后的内存释放

## 持续集成

### GitHub Actions 示例

```yaml
name: PPTX Module Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test -- src/implementations/office/pptx/test.test.js
      - run: npm test -- --coverage
```

## 已知测试限制

1. **JSZip依赖**: 测试依赖JSZip库，需要Mock或真实安装
2. **DOM依赖**: 部分测试需要真实的DOM环境（JSDOM可解决）
3. **文件解析**: 完整的文件解析测试需要真实的PPTX文件

## 后续改进

1. 增加集成测试（使用真实PPTX文件）
2. 增加性能基准测试
3. 增加端到端测试（使用Playwright/Cypress）
4. 增加视觉回归测试
5. 增加跨浏览器测试

## 测试维护

- 当添加新功能时，同步添加测试用例
- 定期检查测试覆盖率（目标：90%+）
- 修复Bug时，先编写失败的测试用例
- 重构代码时，确保所有测试仍然通过

## 联系与反馈

测试相关问题和建议请联系Office模块负责人。
