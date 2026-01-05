import { describe, expect, test } from "bun:test";
import path from "node:path";
import { rm } from "node:fs/promises";
import { ArtifactStore } from "../../src/platform/artifact_store.js";

describe("ArtifactStore", () => {
  test("putArtifact then getArtifact returns stored payload", async () => {
    const dir = path.resolve(process.cwd(), "test/.tmp/artifacts_test");
    await rm(dir, { recursive: true, force: true });

    const store = new ArtifactStore({ artifactsDir: dir });
    const ref = await store.putArtifact({ type: "json", content: { a: 1 }, meta: { x: "y" } });
    const loaded = await store.getArtifact(ref);

    expect(loaded.type).toBe("json");
    expect(loaded.content).toEqual({ a: 1 });
    expect(loaded.meta).toEqual({ x: "y" });
  });
});
