# 配置工具模块

## 概述

配置工具模块负责管理应用程序的所有配置文件，包括读取、写入、验证等操作。

## 模块列表

### config.js

- **职责**：统一的配置管理
- **功能**：
  - 读取应用配置（app.json / app.local.json）
  - 读取和管理 LLM 配置
  - 读取和管理 LLM 服务列表
  - 写入和更新配置文件
  - 配置验证
  - API Key 掩码处理
  - 优先加载 .local.json 文件
  - 写入操作总是针对 .local.json 文件

## 使用示例

```javascript
import { Config } from "./utils/config/config.js";

// 创建配置管理器实例
const config = new Config("config");

// 加载应用配置
const appConfig = await config.loadApp({ dataDir: "./data" });

// 获取 LLM 配置
const llmResult = await config.getLlm();

// 保存 LLM 配置
await config.saveLlm({
  baseURL: "http://localhost:8080",
  model: "test-model",
  apiKey: "sk-xxx"
});

// 获取 LLM 服务列表
const servicesResult = await config.getServices();

// 添加 LLM 服务
await config.addService({
  id: "my-service",
  name: "My Service",
  baseURL: "http://localhost:8080",
  model: "test-model",
  apiKey: "sk-xxx"
});

// 更新 LLM 服务
await config.updateService("my-service", {
  model: "updated-model"
});

// 删除 LLM 服务
await config.deleteService("my-service");

// 验证配置
const validation = config.validateLlm(llmConfig);
if (!validation.valid) {
  console.error("配置验证失败:", validation.errors);
}

// API Key 掩码
const masked = config.maskApiKey("sk-1234567890abcdef");
console.log(masked); // ****cdef
```

## 依赖关系

- config.js 依赖文件系统（fs/promises）
- config.js 依赖 path 模块

## 注意事项

1. 配置文件优先级：`.local.json` > `.json`
2. 所有写入操作都针对 `.local.json` 文件
3. 如果 `.local.json` 不存在，写入时会自动从 `.json` 复制
4. 配置目录路径在构造函数中统一处理（相对路径转绝对路径）
5. API Key 在返回时会自动掩码，只显示最后 4 个字符
