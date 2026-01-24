import { describe, expect, test } from "bun:test";
import path from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { HTTPServer } from "../../src/platform/services/http/http_server.js";
import ArtifactIdCodec from "../../src/platform/services/artifact/artifact_id_codec.js";

function createMockRes() {
  const state = {
    statusCode: null,
    headers: {},
    body: "",
    headersSent: false
  };

  const res = {
    headersSent: false,
    setHeader(name, value) {
      state.headers[String(name).toLowerCase()] = String(value);
    },
    writeHead(statusCode) {
      state.statusCode = statusCode;
      this.headersSent = true;
      state.headersSent = true;
    },
    end(body = "") {
      state.body = String(body);
    }
  };

  return { res, state };
}

describe("HTTPServer workspace endpoints", () => {
  test("GET /api/workspaces/:workspaceId 返回每个文件的 ws: artifactId", async () => {
    const baseDir = path.resolve(
      process.cwd(),
      `test/.tmp/http_ws_${Date.now()}_${Math.random().toString(36).slice(2)}`
    );

    await rm(baseDir, { recursive: true, force: true });

    try {
      const runtimeDir = path.join(baseDir, "runtime");
      const workspacesDir = path.join(baseDir, "workspaces");
      const workspaceId = "ws-test-1";
      const fileRelPath = "dir/sub.txt";
      const workspaceFilePath = path.join(workspacesDir, workspaceId, "dir", "sub.txt");

      await mkdir(path.dirname(workspaceFilePath), { recursive: true });
      await mkdir(runtimeDir, { recursive: true });
      await writeFile(workspaceFilePath, "hello", "utf8");

      const metaFilePath = path.join(workspacesDir, `${workspaceId}.meta.json`);
      await writeFile(
        metaFilePath,
        JSON.stringify(
          {
            workspaceId,
            files: {
              [fileRelPath]: { messageId: "m1", agentId: "a1", mimeType: "text/plain" }
            }
          },
          null,
          2
        ),
        "utf8"
      );

      const server = new HTTPServer({ runtimeDir });
      const { res, state } = createMockRes();

      await server._handleGetWorkspaceFiles(workspaceId, res);

      expect(state.statusCode).toBe(200);
      const payload = JSON.parse(state.body);
      expect(payload.workspaceId).toBe(workspaceId);
      expect(Array.isArray(payload.files)).toBe(true);
      expect(payload.files.length).toBe(1);
      expect(payload.files[0].artifactId).toBe(ArtifactIdCodec.encode(workspaceId, fileRelPath));
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  test("GET /api/workspaces/:workspaceId/file 在 Windows 下能用 / key 取到 meta", async () => {
    const baseDir = path.resolve(
      process.cwd(),
      `test/.tmp/http_ws_meta_${Date.now()}_${Math.random().toString(36).slice(2)}`
    );

    await rm(baseDir, { recursive: true, force: true });

    try {
      const runtimeDir = path.join(baseDir, "runtime");
      const workspacesDir = path.join(baseDir, "workspaces");
      const workspaceId = "ws-test-2";
      const fileRelPath = "dir/sub.txt";
      const workspaceFilePath = path.join(workspacesDir, workspaceId, "dir", "sub.txt");

      await mkdir(path.dirname(workspaceFilePath), { recursive: true });
      await mkdir(runtimeDir, { recursive: true });
      await writeFile(workspaceFilePath, "hello", "utf8");

      const metaFilePath = path.join(workspacesDir, `${workspaceId}.meta.json`);
      await writeFile(
        metaFilePath,
        JSON.stringify(
          {
            workspaceId,
            files: {
              [fileRelPath]: { messageId: "m2", agentId: "a2", mimeType: "text/plain" }
            }
          },
          null,
          2
        ),
        "utf8"
      );

      const server = new HTTPServer({ runtimeDir });
      const { res, state } = createMockRes();

      await server._handleGetWorkspaceFile(workspaceId, fileRelPath, res);

      expect(state.statusCode).toBe(200);
      const payload = JSON.parse(state.body);
      expect(payload.workspaceId).toBe(workspaceId);
      expect(payload.path).toBeDefined();
      expect(payload.messageId).toBe("m2");
      expect(payload.agentId).toBe("a2");
      expect(payload.meta).toBeTruthy();
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });
});

