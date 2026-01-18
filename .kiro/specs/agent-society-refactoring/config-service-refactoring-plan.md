# Config 服务重构方案

## 问题分析

### 当前问题

1. **Config 不是单例服务**
   - Runtime 在 `init()` 中 `new Config()`
   - Runtime 在 `reloadLlmClient()` 中再次 `new Config()`
   - AgentSociety 在 `_startHttpServer()` 中又 `new Config()`
   - 每次都创建新实例，不符合服务的设计原则

2. **Runtime 管理配置路径**
   - Runtime 构造函数接受 `configPath` 参数
   - Runtime 需要知道配置文件的路径
   - 这违反了配置服务应该独立管理配置的原则

3. **配置加载逻辑分散**
   - Runtime 负责加载配置
   - AgentSociety 也需要访问配置
   - HTTPServer 也需要访问配置
   - 没有统一的配置服务入口

### 设计原则

**Config 应该是一个单例服务**：
- 在系统初始化时创建一次
- 通过依赖注入传递给需要的模块
- 所有模块共享同一个 Config 实例
- Config 自己管理配置文件路径和加载逻辑

## 重构方案

### 方案概述

1. **Config 作为单例服务**
   - AgentSociety 在初始化时创建 Config 实例
   - 通过构造函数注入给 Runtime
   - Runtime 不再自己创建 Config 实例
   - Runtime 不再管理 configPath

2. **简化 Runtime 构造函数**
   - 移除 `configPath` 参数
   - 添加 `configService` 参数（可选）
   - 如果提供了 `config` 对象，则不需要 `configService`

3. **Config 实例的生命周期**
   - 由 AgentSociety 创建和管理
   - 传递给 Runtime、HTTPServer 等需要的模块
   - 重新加载配置时使用同一个 Config 实例

### 详细设计

#### 1. 修改 AgentSociety 构造函数

```javascript
export class AgentSociety {
  constructor(options = {}) {
    // 创建 Config 服务实例（如果未提供配置对象）
    if (!options.config && options.configPath) {
      const configDir = path.dirname(options.configPath);
      this._configService = new Config(configDir);
    } else {
      this._configService = null;
    }
    
    // 将 Config 服务传递给 Runtime
    this.runtime = new Runtime({
      ...options,
      configService: this._configService
    });
    
    // ... 其他初始化代码
  }
}
```

#### 2. 修改 Runtime 构造函数

```javascript
export class Runtime {
  constructor(options = {}) {
    // ==================== 配置参数 ====================
    this._passedConfig = options.config ?? null; // 外部传入的配置对象
    this._configService = options.configService ?? null; // 外部传入的配置服务
    this.maxSteps = options.maxSteps ?? 200;
    // 移除 this.configPath
    this.maxToolRounds = options.maxToolRounds ?? 200;
    // ... 其他初始化代码
  }
}
```

#### 3. 修改 Runtime.init() 方法

```javascript
async init() {
  // 优先使用外部传入的配置对象，否则使用配置服务加载
  if (!this._passedConfig) {
    if (!this._configService) {
      throw new Error("必须提供 config 对象或 configService 实例");
    }
    this.config = await this._configService.loadApp({ dataDir: this.dataDir });
  } else {
    this.config = this._passedConfig;
  }
  
  // ... 其他初始化代码
}
```

#### 4. 修改 Runtime.reloadLlmClient() 方法

```javascript
async reloadLlmClient() {
  try {
    // 使用配置服务重新加载配置
    if (!this._configService) {
      throw new Error("配置服务未初始化，无法重新加载");
    }
    
    const newConfig = await this._configService.loadApp({ dataDir: this.dataDir });
    
    if (!newConfig.llm) {
      void this.log.warn("配置文件中没有 LLM 配置");
      return;
    }

    // 创建新的 LlmClient 实例
    const newLlmClient = new LlmClient({
      ...newConfig.llm,
      logger: this.loggerRoot.forModule("llm"),
      onRetry: (event) => this._emitLlmRetry(event)
    });

    // 替换旧的 LlmClient
    this.llm = newLlmClient;
    
    // 更新配置中的 llm 部分
    this.config.llm = newConfig.llm;

    void this.log.info("默认 LLM Client 已重新加载", {
      baseURL: newConfig.llm.baseURL,
      model: newConfig.llm.model
    });
  } catch (err) {
    const message = err && typeof err.message === "string" ? err.message : String(err);
    void this.log.error("重新加载 LLM Client 失败", { error: message });
    throw err;
  }
}
```

#### 5. 修改 AgentSociety._startHttpServer() 方法

```javascript
async _startHttpServer() {
  try {
    this._httpServer = new HTTPServer({
      port: this._httpPort,
      logger: this.runtime.loggerRoot.forModule("http")
    });
    this._httpServer.setSociety(this);
    
    // 设置配置服务（使用同一个实例）
    if (this._configService) {
      this._httpServer.setConfigService(this._configService);
      void this.log.info("HTTP服务器配置服务已设置");
    } else {
      void this.log.warn("HTTP服务器配置服务未设置");
    }
    
    // ... 其他代码
  } catch (err) {
    // ... 错误处理
  }
}
```

### 向后兼容性

为了保持向后兼容，我们需要：

1. **保留 configPath 参数支持**
   ```javascript
   constructor(options = {}) {
     // 向后兼容：如果提供了 configPath，创建 Config 服务
     if (!options.config && !options.configService && options.configPath) {
       const configDir = path.dirname(options.configPath);
       this._configService = new Config(configDir);
     } else {
       this._configService = options.configService ?? null;
     }
     
     this._passedConfig = options.config ?? null;
     // ...
   }
   ```

2. **Runtime 仍然接受 configPath（但标记为废弃）**
   ```javascript
   constructor(options = {}) {
     // 向后兼容：如果提供了 configPath 但没有 configService，创建临时实例
     if (!options.configService && options.configPath) {
       const configDir = path.dirname(options.configPath);
       this._configService = new Config(configDir);
       console.warn("Runtime: configPath 参数已废弃，请使用 configService 参数");
     } else {
       this._configService = options.configService ?? null;
     }
     // ...
   }
   ```

## 实施步骤

### 步骤 1：修改 Runtime 构造函数和 init() 方法
- 添加 `configService` 参数
- 保留 `configPath` 参数（向后兼容）
- 修改配置加载逻辑

### 步骤 2：修改 Runtime.reloadLlmClient() 方法
- 使用 `this._configService` 而不是创建新实例

### 步骤 3：修改 Runtime.reloadLlmServiceRegistry() 方法
- 确保使用同一个配置服务实例

### 步骤 4：修改 AgentSociety
- 在构造函数中创建 Config 实例
- 传递给 Runtime 和 HTTPServer

### 步骤 5：运行测试
- 确保所有测试通过
- 验证配置重新加载功能正常

### 步骤 6：更新文档
- 标记 `configPath` 参数为废弃
- 说明新的 `configService` 参数用法

## 预期效果

1. **Config 成为真正的单例服务**
   - 整个系统共享一个 Config 实例
   - 配置管理逻辑集中

2. **降低 Runtime 的职责**
   - Runtime 不再管理配置路径
   - Runtime 不再创建 Config 实例
   - Runtime 只使用注入的配置服务

3. **提高可测试性**
   - 可以轻松注入 Mock Config 服务
   - 测试时不需要真实的配置文件

4. **符合依赖注入原则**
   - 服务由外部创建和管理
   - 模块通过构造函数接收依赖

## 风险评估

### 低风险
- 保持向后兼容性
- 逐步迁移，不破坏现有代码

### 需要注意
- 确保所有使用 Config 的地方都使用同一个实例
- 测试配置重新加载功能

## 总结

这个重构方案将 Config 从一个工具类转变为真正的单例服务，符合服务设计的原则。通过依赖注入，降低了模块间的耦合，提高了系统的可维护性和可测试性。
