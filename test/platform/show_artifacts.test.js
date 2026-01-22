/**
 * show_artifacts 工具测试
 * 
 * 测试 show_artifacts 工具的功能：
 * - 接收工件ID数组
 * - 验证工件是否存在
 * - 返回有效的工件ID列表
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Runtime } from "../../src/platform/core/runtime.js";
import { Config } from "../../src/platform/utils/config/config.js";
import { rm, mkdir, writeFile } from "fs/promises";
import path from "path";

const TEST_DIR = path.resolve(process.cwd(), "test/.tmp/show_artifacts_test");

describe("show_artifacts 工具测试", () => {
  let runtime;
  let config;

  beforeEach(async () => {
    // 清理并创建测试目录
    await rm(TEST_DIR, { recursive: true, force: true });
    await mkdir(TEST_DIR, { recursive: true });

    // 创建配置文件
    const configPath = path.resolve(TEST_DIR, "app.json");
    await writeFile(
      configPath,
      JSON.stringify({
        promptsDir: "config/prompts",
        artifactsDir: path.resolve(TEST_DIR, "artifacts"),
        runtimeDir: TEST_DIR,
        maxSteps: 50
      }, null, 2),
      "utf8"
    );

    // 创建配置（传入配置目录路径）
    config = new Config(TEST_DIR);

    // 创建 Runtime 实例
    runtime = new Runtime({ configService: config });
    await runtime.init();
  });

  afterEach(async () => {
    if (runtime) {
      await runtime.shutdown();
    }
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  test("应该成功展示单个工件", async () => {
    // 创建一个工件
    const ctx = runtime._buildAgentContext(runtime._agents.get("root"));
    const putResult = await runtime._toolExecutor.executeToolCall(ctx, "put_artifact", {
      type: "text/plain",
      content: "测试内容",
      name: "测试工件"
    });

    expect(putResult.artifactIds).toBeDefined();
    expect(putResult.artifactIds.length).toBe(1);
    const artifactId = putResult.artifactIds[0];

    // 使用 show_artifacts 展示工件
    const showResult = await runtime._toolExecutor.executeToolCall(ctx, "show_artifacts", {
      artifactIds: [artifactId]
    });

    expect(showResult.artifactIds).toBeDefined();
    expect(showResult.artifactIds.length).toBe(1);
    expect(showResult.artifactIds[0]).toBe(artifactId);
  });

  test("应该成功展示多个工件", async () => {
    const ctx = runtime._buildAgentContext(runtime._agents.get("root"));
    
    // 创建多个工件
    const ids = [];
    for (let i = 0; i < 3; i++) {
      const putResult = await runtime._toolExecutor.executeToolCall(ctx, "put_artifact", {
        type: "text/plain",
        content: `测试内容 ${i}`,
        name: `测试工件 ${i}`
      });
      ids.push(putResult.artifactIds[0]);
    }

    // 使用 show_artifacts 展示所有工件
    const showResult = await runtime._toolExecutor.executeToolCall(ctx, "show_artifacts", {
      artifactIds: ids
    });

    expect(showResult.artifactIds).toBeDefined();
    expect(showResult.artifactIds.length).toBe(3);
    expect(showResult.artifactIds).toEqual(ids);
  });

  test("应该过滤掉不存在的工件ID", async () => {
    const ctx = runtime._buildAgentContext(runtime._agents.get("root"));
    
    // 创建一个有效工件
    const putResult = await runtime._toolExecutor.executeToolCall(ctx, "put_artifact", {
      type: "text/plain",
      content: "测试内容",
      name: "测试工件"
    });
    const validId = putResult.artifactIds[0];

    // 混合有效和无效的工件ID
    const showResult = await runtime._toolExecutor.executeToolCall(ctx, "show_artifacts", {
      artifactIds: [validId, "invalid-id-1", "invalid-id-2"]
    });

    expect(showResult.artifactIds).toBeDefined();
    expect(showResult.artifactIds.length).toBe(1);
    expect(showResult.artifactIds[0]).toBe(validId);
  });

  test("应该拒绝空数组", async () => {
    const ctx = runtime._buildAgentContext(runtime._agents.get("root"));
    
    const showResult = await runtime._toolExecutor.executeToolCall(ctx, "show_artifacts", {
      artifactIds: []
    });

    expect(showResult.error).toBe("empty_array");
    expect(showResult.message).toBeDefined();
  });

  test("应该拒绝非数组参数", async () => {
    const ctx = runtime._buildAgentContext(runtime._agents.get("root"));
    
    const showResult = await runtime._toolExecutor.executeToolCall(ctx, "show_artifacts", {
      artifactIds: "not-an-array"
    });

    expect(showResult.error).toBe("invalid_parameter");
    expect(showResult.message).toBeDefined();
  });

  test("应该拒绝全部无效的工件ID", async () => {
    const ctx = runtime._buildAgentContext(runtime._agents.get("root"));
    
    const showResult = await runtime._toolExecutor.executeToolCall(ctx, "show_artifacts", {
      artifactIds: ["invalid-1", "invalid-2", "invalid-3"]
    });

    expect(showResult.error).toBe("no_valid_artifacts");
    expect(showResult.message).toBeDefined();
    expect(showResult.invalidIds).toBeDefined();
    expect(showResult.invalidIds.length).toBe(3);
  });

  test("应该过滤掉空字符串和非字符串ID", async () => {
    const ctx = runtime._buildAgentContext(runtime._agents.get("root"));
    
    // 创建一个有效工件
    const putResult = await runtime._toolExecutor.executeToolCall(ctx, "put_artifact", {
      type: "text/plain",
      content: "测试内容",
      name: "测试工件"
    });
    const validId = putResult.artifactIds[0];

    // 混合有效ID和无效类型
    const showResult = await runtime._toolExecutor.executeToolCall(ctx, "show_artifacts", {
      artifactIds: [validId, "", null, 123, {}]
    });

    expect(showResult.artifactIds).toBeDefined();
    expect(showResult.artifactIds.length).toBe(1);
    expect(showResult.artifactIds[0]).toBe(validId);
  });

  test("工具定义应该包含 show_artifacts", () => {
    const toolDefs = runtime._toolExecutor.getToolDefinitions();
    const showArtifactsTool = toolDefs.find(t => t.function?.name === "show_artifacts");
    
    expect(showArtifactsTool).toBeDefined();
    expect(showArtifactsTool.function.description).toBeDefined();
    expect(showArtifactsTool.function.parameters).toBeDefined();
    expect(showArtifactsTool.function.parameters.properties.artifactIds).toBeDefined();
    expect(showArtifactsTool.function.parameters.required).toContain("artifactIds");
  });

  test("show_artifacts 应该在 artifact 工具组中", () => {
    const artifactTools = runtime.toolGroupManager.getToolDefinitions(["artifact"]);
    const toolNames = artifactTools.map(t => t.function?.name);
    
    expect(toolNames).toContain("show_artifacts");
    expect(toolNames).toContain("put_artifact");
    expect(toolNames).toContain("get_artifact");
  });
});
