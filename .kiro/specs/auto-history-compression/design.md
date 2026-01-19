# 自动历史消息压缩功能设计文档

## 1. 设计概述

### 1.1 设计目标

实现智能体历史消息的自动压缩机制，在上下文使用率达到阈值时自动触发压缩流程，通过独立的 LLM 请求生成压缩摘要，整个过程对智能体透明。

### 1.2 设计原则

- **透明性**: 自动压缩对智能体完全透明，无需智能体参与
- **可靠性**: 压缩失败不影响正常的 LLM 调用流程
- **可配置性**: 提供灵活的配置项，适应不同场景
- **兼容性**: 保持现有功能不变，与手动压缩共存
- **模块化**: 职责清晰，易于维护和扩展

### 1.3 核心流程

```
LLM 调用前
  ↓
检查上下文使用率
  ↓
达到阈值？ ──否──→ 继续 LLM 调用
  ↓ 是
触发自动压缩
  ↓
提取待压缩消息
  ↓
调用 LLM 生成摘要
  ↓
执行历史压缩
  ↓
继续 LLM 调用
```

## 2. 模块设计

### 2.1 AutoCompressionManager（数据处理器）

`AutoCompressionManager` 是一个独立的数据处理器，负责所有与压缩相关的逻辑。它接收完整的对话数据，自己判断、处理、返回结果。

#### 2.1.1 职责

- 管理自动压缩配置
- 判断是否需要压缩（基于 token 使用率）
- 提取需要压缩的消息
- 生成压缩摘要
- 执行压缩逻辑
- 返回处理后的数据结构

#### 2.1.2 核心方法

```javascript
/**
 * 执行自动压缩处理
 * @param {Object} conversationData - 完整的对话数据
 *   - messages: 完整历史消息
 *   - runtimeMessages: 当前运行时消息
 *   - tokenUsage: token 使用统计
 *   - config: 自动压缩配置
 * @param {Object} llmClient - LLM 客户端
 * @returns {Promise<CompressionResult>}
 *   - ok: 是否成功
 *   - compressed: 是否执行了压缩
 *   - runtimeMessages: 压缩后的运行时消息
 *   - fullHistory: 完整历史消息（不受压缩影响）
 *   - compressionRecord: 压缩记录
 *   - error: 错误信息
 */
async autoCompress(conversationData, llmClient): Promise<CompressionResult>
```

#### 2.1.3 内部方法（私有）

```javascript
// 检查是否需要压缩
_shouldCompress(conversationData): boolean

// 提取需要压缩的消息
_extractMessagesToCompress(conversationData): Message[]

// 生成压缩摘要
_generateSummary(messages, llmClient): Promise<SummaryResult>

// 构建摘要生成提示词
_buildSummaryPrompt(messages): string

// 执行压缩逻辑
_performCompression(conversationData, summary): CompressionData
```

#### 2.1.4 配置管理方法

```javascript
// 获取当前配置
getConfig(): AutoCompressionConfig

// 更新配置
updateConfig(updates): void
```

### 2.2 ConversationManager 扩展

`ConversationManager` 是数据容器和持久化管理器，职责简化为：调用、传参、持久化。

#### 2.2.1 新增方法

```javascript
/**
 * 执行自动压缩
 * 将完整的对话数据交给 AutoCompressionManager 处理
 * @param {string} agentId - 智能体ID
 * @param {Object} llmClient - LLM 客户端
 * @returns {Promise<CompressionResult>}
 */
async autoCompress(agentId, llmClient): Promise<CompressionResult>
```

#### 2.2.2 修改现有方法

- `compress()`: 修改以支持完整历史保留和压缩记录
- `_doSaveConversation()`: 修改以保存完整历史和压缩记录
- `loadAllConversations()`: 修改以恢复完整历史和压缩记录

#### 2.2.3 查询方法

```javascript
// 获取压缩历史记录
getCompressionHistory(agentId): CompressionRecord[]

// 获取完整历史消息
getFullHistory(agentId): Message[] | null
```

### 2.3 LlmHandler 扩展

#### 2.3.1 修改 handleWithLlm() 方法

在 LLM 调用前添加自动压缩检查和硬性限制截断。

```javascript
async handleWithLlm(ctx, message) {
  const runtime = this.runtime;
  const agentId = ctx.agent?.id ?? null;
  const llmClient = runtime.getLlmClientForAgent?.(agentId) ?? runtime.llm;
  
  if (!llmClient) return;

  runtime.setAgentComputeStatus?.(agentId, 'processing');

  // 检查是否需要自动压缩并执行
  if (agentId && runtime._conversationManager) {
    const conversationData = this._buildConversationData(agentId);
    const compressionResult = await runtime._conversationManager.autoCompress(agentId, llmClient);
    
    if (compressionResult.ok && compressionResult.compressed) {
      // 压缩成功，清除 token 统计
      runtime._conversationManager.clearTokenUsage(agentId);
    }
  }

  // 检查上下文硬性限制
  if (agentId && runtime._conversationManager?.isContextExceeded?.(agentId)) {
    // 如果超过硬性限制，截断消息历史
    await this._truncateMessageHistory(agentId);
    
    // 如果截断后仍然超限，拒绝调用
    if (runtime._conversationManager?.isContextExceeded?.(agentId)) {
      // ... 现有的硬性限制处理逻辑
    }
  }

  // ... 继续现有的 LLM 调用流程
}
```

#### 2.3.2 新增方法：_truncateMessageHistory()

当 tokens 超过硬性限制时截断消息历史。

```javascript
/**
 * 截断消息历史以确保不超过硬性限制
 * @param {string} agentId - 智能体ID
 * @returns {Promise<void>}
 * @private
 * 
 * 此方法在自动压缩失败且 tokens 超过硬性限制时调用
 * 保留系统提示词和最近的消息，删除中间的消息
 */
async _truncateMessageHistory(agentId) {
  const runtime = this.runtime;
  const conversationManager = runtime._conversationManager;
  
  if (!conversationManager) return;
  
  const beforeCount = conversationManager.getMessageCount(agentId);
  const beforeStatus = conversationManager.getContextStatus(agentId);
  
  void runtime.log?.warn?.("tokens 超过硬性限制，开始截断消息历史", {
    agentId,
    messageCount: beforeCount,
    usedTokens: beforeStatus.usedTokens,
    maxTokens: beforeStatus.maxTokens
  });
  
  try {
    // 获取对话历史
    const conv = conversationManager.conversations.get(agentId);
    if (!conv || conv.length <= 2) {
      return; // 消息太少，无法截断
    }
    
    // 保留系统提示词和最近的消息
    const keepRecentCount = conversationManager.autoCompression?.keepRecentCount ?? 10;
    const systemPrompt = conv[0];
    const recentMessages = conv.slice(-keepRecentCount);
    
    // 构建截断后的对话历史
    const truncatedConv = [systemPrompt, ...recentMessages];
    
    // 更新对话历史
    conversationManager.conversations.set(agentId, truncatedConv);
    
    // 清除 token 统计
    conversationManager.clearTokenUsage(agentId);
    
    const afterCount = conversationManager.getMessageCount(agentId);
    
    void runtime.log?.warn?.("消息历史截断完成", {
      agentId,
      beforeCount,
      afterCount,
      removedCount: beforeCount - afterCount
    });
    
    // 持久化截断后的对话历史
    void conversationManager.persistConversation(agentId);
  } catch (err) {
    void runtime.log?.error?.("截断消息历史失败", {
      agentId,
      error: err.message ?? String(err)
    });
  }
}
```

## 3. 数据结构设计

### 3.1 自动压缩配置

```typescript
interface AutoCompressionConfig {
  enabled: boolean;              // 是否启用自动压缩
  threshold: number;             // 触发阈值（0-1）
  keepRecentCount: number;       // 保留最近消息数量
  summaryMaxTokens: number;      // 摘要最大 token 数
  summaryModel: string | null;   // 摘要生成使用的模型（必须由用户配置）
  summaryTimeout: number;        // 摘要生成超时时间（毫秒）
}
```

### 3.2 压缩结果

```typescript
interface CompressionResult {
  ok: boolean;                   // 是否成功
  compressed?: boolean;          // 是否实际执行了压缩
  originalCount?: number;        // 压缩前消息数量
  newCount?: number;             // 压缩后消息数量
  summary?: string;              // 生成的摘要
  error?: string;                // 错误信息
}
```

### 3.3 摘要生成结果

```typescript
interface SummaryResult {
  ok: boolean;                   // 是否成功
  summary?: string;              // 生成的摘要
  error?: string;                // 错误信息
}
```

### 3.4 压缩记录

```typescript
interface CompressionRecord {
  timestamp: string;             // 压缩时间戳（ISO 格式）
  summary: string;               // 压缩摘要内容
  compressedRange: {             // 被压缩的消息范围
    start: number;               // 起始索引
    end: number;                 // 结束索引
  };
  compressedMessages: Message[]; // 被压缩的原始消息（完整保留）
  originalCount: number;         // 压缩前消息总数
  newCount: number;              // 压缩后消息总数
}
```

### 3.5 持久化数据结构

```typescript
interface PersistedConversation {
  agentId: string;               // 智能体ID
  messages: Message[];           // 完整历史消息（未压缩）
  runtimeMessages: Message[];    // 运行时消息（压缩后）
  compressions: CompressionRecord[]; // 压缩记录列表
  tokenUsage: TokenUsage | null; // Token 使用统计
  updatedAt: string;             // 更新时间（ISO 格式）
}
```

## 4. 接口设计

### 4.1 ConversationManager 新增接口

```javascript
// 检查是否应该自动压缩
shouldAutoCompress(agentId: string): boolean

// 生成压缩摘要
generateCompressionSummary(
  agentId: string, 
  messagesToCompress: Message[], 
  llmClient: LlmClient
): Promise<SummaryResult>

// 执行自动压缩
autoCompress(
  agentId: string, 
  llmClient: LlmClient
): Promise<CompressionResult>

// 设置自动压缩配置
setAutoCompressionConfig(config: Partial<AutoCompressionConfig>): void

// 获取自动压缩配置
getAutoCompressionConfig(): AutoCompressionConfig

// 获取压缩历史记录
getCompressionHistory(agentId: string): CompressionRecord[]

// 获取完整历史消息
getFullHistory(agentId: string): Message[] | null
```

### 4.2 LlmHandler 新增接口

```javascript
// 执行自动压缩流程（私有方法）
_performAutoCompression(
  agentId: string, 
  llmClient: LlmClient
): Promise<void>

// 截断消息历史（私有方法）
_truncateMessageHistory(
  agentId: string
): Promise<void>
```

## 5. 流程设计

### 5.1 自动压缩触发流程

```
1. LlmHandler.handleWithLlm() 被调用
   ↓
2. 检查 shouldAutoCompress(agentId)
   ↓
3. 如果需要压缩，调用 _performAutoCompression()
   ↓
4. 记录压缩前的状态（token 使用率、消息数量）
   ↓
5. 调用 ConversationManager.autoCompress()
   ↓
6. 提取需要压缩的消息
   ↓
7. 调用 generateCompressionSummary() 生成摘要
   ↓
8. 如果摘要生成失败，返回错误，不执行压缩
   ↓
9. 如果摘要生成成功，调用 compress() 执行压缩
   ↓
10. 清除 token 使用统计
   ↓
11. 记录压缩后的状态
   ↓
12. 持久化对话历史
   ↓
13. 检查上下文硬性限制
   ↓
14. 如果超过硬性限制，调用 _truncateMessageHistory()
   ↓
15. 截断消息历史，保留系统提示词和最近的消息
   ↓
16. 继续正常的 LLM 调用流程
```

### 5.2 摘要生成流程

```
1. 接收需要压缩的消息列表
   ↓
2. 构建摘要生成提示词
   - 格式化消息历史
   - 添加摘要要求说明
   ↓
3. 调用 LLM 生成摘要
   - 使用配置的摘要模型
   - 设置超时时间
   ↓
4. 提取摘要内容
   ↓
5. 验证摘要有效性
   ↓
6. 返回摘要结果
```

### 5.3 错误处理流程

```
摘要生成失败
   ↓
记录警告日志
   ↓
不执行压缩，返回错误
   ↓
继续 LLM 调用流程
   ↓
检查硬性限制
   ↓
如果超过硬性限制
   ↓
截断消息历史
   ↓
保留系统提示词和最近消息
   ↓
继续 LLM 调用

压缩执行失败
   ↓
记录错误日志
   ↓
不阻止 LLM 调用

LLM 调用失败
   ↓
按现有流程处理
```

## 6. 配置设计

### 6.1 默认配置

```javascript
const DEFAULT_AUTO_COMPRESSION_CONFIG = {
  enabled: true,
  threshold: 0.8,
  keepRecentCount: 10,
  summaryMaxTokens: 1000,
  summaryModel: null,  // 必须由用户配置
  summaryTimeout: 30000
};
```

### 6.2 配置文件示例

在 `config/app.json` 中添加自动压缩配置：

```json
{
  "conversation": {
    "autoCompression": {
      "enabled": true,
      "threshold": 0.8,
      "keepRecentCount": 10,
      "summaryMaxTokens": 1000,
      "summaryModel": "gpt-4o-mini",
      "summaryTimeout": 30000
    }
  }
}
```

**注意**: `summaryModel` 是必需配置项，如果未配置，自动压缩功能将无法使用。

### 6.3 运行时配置

支持通过 API 动态修改配置：

```javascript
// 启用/禁用自动压缩
conversationManager.setAutoCompressionConfig({ enabled: false });

// 修改触发阈值
conversationManager.setAutoCompressionConfig({ threshold: 0.7 });

// 修改保留消息数量
conversationManager.setAutoCompressionConfig({ keepRecentCount: 15 });
```


## 7. 日志设计

### 7.1 日志级别

- **INFO**: 自动压缩触发、完成、状态变化
- **WARN**: 自动压缩未执行、摘要生成失败
- **ERROR**: 自动压缩失败、LLM 调用失败
- **DEBUG**: 详细的压缩过程信息

### 7.2 日志内容

#### 7.2.1 触发自动压缩

```javascript
{
  level: 'info',
  message: '触发自动压缩',
  agentId: 'agent-123',
  usedTokens: 102400,
  usagePercent: '80.0%',
  messageCount: 45,
  threshold: '80%'
}
```

#### 7.2.2 自动压缩完成

```javascript
{
  level: 'info',
  message: '自动压缩完成',
  agentId: 'agent-123',
  beforeCount: 45,
  afterCount: 12,
  compressed: true,
  summaryLength: 856
}
```

#### 7.2.3 摘要生成失败

```javascript
{
  level: 'warn',
  message: '自动压缩失败，忽略本次压缩',
  agentId: 'agent-123',
  reason: 'timeout',
  willWaitForHardLimit: true
}
```

#### 7.2.4 消息历史截断

```javascript
{
  level: 'warn',
  message: 'tokens 超过硬性限制，开始截断消息历史',
  agentId: 'agent-123',
  messageCount: 45,
  usedTokens: 135000,
  maxTokens: 128000
}
```

```javascript
{
  level: 'warn',
  message: '消息历史截断完成',
  agentId: 'agent-123',
  beforeCount: 45,
  afterCount: 11,
  removedCount: 34
}
```

#### 7.2.5 自动压缩异常

```javascript
{
  level: 'error',
  message: '自动压缩异常',
  agentId: 'agent-123',
  error: 'LLM call failed',
  willContinue: true
}
```

## 8. 测试设计

### 8.1 单元测试

#### 8.1.1 ConversationManager 测试

```javascript
describe('ConversationManager - Auto Compression', () => {
  test('shouldAutoCompress - 达到阈值时返回 true', () => {
    // 测试逻辑
  });
  
  test('shouldAutoCompress - 未达到阈值时返回 false', () => {
    // 测试逻辑
  });
  
  test('generateCompressionSummary - 成功生成摘要', async () => {
    // 测试逻辑
  });
  
  test('generateCompressionSummary - 生成失败时返回错误', async () => {
    // 测试逻辑
  });
  
  test('autoCompress - 成功执行压缩', async () => {
    // 测试逻辑
  });
  
  test('autoCompress - 消息不足时不压缩', async () => {
    // 测试逻辑
  });
});
```

#### 8.1.2 LlmHandler 测试

```javascript
describe('LlmHandler - Auto Compression', () => {
  test('handleWithLlm - 达到阈值时触发自动压缩', async () => {
    // 测试逻辑
  });
  
  test('handleWithLlm - 自动压缩失败不阻止 LLM 调用', async () => {
    // 测试逻辑
  });
  
  test('_performAutoCompression - 记录正确的日志', async () => {
    // 测试逻辑
  });
});
```

### 8.2 集成测试

```javascript
describe('Auto Compression Integration', () => {
  test('完整的自动压缩流程', async () => {
    // 1. 创建智能体
    // 2. 发送多条消息，使上下文接近阈值
    // 3. 发送新消息，触发自动压缩
    // 4. 验证压缩结果
    // 5. 验证智能体仍能正常工作
  });
  
  test('自动压缩和手动压缩共存', async () => {
    // 1. 触发自动压缩
    // 2. 智能体主动调用 compress_context
    // 3. 验证两种压缩都能正常工作
  });
});
```

### 8.3 性能测试

```javascript
describe('Auto Compression Performance', () => {
  test('摘要生成不应超过 30 秒', async () => {
    // 测试逻辑
  });
  
  test('自动压缩不应显著延长 LLM 调用时间', async () => {
    // 测试逻辑
  });
});
```

## 9. 实现计划

### 9.1 第一阶段：核心功能

1. 在 ConversationManager 中添加自动压缩配置
2. 实现 shouldAutoCompress() 方法
3. 实现 generateCompressionSummary() 方法
4. 实现 autoCompress() 方法
5. 在 LlmHandler 中集成自动压缩检查
6. 实现 _performAutoCompression() 方法

### 9.2 第二阶段：日志和监控

1. 添加详细的日志记录
2. 添加压缩统计信息
3. 添加性能监控

### 9.3 第三阶段：测试和优化

1. 编写单元测试
2. 编写集成测试
3. 性能测试和优化
4. 文档完善

## 10. 兼容性说明

### 10.1 向后兼容

- 保持现有 `compress_context` 工具不变
- 保持现有 API 接口不变
- 默认启用自动压缩，但可配置禁用

### 10.2 与现有功能的关系

#### 10.2.1 与手动压缩的关系

- 自动压缩和手动压缩可以共存
- 智能体仍可主动调用 `compress_context` 工具
- 手动压缩的优先级高于自动压缩

#### 10.2.2 与上下文限制的关系

- 自动压缩在硬性限制检查之前执行
- 如果自动压缩后仍超过硬性限制，按现有流程拒绝调用
- 自动压缩失败不影响硬性限制检查

#### 10.2.3 与对话持久化的关系

- 自动压缩后自动触发对话持久化
- 压缩后的对话历史会被保存到磁盘
- 恢复对话时使用压缩后的历史

## 11. 安全性考虑

### 11.1 摘要内容安全

- 摘要生成使用独立的 LLM 调用，不影响主流程
- 摘要内容不应包含敏感信息
- 摘要生成失败时使用安全的默认摘要

### 11.2 资源使用

- 限制摘要生成的超时时间
- 限制摘要的最大 token 数
- 防止频繁触发自动压缩

### 11.3 错误处理

- 所有错误都被捕获并记录
- 错误不应导致系统崩溃
- 错误不应泄露敏感信息

## 12. 性能优化

### 12.1 摘要生成优化

- 使用较快的模型（gpt-4o-mini）
- 设置合理的超时时间
- 缓存最近的摘要结果（可选）

### 12.2 压缩时机优化

- 在 LLM 调用前执行，避免重复检查
- 只在必要时触发，避免频繁压缩
- 批量处理多个智能体的压缩（可选）

### 12.3 内存优化

- 及时清理压缩后的消息
- 避免保留过多的历史记录
- 定期清理过期的对话历史

## 13. 监控和调试

### 13.1 监控指标

- 自动压缩触发次数
- 摘要生成成功率
- 摘要生成平均耗时
- 压缩前后的消息数量变化
- 压缩前后的 token 使用变化

### 13.2 调试工具

- 日志查询接口
- 压缩历史查询接口
- 配置查询和修改接口
- 手动触发压缩接口（用于测试）

## 14. 文档和培训

### 14.1 用户文档

- 自动压缩功能说明
- 配置项说明
- 常见问题解答
- 最佳实践指南

### 14.2 开发者文档

- API 接口文档
- 模块设计文档
- 测试指南
- 故障排查指南

## 15. 后续优化方向

### 15.1 智能压缩策略

- 根据消息重要性选择性保留
- 根据任务类型调整压缩策略
- 学习用户的压缩偏好

### 15.2 多级压缩

- 支持多次压缩，逐步精简历史
- 保留多个压缩级别的摘要
- 根据需要恢复不同级别的历史

### 15.3 压缩历史管理

- 将压缩前的完整历史保存到磁盘
- 支持按需恢复完整历史
- 提供历史查询和分析功能

### 15.4 分布式压缩

- 支持多个智能体并行压缩
- 使用消息队列管理压缩任务
- 支持压缩任务的优先级调度
