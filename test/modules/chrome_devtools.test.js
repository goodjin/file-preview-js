/**
 * Chrome DevTools 调试采集测试
 * 目标：验证 TabManager.enableDevtools / getDevtoolsContent 的行为与边界
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TabManager } from "../../modules/chrome/tab_manager.js";

/**
 * 构造一个可记录 page.on 注册回调的 mock Page
 * @returns {{page: any, handlers: Map<string, Function>}}
 */
function createMockPage() {
  const handlers = new Map();
  const page = {
    setViewport: vi.fn(async () => {}),
    authenticate: vi.fn(async () => {}),
    goto: vi.fn(async () => {}),
    url: vi.fn(() => "about:blank"),
    title: vi.fn(async () => "Mock"),
    isClosed: vi.fn(() => false),
    close: vi.fn(async () => {}),
    on: vi.fn((event, handler) => {
      handlers.set(event, handler);
    })
  };
  return { page, handlers };
}

describe("Chrome DevTools 调试采集", () => {
  /** @type {TabManager} */
  let tabManager;
  /** @type {any} */
  let mockBrowserManager;
  /** @type {ReturnType<typeof createMockPage>} */
  let mock;

  beforeEach(() => {
    mock = createMockPage();
    mockBrowserManager = {
      getPuppeteerBrowser: vi.fn(() => ({ newPage: vi.fn(async () => mock.page) })),
      getBrowser: vi.fn(() => ({ proxy: null }))
    };
    tabManager = new TabManager({ log: { info: vi.fn(), debug: vi.fn(), error: vi.fn(), warn: vi.fn() }, browserManager: mockBrowserManager });
  });

  it("enableDevtools 应注册 console/pageerror/requestfailed 监听（且只注册一次）", async () => {
    const created = await tabManager.newTab("browser-1");
    expect(created.ok).toBe(true);

    const tabId = created.tabId;

    const first = await tabManager.enableDevtools(tabId, { maxEntries: 10 });
    expect(first.ok).toBe(true);
    expect(mock.page.on).toHaveBeenCalledWith("console", expect.any(Function));
    expect(mock.page.on).toHaveBeenCalledWith("pageerror", expect.any(Function));
    expect(mock.page.on).toHaveBeenCalledWith("requestfailed", expect.any(Function));

    const onCallsAfterFirst = mock.page.on.mock.calls.length;
    const second = await tabManager.enableDevtools(tabId, { maxEntries: 10 });
    expect(second.ok).toBe(true);
    expect(mock.page.on.mock.calls.length).toBe(onCallsAfterFirst);
  });

  it("getDevtoolsContent 应按 maxEntries 做环形裁剪并累计 dropped", async () => {
    const created = await tabManager.newTab("browser-1");
    const tabId = created.tabId;

    await tabManager.enableDevtools(tabId, { maxEntries: 2, captureConsole: true });

    const consoleHandler = mock.handlers.get("console");
    expect(typeof consoleHandler).toBe("function");

    const makeConsoleMsg = (text) => ({
      type: () => "log",
      text: () => text,
      location: () => ({ url: "https://example.com", lineNumber: 1, columnNumber: 1 })
    });

    consoleHandler(makeConsoleMsg("a"));
    consoleHandler(makeConsoleMsg("b"));
    consoleHandler(makeConsoleMsg("c"));

    const result = await tabManager.getDevtoolsContent(tabId, {});
    expect(result.ok).toBe(true);
    expect(result.total).toBe(2);
    expect(result.dropped).toBe(1);
    expect(result.entries.map((e) => e.text)).toEqual(["b", "c"]);
  });

  it("captureConsole=false 时不应写入 console 日志", async () => {
    const created = await tabManager.newTab("browser-1");
    const tabId = created.tabId;

    await tabManager.enableDevtools(tabId, { maxEntries: 10, captureConsole: false });

    const consoleHandler = mock.handlers.get("console");
    consoleHandler({
      type: () => "log",
      text: () => "should-not-record",
      location: () => ({ url: "https://example.com", lineNumber: 1, columnNumber: 1 })
    });

    const result = await tabManager.getDevtoolsContent(tabId, {});
    expect(result.ok).toBe(true);
    expect(result.total).toBe(0);
  });

  it("clearAfterRead=true 应清空缓存并重置计数", async () => {
    const created = await tabManager.newTab("browser-1");
    const tabId = created.tabId;

    await tabManager.enableDevtools(tabId, { maxEntries: 10, captureConsole: true });
    const consoleHandler = mock.handlers.get("console");
    consoleHandler({
      type: () => "log",
      text: () => "x",
      location: () => ({ url: "https://example.com", lineNumber: 1, columnNumber: 1 })
    });

    const first = await tabManager.getDevtoolsContent(tabId, { clearAfterRead: true });
    expect(first.ok).toBe(true);
    expect(first.total).toBe(1);
    expect(first.entries.length).toBe(1);

    const second = await tabManager.getDevtoolsContent(tabId, {});
    expect(second.ok).toBe(true);
    expect(second.total).toBe(0);
    expect(second.dropped).toBe(0);
  });
});

