## 目标
- 工作区文件在前端打开时使用后端提供的 `ws:` 工件ID（前端不再自造ID）。
- Windows 下 `/api/workspaces/:id/file` 读取 `{workspaceId}.meta.json` 时对 key 做 `/` 归一化，保证能取到 messageId/agentId 等元信息。

## 改动点
### 1) 后端：工作区文件列表返回 artifactId
- 文件：`src/platform/services/http/http_server.js`
- 位置：`_handleGetWorkspaceFiles(workspaceId, res)`（GET /api/workspaces/:workspaceId）
- 行为：在 `files.push({...})` 的对象里新增 `artifactId` 字段：
  - 值为 `ArtifactIdCodec.encode(workspaceId, entryRelativePath)`
  - 确保 `entryRelativePath` 使用 `/` 分隔（当前实现已用 `/` 拼接，保持不变）

### 2) 前端：优先使用 file.artifactId 作为条目 id
- 文件：`web/js/components/artifact-manager.mjs`
- 位置：`loadWorkspaceFiles(workspaceId)` 的 map 映射
- 行为：把 `id: `${workspaceId}/${file.path}`` 改为 `id: file.artifactId ?? `${workspaceId}/${file.path}``
  - 兼容旧后端返回（artifactId 缺失时不影响现状）

### 3) 后端：/api/workspaces/:id/file 读取 meta key 归一化
- 文件：`src/platform/services/http/http_server.js`
- 位置：`_handleGetWorkspaceFile(workspaceId, filePath, res)`
- 行为：用于查 meta 的 key 统一转成 `/`：
  - `normalizedPath` 用于安全检查与实际文件路径
  - 另建 `metaKey = normalizedPath.replace(/\\/g, "/")`（或等价逻辑）
  - `fileMeta = workspaceMeta?.files?.[metaKey] || null`

## 测试与验证（不启动项目）
- 追加/更新单测：
  - 覆盖 `ArtifactIdCodec.encode(workspaceId, relativePath)` 对包含中文/空格/多级目录路径的输出与可 decode。
  - 覆盖 meta key：给定 meta 文件使用 `/` key，模拟 windows 风格 `a\\b.txt` 输入时仍能取到 meta。

## 风险控制
- 前端改动保持向后兼容：后端未升级时仍按旧 id 拼接工作。
- 后端新增字段不破坏旧客户端：旧客户端忽略未知字段。

## 交付物
- 后端：工作区文件列表包含 `artifactId`；工作区文件读取能稳定取到 meta。
- 前端：工作区模式双击能走 `/artifacts/:wsId/...` 正常打开并展示。