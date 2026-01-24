import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Runtime } from "../../../../src/platform/core/runtime.js";
import { Config } from "../../../../src/platform/utils/config/config.js";
import { rm, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const TEST_DIR = path.resolve(process.cwd(), "test/.tmp/artifact_reserve_file_test");

describe("ArtifactStore reserveArtifactFile / resolveArtifactFilePath", () => {
  let runtime;
  let config;

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
          maxSteps: 10
        },
        null,
        2
      ),
      "utf8"
    );

    config = new Config(TEST_DIR);
    runtime = new Runtime({ configService: config });
    await runtime.init();
  });

  afterEach(async () => {
    if (runtime) await runtime.shutdown();
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  test("reserveArtifactFile should create meta and return filePath with extension", async () => {
    const reserved = await runtime.artifacts.reserveArtifactFile({
      name: "out.mp4",
      messageId: "m1",
      createdByAgentId: "a1",
      meta: { tag: "t" }
    });

    expect(typeof reserved.artifactId).toBe("string");
    expect(reserved.artifactId.length).toBeGreaterThan(10);
    expect(typeof reserved.filePath).toBe("string");
    expect(reserved.filePath.endsWith(".mp4")).toBe(true);

    const meta = await runtime.artifacts.getMetadata(reserved.artifactId);
    expect(meta).toBeTruthy();
    expect(meta.name).toBe("out.mp4");
    expect(meta.messageId).toBe("m1");
    expect(meta.meta?.createdByAgentId).toBe("a1");
    expect(meta.meta?.tag).toBe("t");
  });

  test("resolveArtifactFilePath should return actual path for regular artifact", async () => {
    const id = await runtime.artifacts.putArtifact({
      name: "hello.txt",
      type: "text/plain",
      content: "hello"
    });

    const resolved = await runtime.artifacts.resolveArtifactFilePath(id);
    expect(typeof resolved).toBe("string");
    expect(resolved.includes(id)).toBe(true);
  });
});

