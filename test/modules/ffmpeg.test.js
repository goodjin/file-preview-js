import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import path from "node:path";
import { rm, mkdir, writeFile, readFile } from "node:fs/promises";

import { Runtime } from "../../src/platform/core/runtime.js";
import { Config } from "../../src/platform/utils/config/config.js";
import { ModuleLoader } from "../../src/platform/extensions/module_loader.js";

const PROJECT_ROOT = path.resolve(import.meta.dir, "..", "..");
const TEST_DIR = path.resolve(process.cwd(), "test/.tmp/ffmpeg_module_test");

describe("FFmpeg Module - Run and Status", () => {
  let runtime;
  let loader;
  let fakeFfmpegScript;

  beforeEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
    await mkdir(TEST_DIR, { recursive: true });

    const configPath = path.resolve(TEST_DIR, "app.json");
    await writeFile(
      configPath,
      JSON.stringify(
        {
          promptsDir: "config/prompts",
          artifactsDir: path.resolve(TEST_DIR, "artifacts"),
          runtimeDir: path.resolve(TEST_DIR, "state"),
          maxSteps: 10,
          modules: {}
        },
        null,
        2
      ),
      "utf8"
    );

    fakeFfmpegScript = path.join(TEST_DIR, "fake_ffmpeg.js");
    await writeFile(
      fakeFfmpegScript,
      [
        'import { writeFile } from "node:fs/promises";',
        "const args = process.argv.slice(2);",
        "if (args.includes(\"--fail\")) {",
        "  console.error(\"intentional_fail\");",
        "  process.exit(1);",
        "}",
        'const idx = args.indexOf("--write");',
        "if (idx >= 0 && args[idx + 1]) {",
        '  await writeFile(args[idx + 1], "hello", "utf8");',
        "}",
        'console.error("frame=1 fps=1 time=00:00:00.01");',
        'console.log("done");'
      ].join("\n"),
      "utf8"
    );

    const config = new Config(TEST_DIR);
    runtime = new Runtime({ configService: config });
    await runtime.init();

    loader = new ModuleLoader({ modulesDir: path.join(PROJECT_ROOT, "modules") });
    await loader.loadModules(
      {
        ffmpeg: {
          ffmpegPath: process.execPath
        }
      },
      runtime
    );
  });

  afterEach(async () => {
    if (loader) {
      await loader.shutdown();
      loader = null;
    }
    if (runtime) {
      await runtime.shutdown();
      runtime = null;
    }
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  it("ffmpeg_run should return taskId and outputArtifactIds immediately, and output becomes complete after completed", async () => {
    const ctx = runtime._buildAgentContext(runtime._agents.get("root"));
    ctx.currentMessage = { id: "m1", taskId: "t1" };

    const runRes = await loader.executeToolCall(ctx, "ffmpeg_run", {
      vargs: `${fakeFfmpegScript} --write $FFMEPG_OUTPUT.txt`,
      artifacts: []
    });

    expect(runRes.taskId).toBeDefined();
    expect(typeof runRes.taskId).toBe("string");
    expect(Array.isArray(runRes.outputArtifactIds)).toBe(true);
    expect(runRes.outputArtifactIds.length).toBe(1);
    expect(Array.isArray(runRes.artifactIds)).toBe(true);
    expect(runRes.artifactIds).toEqual(runRes.outputArtifactIds);

    const outputId = runRes.outputArtifactIds[0];
    const meta = await runtime.artifacts.getMetadata(outputId);
    expect(meta).toBeTruthy();
    expect(meta.messageId).toBe("m1");
    const expectedAgentId = runtime._agents.get("root")?.id;
    expect(meta.createdByAgentId || meta.meta?.createdByAgentId).toBe(expectedAgentId);

    let status;
    const start = Date.now();
    while (true) {
      status = await loader.executeToolCall(ctx, "ffmpeg_task_status", { taskId: runRes.taskId });
      if (status.status === "completed" || status.status === "failed") break;
      if (Date.now() - start > 5000) break;
      await new Promise(r => setTimeout(r, 30));
    }

    expect(status.status).toBe("completed");
    expect(status.exitCode).toBe(0);
    expect(Array.isArray(status.outputArtifactIds)).toBe(true);
    expect(status.outputArtifactIds).toEqual([outputId]);
    expect(Array.isArray(status.artifactIds)).toBe(true);
    expect(status.artifactIds).toContain(outputId);
    expect(Array.isArray(status.logArtifactIds)).toBe(true);
    expect(status.logArtifactIds.length).toBeGreaterThan(0);

    const resolvedPath = await runtime.artifacts.resolveArtifactFilePath(outputId);
    const content = await readFile(resolvedPath, "utf8");
    expect(content).toBe("hello");
  });

  it("ffmpeg_run failure should still return taskId and be queryable by ffmpeg_task_status", async () => {
    const ctx = runtime._buildAgentContext(runtime._agents.get("root"));
    ctx.currentMessage = { id: "m2", taskId: "t2" };

    const runRes = await loader.executeToolCall(ctx, "ffmpeg_run", { vargs: 123, artifacts: [] });
    expect(typeof runRes.taskId).toBe("string");
    expect(runRes.status).toBe("failed");
    expect(runRes.error).toBe("invalid_parameter");

    const status = await loader.executeToolCall(ctx, "ffmpeg_task_status", { taskId: runRes.taskId });
    expect(status.status).toBe("failed");
    expect(status.error).toBe("invalid_parameter");
    expect(status.failure?.stderrTail?.length).toBeGreaterThan(0);
  });

  it("ffmpeg_task_status should expose exitCode and stderrTail on process failure", async () => {
    const ctx = runtime._buildAgentContext(runtime._agents.get("root"));
    ctx.currentMessage = { id: "m3", taskId: "t3" };

    const runRes = await loader.executeToolCall(ctx, "ffmpeg_run", {
      vargs: `${fakeFfmpegScript} --fail $FFMEPG_OUTPUT.txt`,
      artifacts: []
    });
    expect(typeof runRes.taskId).toBe("string");

    let status;
    const start = Date.now();
    while (true) {
      status = await loader.executeToolCall(ctx, "ffmpeg_task_status", { taskId: runRes.taskId });
      if (status.status === "completed" || status.status === "failed") break;
      if (Date.now() - start > 5000) break;
      await new Promise(r => setTimeout(r, 30));
    }

    expect(status.status).toBe("failed");
    expect(status.exitCode).toBe(1);
    expect(status.failure?.stderrTail?.some((l) => String(l).includes("intentional_fail"))).toBe(true);
  });
});
