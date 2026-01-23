# Design Document: 工作区工件ID编码方案

## Overview

本设计实现一个工件ID编码方案，使工件管理器能够识别和正确打开工作区文件。当前系统中，工件存储在`{dataRoot}/artifacts/`目录，而工作区文件存储在`{dataRoot}/workspaces/{workspaceId}/`目录。工作区工件ID需要编码工作区ID和文件路径信息。

编码方案采用前缀标识符区分工件类型：
- 工作区工件ID: `ws:{workspaceId}:{base64Path}`

工件管理器通过检查ID前缀来判断工件类型，从而选择正确的文件路径。

## Architecture

### 模块职责划分

1. **ArtifactIdCodec（新增模块）**
   - 职责：工件ID的编码和解码
   - 位置：`src/platform/services/artifact/artifact_id_codec.js`
   - 功能：
     - 判断工件ID类型（普通/工作区）
     - 编码工作区工件ID
     - 解码工作区工件ID
     - 路径的Base64编码/解码

2. **ArtifactStore（修改）**
   - 职责：工件存储和读取
   - 修改点：
     - 打开工件时使用ArtifactIdCodec判断类型
     - 根据类型选择不同的文件路径
     - 保持现有的putArtifact和getArtifact接口不变

3. **WorkspaceManager（修改）**
   - 职责：工作区文件操作
   - 修改点：
     - writeFile成功后生成工作区工件ID
     - 返回工件ID给调用者

4. **ToolExecutor（修改）**
   - 职责：工具执行
   - 修改点：
     - _executeWriteFile方法接收工件ID并返回给智能体

## Components and Interfaces

### ArtifactIdCodec

```javascript
/**
 * 工件ID编解码器
 * 负责工件ID的编码、解码和类型识别
 */
class ArtifactIdCodec {
  /**
   * 判断是否为工作区工件ID
   * @param {string} artifactId - 工件ID
   * @returns {boolean}
   */
  static isWorkspaceArtifact(artifactId)

  /**
   * 编码工作区工件ID
   * @param {string} workspaceId - 工作区ID
   * @param {string} relativePath - 文件相对路径
   * @returns {string} 编码后的工件ID，格式: ws:{workspaceId}:{base64Path}
   */
  static encode(workspaceId, relativePath)

  /**
   * 解码工作区工件ID
   * @param {string} artifactId - 工件ID
   * @returns {{workspaceId: string, relativePath: string} | null}
   */
  static decode(artifactId)

  /**
   * 对路径进行Base64编码（URL安全）
   * @param {string} path - 文件路径
   * @returns {string}
   */
  static _encodePathToBase64(path)

  /**
   * 从Base64解码路径
   * @param {string} base64 - Base64编码的路径
   * @returns {string}
   */
  static _decodePathFromBase64(base64)
}
```

### ArtifactStore修改

```javascript
class ArtifactStore {
  /**
   * 读取工件（修改）
   * @param {string} ref - 工件引用
   * @returns {Promise<any>} 工件内容
   */
  async getArtifact(ref) {
    // 1. 移除"artifact:"前缀
    const id = ref.startsWith("artifact:") ? ref.slice("artifact:".length) : ref;
    
    // 2. 判断是否为工作区工件
    if (ArtifactIdCodec.isWorkspaceArtifact(id)) {
      return await this._getWorkspaceArtifact(id);
    }
    
    // 3. 普通工件处理（现有逻辑）
    return await this._getRegularArtifact(id);
  }

  /**
   * 读取工作区工件（新增）
   * @param {string} artifactId - 工作区工件ID
   * @returns {Promise<any>}
   */
  async _getWorkspaceArtifact(artifactId) {
    // 1. 解码工件ID
    const decoded = ArtifactIdCodec.decode(artifactId);
    if (!decoded) {
      return null;
    }
    
    // 2. 构建文件路径
    const workspacePath = this.runtime.workspaceManager.getWorkspacePath(decoded.workspaceId);
    if (!workspacePath) {
      return null;
    }
    
    const fullPath = path.resolve(workspacePath, decoded.relativePath);
    
    // 3. 读取文件
    const buffer = await readFile(fullPath);
    
    // 4. 读取元信息获取mimeType
    const metaFilePath = path.join(path.dirname(workspacePath), `${decoded.workspaceId}.meta.json`);
    let mimeType = "application/octet-stream";
    let createdAt = new Date().toISOString();
    
    try {
      const metaContent = await readFile(metaFilePath, "utf8");
      const workspaceMeta = JSON.parse(metaContent);
      const normalizedPath = path.normalize(decoded.relativePath).replace(/\\/g, "/");
      const fileMeta = workspaceMeta.files?.[normalizedPath];
      if (fileMeta?.mimeType) {
        mimeType = fileMeta.mimeType;
      }
      if (fileMeta?.updatedAt) {
        createdAt = fileMeta.updatedAt;
      }
    } catch (err) {
      // 元信息文件不存在或读取失败，使用默认值
      void this.log.debug("读取工作区元信息失败，使用默认MIME类型", { 
        workspaceId: decoded.workspaceId, 
        error: err.message 
      });
    }
    
    // 5. 检测是否为二进制
    const isBinary = await this._detectBinary(buffer, {
      mimeType,
      extension: path.extname(decoded.relativePath),
      filename: path.basename(decoded.relativePath)
    });
    
    // 6. 构建工件对象（与普通工件格式一致）
    let content;
    if (isBinary) {
      content = buffer.toString("base64");
    } else {
      const raw = buffer.toString("utf8");
      try {
        content = JSON.parse(raw);
      } catch {
        content = raw;
      }
    }
    
    // 7. 返回工件对象（包含chat-panel需要的元数据）
    return {
      id: artifactId,
      content,
      type: mimeType,
      createdAt,
      messageId: null,
      meta: {
        name: path.basename(decoded.relativePath),
        filename: path.basename(decoded.relativePath),
        workspaceId: decoded.workspaceId,
        relativePath: decoded.relativePath
      },
      isBinary,
      mimeType
    };
  }

  /**
   * 读取普通工件（重构）
   * @param {string} artifactId - 普通工件ID
   * @returns {Promise<any>}
   */
  async _getRegularArtifact(artifactId) {
    // 现有的getArtifact逻辑
  }
}
```

### 工件元数据API

工作区工件的元数据通过`/artifacts/{id}/metadata` API返回，格式与普通工件一致：

```javascript
{
  id: "ws:agent-abc123:c3JjL21haW4uanM=",
  type: "text/javascript",
  name: "main.js",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T01:00:00.000Z",
  meta: {
    filename: "main.js",
    workspaceId: "agent-abc123",
    relativePath: "src/main.js",
    modifiedBy: [
      {
        agentId: "agent-abc123",
        timestamp: "2024-01-01T00:00:00.000Z",
        messageId: "msg-001"
      },
      {
        agentId: "agent-def456",
        timestamp: "2024-01-01T01:00:00.000Z",
        messageId: "msg-002"
      }
    ]
  },
  mimeType: "text/javascript"
}
```

chat-panel使用此元数据来：
1. 显示工件名称
2. 根据MIME类型选择图标
3. 判断是否可预览（图片）
4. 构建下载链接
5. 显示修改历史（哪些智能体修改过此文件）

### WorkspaceManager修改

```javascript
class WorkspaceManager {
  /**
   * 写入文件（修改）
   * @param {string} taskId - 工作区ID
   * @param {string} relativePath - 文件相对路径
   * @param {string} content - 文件内容
   * @param {{mimeType: string, messageId?: string, agentId?: string, [key: string]: any}} [meta] - 元信息，mimeType为必需参数
   * @returns {Promise<{ok: boolean, artifactId?: string, error?: string}>}
   */
  async writeFile(taskId, relativePath, content, meta = null) {
    // 验证mimeType
    if (!meta || !meta.mimeType) {
      return { ok: false, error: "missing_mime_type" };
    }
    
    // 现有的文件写入逻辑...
    const workspacePath = this.getWorkspacePath(taskId);
    if (!workspacePath) {
      return { ok: false, error: "workspace_not_bound" };
    }

    if (!this._isPathSafe(workspacePath, relativePath)) {
      void this.log.warn("路径遍历攻击被拦截", { taskId, relativePath });
      return { ok: false, error: "path_traversal_blocked" };
    }

    const ensureResult = await this.ensureWorkspaceExists(taskId);
    if (!ensureResult.ok) {
      return { ok: false, error: ensureResult.error };
    }

    const fullPath = path.resolve(workspacePath, relativePath);
    
    try {
      const parentDir = path.dirname(fullPath);
      await mkdir(parentDir, { recursive: true });
      
      await writeFile(fullPath, content, "utf8");
      void this.log.debug("写入文件成功", { taskId, relativePath });

      // 更新工作区元数据（包含mimeType和agentId）
      await this._updateWorkspaceMeta(taskId, relativePath, {
        mimeType: meta.mimeType,
        messageId: meta.messageId,
        agentId: meta.agentId,
        ...meta
      });

      // 生成工件ID
      const artifactId = ArtifactIdCodec.encode(taskId, relativePath);
      
      return { ok: true, artifactId };
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && err.code === "EACCES") {
        return { ok: false, error: "permission_denied" };
      }
      const message = err && typeof err === "object" && "message" in err ? err.message : String(err);
      return { ok: false, error: `write_failed: ${message}` };
    }
  }

  /**
   * 更新工作区元信息文件（修改）
   * @param {string} taskId - 工作区ID
   * @param {string} relativePath - 文件相对路径
   * @param {object} fileMeta - 文件元信息
   * @returns {Promise<void>}
   */
  async _updateWorkspaceMeta(taskId, relativePath, fileMeta) {
    const entry = this._workspaces.get(taskId);
    if (!entry) {
      return;
    }

    // 元信息文件保存在工作空间目录的上一级，与工作空间同名
    const workspacesDir = path.dirname(entry.workspacePath);
    const metaFilePath = path.join(workspacesDir, `${taskId}.meta.json`);

    try {
      // 读取现有的元信息
      let workspaceMeta = {
        workspaceId: taskId,
        createdAt: entry.createdAt,
        files: {}
      };

      try {
        const existingContent = await readFile(metaFilePath, "utf8");
        workspaceMeta = JSON.parse(existingContent);
        if (!workspaceMeta.files) {
          workspaceMeta.files = {};
        }
      } catch (err) {
        // 文件不存在或解析失败，使用默认值
      }

      // 标准化路径
      const normalizedPath = path.normalize(relativePath).replace(/\\/g, "/");
      
      // 获取现有文件元信息
      const existingFileMeta = workspaceMeta.files[normalizedPath] || {
        createdAt: new Date().toISOString(),
        modifiedBy: []
      };

      // 更新修改历史
      const modifiedBy = existingFileMeta.modifiedBy || [];
      const currentTime = new Date().toISOString();
      
      // 添加当前修改记录
      if (fileMeta.agentId) {
        modifiedBy.push({
          agentId: fileMeta.agentId,
          timestamp: currentTime,
          messageId: fileMeta.messageId || null
        });
      }

      // 更新文件元信息
      workspaceMeta.files[normalizedPath] = {
        mimeType: fileMeta.mimeType,
        createdAt: existingFileMeta.createdAt,
        updatedAt: currentTime,
        modifiedBy: modifiedBy,
        ...fileMeta
      };

      // 写入元信息文件
      await writeFile(metaFilePath, JSON.stringify(workspaceMeta, null, 2), "utf8");
      void this.log.debug("更新工作空间元信息成功", { taskId, relativePath });
    } catch (err) {
      // 元信息写入失败不影响主流程
      const message = err && typeof err === "object" && "message" in err ? err.message : String(err);
      void this.log.warn("更新工作空间元信息失败", { taskId, relativePath, error: message });
    }
  }
}
```

### 工作区元数据文件格式

```json
{
  "workspaceId": "agent-abc123",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "files": {
    "src/main.js": {
      "mimeType": "text/javascript",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T01:00:00.000Z",
      "modifiedBy": [
        {
          "agentId": "agent-abc123",
          "timestamp": "2024-01-01T00:00:00.000Z",
          "messageId": "msg-001"
        },
        {
          "agentId": "agent-def456",
          "timestamp": "2024-01-01T01:00:00.000Z",
          "messageId": "msg-002"
        }
      ]
    },
    "README.md": {
      "mimeType": "text/markdown",
      "createdAt": "2024-01-01T00:10:00.000Z",
      "updatedAt": "2024-01-01T00:10:00.000Z",
      "modifiedBy": [
        {
          "agentId": "agent-abc123",
          "timestamp": "2024-01-01T00:10:00.000Z",
          "messageId": "msg-003"
        }
      ]
    }
  }
}
```

### ToolExecutor修改

```javascript
class ToolExecutor {
  /**
   * 获取工具定义（修改write_file）
   */
  getToolDefinitions() {
    return [
      // ... 其他工具 ...
      {
        type: "function",
        function: {
          name: "write_file",
          description: "在工作空间内创建或修改文件。",
          parameters: {
            type: "object",
            properties: {
              path: { type: "string", description: "文件的相对路径" },
              content: { type: "string", description: "文件内容" },
              mimeType: { 
                type: "string", 
                description: "文件的MIME类型，如 'text/javascript', 'application/json', 'text/html' 等。必须使用标准MIME类型。" 
              }
            },
            required: ["path", "content", "mimeType"]
          }
        }
      },
      // ... 其他工具 ...
    ];
  }

  /**
   * 执行write_file工具（修改）
   */
  async _executeWriteFile(ctx, args) {
    const runtime = this.runtime;
    const workspaceId = runtime.findWorkspaceIdForAgent(ctx.agent?.id);
    if (!workspaceId) {
      return { error: "workspace_not_assigned", message: "当前智能体未分配工作空间" };
    }
    
    // 验证mimeType参数
    if (!args.mimeType || typeof args.mimeType !== 'string') {
      return { error: "missing_mime_type", message: "必须提供mimeType参数" };
    }
    
    // 调用WorkspaceManager写入文件，传递mimeType
    const result = await runtime.workspaceManager.writeFile(
      workspaceId, 
      args.path, 
      args.content,
      { mimeType: args.mimeType }
    );
    
    // 返回结果包含工件ID
    if (result.ok && result.artifactId) {
      return { 
        ok: true, 
        artifactId: result.artifactId,
        path: args.path 
      };
    }
    
    return result;
  }
}
```

## Data Models

### 工件ID格式

#### 工作区工件ID
```
格式: ws:{workspaceId}:{base64Path}
示例: "ws:agent-abc123:c3JjL21haW4uanM="
说明: 
  - 前缀"ws:"标识工作区工件
  - workspaceId是工作区标识符
  - base64Path是文件相对于工作区根目录的相对路径的URL安全Base64编码
  - 工作区根目录: {dataRoot}/workspaces/{workspaceId}/
  - 示例中的base64Path解码后为"src/main.js"，完整路径为{dataRoot}/workspaces/agent-abc123/src/main.js
```

### 编码规则

1. **前缀标识**: 使用"ws:"前缀标识工作区工件
2. **分隔符**: 使用冒号":"分隔各部分
3. **路径编码**: 使用URL安全的Base64编码（替换+为-，/为_，移除=填充）
4. **向后兼容**: 不以"ws:"开头的ID按现有逻辑处理

### 解码流程

```
输入: "ws:agent-abc123:c3JjL21haW4uanM"
  ↓
检查前缀: startsWith("ws:")
  ↓
分割字符串: ["ws", "agent-abc123", "c3JjL21haW4uanM"]
  ↓
提取workspaceId: "agent-abc123"
  ↓
Base64解码路径: "src/main.js"
  ↓
输出: {workspaceId: "agent-abc123", relativePath: "src/main.js"}
```

## Correctness Properties

属性是对系统行为的形式化描述，应该在所有有效执行中保持为真。

### Property 1: 工作区工件ID包含前缀标识符

*For any* 工作区ID和文件相对路径，编码生成的工件ID应该以"ws:"前缀开始

**Validates: Requirements 1.2**

### Property 2: 工件ID编解码往返一致性

*For any* 工作区ID和文件相对路径，编码后再解码应该得到相同的工作区ID和路径

**Validates: Requirements 1.3**

### Property 3: 编码后的工件ID不包含文件系统特殊字符

*For any* 工作区ID和文件相对路径（包含特殊字符如空格、斜杠、中文等），编码后的工件ID应该只包含安全字符（字母、数字、冒号、连字符、下划线）

**Validates: Requirements 1.4**

### Property 4: 工件类型识别正确性

*For any* 工件ID，如果以"ws:"开头则应被识别为工作区工件，否则按现有逻辑处理

**Validates: Requirements 2.1**

### Property 5: 无效格式返回解析错误

*For any* 格式无效的字符串（如"ws:only-one-part"、"ws:::"、空字符串等），解码函数应该返回null

**Validates: Requirements 3.3**

### Property 6: 工作区工件路径构建正确性

*For any* 工作区ID和文件相对路径，构建的完整文件路径应该等于工作区根目录 + 工作区ID + 文件相对路径

**Validates: Requirements 4.3**



## Error Handling

### 编码错误处理

1. **空参数处理**
   - 工作区ID或路径为空/null/undefined时，抛出错误
   - 错误信息：`"workspaceId and relativePath are required"`

2. **无效字符处理**
   - 工作区ID包含冒号时，记录警告日志但继续处理
   - Base64编码会自动处理所有字符

### 解码错误处理

1. **格式验证**
   - 不以"ws:"开头：返回null
   - 分割后部分数量不足3个：返回null
   - Base64解码失败：返回null

2. **错误日志**
   - 所有解码失败都记录debug级别日志
   - 包含原始工件ID用于调试

### 文件读取错误处理

1. **工件不存在**
   - 返回null而不是抛出异常
   - 记录warn级别日志

2. **路径安全检查**
   - 工作区文件路径必须在工作区目录内
   - 使用WorkspaceManager现有的路径安全检查

3. **文件系统错误**
   - ENOENT: 返回`{error: "file_not_found"}`
   - EACCES: 返回`{error: "permission_denied"}`
   - 其他错误: 返回`{error: "read_failed", message: err.message}`

## Testing Strategy

### 单元测试

使用现有的测试框架（基于Vitest）进行单元测试。

**ArtifactIdCodec测试**：
- 测试编码功能：正常路径、包含特殊字符的路径、中文路径
- 测试解码功能：有效格式、无效格式、边界情况
- 测试类型识别：工作区ID、无效ID
- 测试错误处理：空参数、格式错误

**ArtifactStore集成测试**：
- 测试读取工作区工件（新功能）
- 测试工件不存在的情况
- 测试错误处理

**WorkspaceManager集成测试**：
- 测试writeFile返回工件ID
- 测试工件ID格式正确性

### 属性测试

使用fast-check库进行属性测试，每个测试运行100次以上。

**测试配置**：
```javascript
import fc from 'fast-check';

// 工作区ID生成器：字母数字和连字符
const workspaceIdArb = fc.stringOf(
  fc.oneof(fc.char(), fc.constantFrom('-', '_')),
  { minLength: 1, maxLength: 50 }
);

// 文件路径生成器：包含各种字符
const filePathArb = fc.stringOf(
  fc.oneof(
    fc.char(),
    fc.constantFrom('/', '\\', ' ', '.', '-', '_', '中', '文')
  ),
  { minLength: 1, maxLength: 100 }
);
```

**属性测试任务**：
1. Property 1: 前缀测试
2. Property 2: Round-trip测试
3. Property 3: 安全字符测试
4. Property 4: 类型识别测试
5. Property 5: 错误处理测试
6. Property 6: 路径构建测试

### 集成测试

**端到端测试流程**：
1. 创建测试工作区
2. 使用write_file工具写入文件
3. 验证返回的工件ID格式
4. 使用get_artifact读取工件
5. 验证内容正确性

### 测试覆盖率目标

- 代码覆盖率：>90%
- 分支覆盖率：>85%
- 属性测试：每个属性100+次迭代
