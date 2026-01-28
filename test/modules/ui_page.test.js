import { describe, it, expect, vi, beforeEach } from "vitest";
import uiPageModule from "../../modules/ui_page/index.js";

describe("ui_page 模块工具", () => {
  let broker;
  let runtime;

  beforeEach(async () => {
    broker = {
      enqueueToActive: vi.fn(() => ({ ok: true, commandId: "cmd-1" })),
      waitForResult: vi.fn(async () => ({ ok: true, result: 123 }))
    };
    runtime = { uiCommandBroker: broker, log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } };
    await uiPageModule.init(runtime);
  });

  it("ui_page_eval_js: 应投递 eval_js 并等待结果", async () => {
    const r = await uiPageModule.executeToolCall({}, "ui_page_eval_js", { script: "return 1;", timeoutMs: 111 });
    expect(broker.enqueueToActive).toHaveBeenCalledWith({ type: "eval_js", payload: { script: "return 1;" } });
    expect(broker.waitForResult).toHaveBeenCalledWith("cmd-1", 111);
    expect(r).toEqual({ ok: true, result: 123 });
  });

  it("ui_page_get_content: 应投递 get_content", async () => {
    await uiPageModule.executeToolCall({}, "ui_page_get_content", { format: "text", selector: "#x", maxChars: 10, timeoutMs: 1000 });
    expect(broker.enqueueToActive).toHaveBeenCalledWith({
      type: "get_content",
      payload: { selector: "#x", format: "text", maxChars: 10 }
    });
  });

  it("ui_page_dom_patch: 应投递 dom_patch", async () => {
    await uiPageModule.executeToolCall({}, "ui_page_dom_patch", { operations: [{ op: "setText", selector: "body", value: "x" }], timeoutMs: 1000 });
    expect(broker.enqueueToActive).toHaveBeenCalledWith({
      type: "dom_patch",
      payload: { operations: [{ op: "setText", selector: "body", value: "x" }] }
    });
  });

  it("未连接 UI 时应返回 ui_client_not_connected", async () => {
    broker.enqueueToActive.mockImplementationOnce(() => ({ ok: false, error: "ui_client_not_connected" }));
    const r = await uiPageModule.executeToolCall({}, "ui_page_eval_js", { script: "return 1;" });
    expect(r).toEqual({ ok: false, error: "ui_client_not_connected" });
  });

  it("等待超时应返回 ui_timeout", async () => {
    broker.waitForResult.mockImplementationOnce(async () => {
      throw { code: "ui_timeout" };
    });
    const r = await uiPageModule.executeToolCall({}, "ui_page_eval_js", { script: "return 1;", timeoutMs: 10 });
    expect(r).toEqual({ error: "ui_timeout" });
  });
});

