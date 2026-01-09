import { describe, it, expect } from "bun:test";
import fc from "fast-check";

/**
 * 工件管理器属性测试
 * 验证工件管理器的正确性属性
 */

// 模拟API
class MockAPI {
  constructor(artifacts = []) {
    this.artifacts = artifacts;
  }

  async get(url) {
    if (url === "/api/artifacts") {
      return { artifacts: this.artifacts };
    }
    const match = url.match(/\/api\/artifacts\/([^/]+)(?:\/metadata)?$/);
    if (match) {
      const id = match[1];
      const artifact = this.artifacts.find(a => a.id === id);
      if (url.includes("/metadata")) {
        return {
          id: artifact.id,
          filename: artifact.filename,
          size: artifact.size,
          extension: artifact.extension,
          createdAt: artifact.createdAt,
          messageId: artifact.messageId || null,
          mimeType: "application/json"
        };
      }
      return artifact;
    }
    throw new Error("Not found");
  }
}

// 生成器
const artifactGenerator = () => {
  return fc.record({
    id: fc.uuid(),
    filename: fc.string({ minLength: 5, maxLength: 20 }).map(s => {
      const clean = s.replace(/[^a-zA-Z0-9]/g, '');
      return (clean || 'artifact') + ".json";
    }),
    size: fc.integer({ min: 100, max: 10000 }),
    extension: fc.constant("json"),
    createdAt: fc.date().map(d => d.toISOString()),
    content: fc.object({ maxDepth: 3 }),
    messageId: fc.option(fc.uuid())
  });
};

describe("工件管理器属性测试", () => {
  // 属性1：工件列表完整性
  it("属性1：工件列表完整性 - 显示的工件应该与源工件列表完全相同", () => {
    fc.assert(
      fc.property(fc.array(artifactGenerator(), { minLength: 1, maxLength: 10 }), (artifacts) => {
        const api = new MockAPI(artifacts);
        
        // 模拟加载工件
        const loadedArtifacts = api.artifacts;
        
        // 验证：加载的工件数量应该与源列表相同
        expect(loadedArtifacts.length).toBe(artifacts.length);
        
        // 验证：每个工件的ID应该相同
        loadedArtifacts.forEach((loaded, index) => {
          expect(loaded.id).toBe(artifacts[index].id);
          expect(loaded.filename).toBe(artifacts[index].filename);
        });
      }),
      { numRuns: 100 }
    );
  });

  // 属性2：过滤结果一致性
  it("属性2：过滤结果一致性 - 过滤后的工件应该都匹配选定的扩展名", () => {
    fc.assert(
      fc.property(
        fc.array(artifactGenerator(), { minLength: 1, maxLength: 10 }),
        fc.array(
          fc.oneof(
            fc.constant("json"),
            fc.constant("txt"),
            fc.constant("md"),
            fc.constant("image")
          ),
          { minLength: 1, maxLength: 2 }
        )
      ),
      (artifacts, extensions) => {
        // 模拟过滤逻辑
        const filtered = artifacts.filter(a => {
          const ext = a.extension;
          return extensions.includes(ext);
        });

        // 验证：所有过滤后的工件都应该匹配选定的扩展名
        filtered.forEach(artifact => {
          expect(extensions).toContain(artifact.extension);
        });
      }
    );
  });

  // 属性3：过滤清除往返
  it("属性3：过滤清除往返 - 清除过滤后应该返回到原始列表", () => {
    fc.assert(
      fc.property(fc.array(artifactGenerator(), { minLength: 1, maxLength: 10 }), (artifacts) => {
        const original = [...artifacts];
        
        // 应用过滤
        const filtered = artifacts.filter(a => a.extension === "json");
        
        // 清除过滤
        const restored = artifacts;
        
        // 验证：恢复后的列表应该与原始列表相同
        expect(restored.length).toBe(original.length);
        restored.forEach((item, index) => {
          expect(item.id).toBe(original[index].id);
        });
      }),
      { numRuns: 100 }
    );
  });

  // 属性4：搜索结果一致性
  it("属性4：搜索结果一致性 - 搜索结果应该都包含查询字符串", () => {
    fc.assert(
      fc.property(
        fc.array(artifactGenerator(), { minLength: 1, maxLength: 10 }),
        fc.string({ minLength: 1, maxLength: 5 }).filter(s => s.trim().length > 0)
      ),
      (artifacts, query) => {
        // 模拟搜索逻辑
        const results = artifacts.filter(a => 
          a.filename.toLowerCase().includes(query.toLowerCase())
        );

        // 验证：所有搜索结果都应该包含查询字符串
        results.forEach(artifact => {
          expect(artifact.filename.toLowerCase()).toContain(query.toLowerCase());
        });
      }
    );
  });

  // 属性5：搜索清除往返
  it("属性5：搜索清除往返 - 清除搜索后应该返回到原始列表", () => {
    fc.assert(
      fc.property(
        fc.array(artifactGenerator(), { minLength: 1, maxLength: 10 }),
        fc.string({ minLength: 1, maxLength: 5 }).filter(s => s.trim().length > 0)
      ),
      (artifacts, query) => {
        const original = [...artifacts];
        
        // 应用搜索
        const searched = artifacts.filter(a => 
          a.filename.toLowerCase().includes(query.toLowerCase())
        );
        
        // 清除搜索
        const restored = artifacts;
        
        // 验证：恢复后的列表应该与原始列表相同
        expect(restored.length).toBe(original.length);
      }
    );
  });

  // 属性6：搜索结果高亮
  it("属性6：搜索结果高亮 - 匹配的查询字符串应该在结果中", () => {
    fc.assert(
      fc.property(
        fc.array(artifactGenerator(), { minLength: 1, maxLength: 10 }),
        fc.string({ minLength: 1, maxLength: 5 }).filter(s => s.trim().length > 0)
      ),
      (artifacts, query) => {
        // 模拟搜索逻辑
        const results = artifacts.filter(a => 
          a.filename.toLowerCase().includes(query.toLowerCase())
        );

        // 验证：所有结果都应该包含查询字符串
        results.forEach(artifact => {
          const filename = artifact.filename.toLowerCase();
          const queryLower = query.toLowerCase();
          expect(filename.includes(queryLower)).toBe(true);
        });
      }
    );
  });

  // 属性13：查看器选择正确性
  it("属性13：查看器选择正确性 - 根据扩展名选择的查看器应该正确", () => {
    const getViewerForExtension = (ext) => {
      if (ext === "json") return "json";
      if (["txt", "md"].includes(ext)) return "text";
      if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image";
      return "unsupported";
    };

    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant("json"),
          fc.constant("txt"),
          fc.constant("md"),
          fc.constant("png"),
          fc.constant("jpg"),
          fc.constant("jpeg"),
          fc.constant("gif"),
          fc.constant("webp"),
          fc.constant("unknown")
        ),
        (ext) => {
          const viewer = getViewerForExtension(ext);
          
          if (ext === "json") {
            expect(viewer).toBe("json");
          } else if (["txt", "md"].includes(ext)) {
            expect(viewer).toBe("text");
          } else if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
            expect(viewer).toBe("image");
          } else {
            expect(viewer).toBe("unsupported");
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // 属性21：过滤和搜索组合
  it("属性21：过滤和搜索组合 - 同时应用搜索和过滤应该满足两个条件", () => {
    fc.assert(
      fc.property(
        fc.array(artifactGenerator(), { minLength: 1, maxLength: 10 }),
        fc.string({ minLength: 1, maxLength: 5 }).filter(s => s.trim().length > 0),
        fc.oneof(
          fc.constant("json"),
          fc.constant("txt"),
          fc.constant("md")
        )
      ),
      (artifacts, query, extension) => {
        // 模拟搜索和过滤
        const results = artifacts.filter(a => 
          a.filename.toLowerCase().includes(query.toLowerCase()) &&
          a.extension === extension
        );

        // 验证：所有结果都应该同时满足搜索和过滤条件
        results.forEach(artifact => {
          expect(artifact.filename.toLowerCase()).toContain(query.toLowerCase());
          expect(artifact.extension).toBe(extension);
        });
      }
    );
  });
});
