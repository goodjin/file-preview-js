/**
 * ArtifactIdCodec单元测试
 * 测试工件ID的编码、解码和类型识别功能
 */
import { describe, test, expect } from "bun:test";
import ArtifactIdCodec from "../../../../src/platform/services/artifact/artifact_id_codec.js";

describe("ArtifactIdCodec", () => {
  describe("isWorkspaceArtifact", () => {
    test("识别工作区工件ID", () => {
      expect(ArtifactIdCodec.isWorkspaceArtifact("ws:agent-123:abc")).toBe(true);
      expect(ArtifactIdCodec.isWorkspaceArtifact("ws:test:xyz")).toBe(true);
    });

    test("识别普通工件ID", () => {
      expect(ArtifactIdCodec.isWorkspaceArtifact("12345")).toBe(false);
      expect(ArtifactIdCodec.isWorkspaceArtifact("artifact-123")).toBe(false);
    });

    test("处理无效输入", () => {
      expect(ArtifactIdCodec.isWorkspaceArtifact("")).toBe(false);
      expect(ArtifactIdCodec.isWorkspaceArtifact(null)).toBe(false);
      expect(ArtifactIdCodec.isWorkspaceArtifact(undefined)).toBe(false);
      expect(ArtifactIdCodec.isWorkspaceArtifact(123)).toBe(false);
    });
  });

  describe("encode", () => {
    test("编码基本路径", () => {
      const result = ArtifactIdCodec.encode("agent-123", "src/main.js");
      expect(result).toMatch(/^ws:agent-123:/);
      expect(result.split(":").length).toBe(3);
    });

    test("编码包含特殊字符的路径", () => {
      const result = ArtifactIdCodec.encode("agent-123", "src/my file.js");
      expect(result).toMatch(/^ws:agent-123:/);
      // 不应包含空格
      expect(result).not.toContain(" ");
    });

    test("编码中文路径", () => {
      const result = ArtifactIdCodec.encode("agent-123", "源码/主文件.js");
      expect(result).toMatch(/^ws:agent-123:/);
    });

    test("抛出错误当参数为空", () => {
      expect(() => ArtifactIdCodec.encode("", "path")).toThrow();
      expect(() => ArtifactIdCodec.encode("id", "")).toThrow();
      expect(() => ArtifactIdCodec.encode(null, "path")).toThrow();
      expect(() => ArtifactIdCodec.encode("id", null)).toThrow();
    });
  });

  describe("decode", () => {
    test("解码有效的工作区工件ID", () => {
      const encoded = ArtifactIdCodec.encode("agent-123", "src/main.js");
      const decoded = ArtifactIdCodec.decode(encoded);
      
      expect(decoded).not.toBeNull();
      expect(decoded.workspaceId).toBe("agent-123");
      expect(decoded.relativePath).toBe("src/main.js");
    });

    test("解码包含特殊字符的路径", () => {
      const encoded = ArtifactIdCodec.encode("agent-123", "src/my file.js");
      const decoded = ArtifactIdCodec.decode(encoded);
      
      expect(decoded).not.toBeNull();
      expect(decoded.relativePath).toBe("src/my file.js");
    });

    test("解码中文路径", () => {
      const encoded = ArtifactIdCodec.encode("agent-123", "源码/主文件.js");
      const decoded = ArtifactIdCodec.decode(encoded);
      
      expect(decoded).not.toBeNull();
      expect(decoded.relativePath).toBe("源码/主文件.js");
    });

    test("返回null当格式无效", () => {
      expect(ArtifactIdCodec.decode("invalid")).toBeNull();
      expect(ArtifactIdCodec.decode("ws:only-one-part")).toBeNull();
      expect(ArtifactIdCodec.decode("ws::")).toBeNull();
      expect(ArtifactIdCodec.decode("")).toBeNull();
      expect(ArtifactIdCodec.decode(null)).toBeNull();
    });

    test("处理路径中包含冒号的情况", () => {
      // Windows路径可能包含冒号，如 C:/path/to/file
      const encoded = ArtifactIdCodec.encode("agent-123", "C:/src/main.js");
      const decoded = ArtifactIdCodec.decode(encoded);
      
      expect(decoded).not.toBeNull();
      expect(decoded.relativePath).toBe("C:/src/main.js");
    });
  });

  describe("round-trip", () => {
    test("编码后解码应得到原始值", () => {
      const testCases = [
        { workspaceId: "agent-123", path: "src/main.js" },
        { workspaceId: "test-workspace", path: "README.md" },
        { workspaceId: "agent-abc", path: "src/utils/helper.js" },
        { workspaceId: "ws-001", path: "data/config.json" },
        { workspaceId: "agent-123", path: "src/my file with spaces.js" },
        { workspaceId: "agent-123", path: "源码/主文件.js" },
      ];

      for (const { workspaceId, path } of testCases) {
        const encoded = ArtifactIdCodec.encode(workspaceId, path);
        const decoded = ArtifactIdCodec.decode(encoded);
        
        expect(decoded).not.toBeNull();
        expect(decoded.workspaceId).toBe(workspaceId);
        expect(decoded.relativePath).toBe(path);
      }
    });
  });

  describe("安全字符", () => {
    test("编码后不包含文件系统特殊字符", () => {
      const testPaths = [
        "src/file with spaces.js",
        "path/to/../file.js",
        "path\\with\\backslash.js",
        "file<>name.js",
        "file|name.js",
        "file?name.js",
        "file*name.js",
      ];

      for (const testPath of testPaths) {
        const encoded = ArtifactIdCodec.encode("agent-123", testPath);
        
        // 编码后不应包含这些特殊字符（除了冒号作为分隔符）
        const base64Part = encoded.split(":")[2];
        expect(base64Part).not.toContain(" ");
        expect(base64Part).not.toContain("<");
        expect(base64Part).not.toContain(">");
        expect(base64Part).not.toContain("|");
        expect(base64Part).not.toContain("?");
        expect(base64Part).not.toContain("*");
        expect(base64Part).not.toContain("\\");
        expect(base64Part).not.toContain("/");
      }
    });
  });
});
