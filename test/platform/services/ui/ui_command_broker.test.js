import { describe, it, expect } from "vitest";
import { UiCommandBroker } from "../../../../src/platform/services/ui/ui_command_broker.js";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

describe("UiCommandBroker", () => {
  it("waitForNextCommand: 队列为空时可等待，enqueue 后立即返回命令", async () => {
    const broker = new UiCommandBroker({ activeMaxAgeMs: 1000, logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} } });
    const p = broker.waitForNextCommand("c1", 500);
    await sleep(10);
    const enq = broker.enqueueCommand("c1", { type: "x", payload: { a: 1 } });
    expect(enq.ok).toBe(true);
    const cmd = await p;
    expect(cmd).toBeTruthy();
    expect(cmd.type).toBe("x");
    expect(cmd.payload).toEqual({ a: 1 });
  });

  it("waitForNextCommand: 超时后返回 null", async () => {
    const broker = new UiCommandBroker({ activeMaxAgeMs: 1000, logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} } });
    const started = Date.now();
    const cmd = await broker.waitForNextCommand("c1", 30);
    const elapsed = Date.now() - started;
    expect(cmd).toBeNull();
    expect(elapsed).toBeGreaterThanOrEqual(20);
  });

  it("waitForResult/resolveResult: 正常回传结果", async () => {
    const broker = new UiCommandBroker({ activeMaxAgeMs: 1000, logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} } });
    const p = broker.waitForResult("cmd-1", 500);
    const resolved = broker.resolveResult("cmd-1", { ok: true, result: { x: 1 } });
    expect(resolved.ok).toBe(true);
    const r = await p;
    expect(r).toEqual({ ok: true, result: { x: 1 } });
  });

  it("waitForResult: 超时会抛出 ui_timeout", async () => {
    const broker = new UiCommandBroker({ activeMaxAgeMs: 1000, logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} } });
    let thrown = null;
    try {
      await broker.waitForResult("cmd-1", 20);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeTruthy();
    expect(thrown.code || thrown.message).toBe("ui_timeout");
  });
});
