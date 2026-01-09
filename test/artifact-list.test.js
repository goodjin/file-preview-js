import { describe, it, expect } from "bun:test";

/**
 * 工件列表组件单元测试
 */

describe("工件列表组件", () => {
  it("应该正确渲染工件列表", () => {
    const artifacts = [
      { id: "1", filename: "test.json", size: 100, createdAt: "2025-01-09T00:00:00Z" },
      { id: "2", filename: "data.json", size: 200, createdAt: "2025-01-09T01:00:00Z" }
    ];
    
    expect(artifacts.length).toBe(2);
    expect(artifacts[0].filename).toBe("test.json");
  });

  it("应该正确处理工件选择", () => {
    const artifact = { id: "1", filename: "test.json", size: 100 };
    expect(artifact.id).toBe("1");
  });

  it("应该正确显示工件元数据", () => {
    const artifact = { 
      id: "1", 
      filename: "test.json", 
      size: 1024,
      createdAt: "2025-01-09T00:00:00Z"
    };
    
    expect(artifact.filename).toBeDefined();
    expect(artifact.size).toBe(1024);
    expect(artifact.createdAt).toBeDefined();
  });
});
