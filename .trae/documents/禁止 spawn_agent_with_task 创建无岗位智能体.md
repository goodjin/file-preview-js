## 目标
- 禁止创建“无岗位（roleId 为空）”或“岗位不存在（roleId 指向不存在岗位）”的智能体。
- 覆盖两条入口：LLM 工具 `spawn_agent_with_task` 与内部 `ctx.tools.spawnAgent`，避免绕过。

## 修改点
1) 工具入口拦截（LLM 调用）
- 文件：[tool_executor.js](file:///c:/Users/ASUS/Desktop/ai-build-ai/agents/src/platform/runtime/tool_executor.js#L493-L553)
- 改动：在 `_executeSpawnAgentWithTask` 中新增校验
  - `roleId` 必须为非空字符串（trim 后长度 > 0），否则返回 `{ error: "roleId_required" }`
  - `runtime.org.getRole(roleId)` 必须存在，否则返回 `{ error: "role_not_found" }`

2) 最终防线（任何创建路径）
- 文件：[agent_manager.js](file:///c:/Users/ASUS/Desktop/ai-build-ai/agents/src/platform/runtime/agent_manager.js#L67-L142)
- 改动：在 `spawnAgent` 中新增硬校验（在 parent 校验之后、createAgent 之前）
  - `input.roleId` 必须为非空字符串，否则 `throw new Error("roleId_required")`
  - `runtime.org.getRole(input.roleId)` 必须存在，否则 `throw new Error("role_not_found")`

## 错误语义
- 统一使用两个错误码：`roleId_required`、`role_not_found`。
- 工具层用 `{ error }` 返回（保持现有工具错误返回风格）。
- 底层用 `throw Error(code)`（与当前 `parentAgentId_required` 方式一致）。

## 测试调整
- 重点覆盖：
  - `spawn_agent_with_task` 传空/缺 roleId → 返回 roleId_required。
  - `spawn_agent_with_task` 传不存在 roleId → 返回 role_not_found。
  - `ctx.tools.spawnAgent` 传空/缺 roleId → 抛 roleId_required。
  - `ctx.tools.spawnAgent` 传不存在 roleId → 抛 role_not_found。
- 位置：优先在现有 [runtime.test.js](file:///c:/Users/ASUS/Desktop/ai-build-ai/agents/test/platform/runtime.test.js) 相关用例附近补充或修正。

## 验证
- 运行测试套件，确保所有测试通过。
- 回归检查 root/user 初始化不受影响（它们不走 createAgent 链路，[agent_society.js](file:///c:/Users/ASUS/Desktop/ai-build-ai/agents/src/platform/core/agent_society.js#L192-L254)）。

确认后我将按上述方案B开始修改代码与测试。