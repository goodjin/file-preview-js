# 对话记录中工件点击修复 - 任务列表

## 任务概述
修复对话记录中工件链接点击无法正确打开的问题，实现统一的工件打开方式：只需要工件ID。

## 任务列表

### 1. 修改 _createArtifactFromRef 方法
- [ ] 1.1 移除ID拼接逻辑，直接使用真实的工件ID
- [ ] 1.2 移除type、name、content等不必要的字段
- [ ] 1.3 移除推断type和name的逻辑调用
- [ ] 1.4 简化返回值为只包含ID的对象：`{ id: artifactId }`
- [ ] 1.5 更新方法注释，说明只返回ID

### 2. 修改 _renderTypeGroup 方法
- [ ] 2.1 移除 `data-artifact-type` 属性
- [ ] 2.2 移除 `data-artifact-content` 属性
- [ ] 2.3 只保留 `data-artifact-id` 属性，存储真实的工件ID
- [ ] 2.4 修改显示名称为使用ID的前8位（因为没有name字段）
- [ ] 2.5 修改URL为直接使用ID

### 3. 修改 _initArtifactInteractionHandler 方法
- [ ] 3.1 只读取 `artifactId` 从 dataset
- [ ] 3.2 移除读取type、content、name的逻辑
- [ ] 3.3 添加ID验证逻辑
- [ ] 3.4 简化工件对象构建为只包含ID：`{ id: artifactId }`

### 4. 修改 _handleArtifactClick 方法
- [ ] 4.1 移除类型判断和处理器分发逻辑
- [ ] 4.2 统一使用工件管理器打开，调用 `_openArtifactWithManager`
- [ ] 4.3 简化错误日志，移除type相关信息
- [ ] 4.4 更新方法注释，说明统一使用工件管理器

### 5. 修改 _openArtifactWithManager 方法
- [ ] 5.1 移除构建 `managerArtifact` 的逻辑
- [ ] 5.2 直接传递 `{ id: artifact.id }` 给工件管理器
- [ ] 5.3 更新方法注释，说明只传递ID

### 6. 删除不必要的方法
- [ ] 6.1 删除 `_initArtifactTypeHandlers` 方法
- [ ] 6.2 删除 `_handleImageArtifact` 方法
- [ ] 6.3 删除 `_handleJsonArtifact` 方法
- [ ] 6.4 删除 `_handleTextArtifact` 方法
- [ ] 6.5 删除 `_handleCodeArtifact` 方法
- [ ] 6.6 删除 `_handleHtmlArtifact` 方法
- [ ] 6.7 删除 `_handleCssArtifact` 方法
- [ ] 6.8 删除 `_createArtifactFromImage` 方法
- [ ] 6.9 删除 `_inferTypeFromArgs` 方法
- [ ] 6.10 删除 `_getArtifactNameFromArgs` 方法
- [ ] 6.11 删除 `_inferTypeFromFilename` 方法
- [ ] 6.12 删除 `_groupArtifactsByType` 方法
- [ ] 6.13 删除 `_renderImageArtifacts` 方法
- [ ] 6.14 删除 `_renderNonImageArtifacts` 方法

### 7. 简化 _collectAllArtifacts 方法
- [ ] 7.1 移除向后兼容的代码路径（images数组处理）
- [ ] 7.2 只保留 `payload.result.artifactRef` 格式的处理
- [ ] 7.3 更新方法注释，说明只支持新格式

### 8. 简化 renderToolCallGroupArtifacts 方法
- [ ] 8.1 移除按类型分组的逻辑
- [ ] 8.2 统一显示为链接列表
- [ ] 8.3 使用ID的前8位作为显示名称
- [ ] 8.4 更新方法注释，说明统一显示方式

### 9. 测试验证
- [ ] 9.1 测试点击图片工件链接，验证能正确打开
- [ ] 9.2 测试点击JSON工件链接，验证能正确打开
- [ ] 9.3 测试点击文本工件链接，验证能正确打开
- [ ] 9.4 测试点击代码工件链接，验证能正确打开
- [ ] 9.5 测试点击HTML/CSS工件链接，验证能正确打开
- [ ] 9.6 验证API调用使用正确的工件ID（通过浏览器开发者工具）
- [ ] 9.7 验证工件管理器能正确加载工件内容和元数据
- [ ] 9.8 验证错误处理机制正常工作

## 任务依赖关系

```
任务1 (修改_createArtifactFromRef)
  ↓
任务7 (简化_collectAllArtifacts) - 依赖任务1
  ↓
任务8 (简化renderToolCallGroupArtifacts) - 依赖任务7
  ↓
任务2 (修改_renderTypeGroup) - 依赖任务8
  ↓
任务3 (修改_initArtifactInteractionHandler) - 依赖任务2
  ↓
任务4 (修改_handleArtifactClick) - 依赖任务3
  ↓
任务5 (修改_openArtifactWithManager) - 依赖任务4
  ↓
任务6 (删除不必要的方法) - 依赖任务5
  ↓
任务9 (测试验证) - 依赖所有前面的任务
```

## 执行顺序建议

1. 先执行任务1-5，修改核心逻辑
2. 再执行任务6，删除不必要的方法
3. 执行任务7-8，简化辅助方法
4. 最后执行任务9，进行全面测试

## 注意事项

1. **不考虑向后兼容**：移除所有旧格式的支持代码
2. **统一的工件打开方式**：只传递ID，不传递其他信息
3. **代码简洁性**：大幅简化代码，移除不必要的复杂逻辑
4. **测试覆盖**：确保所有类型的工件都能正确打开
5. **API调用验证**：确保使用真实的工件ID，不是拼接的ID

## 预期结果

- 工件链接点击后能正确打开
- API调用使用真实的工件ID
- 代码更简洁，移除了14个不必要的方法
- 统一的工件打开方式，易于维护
