import { describe, expect, test } from "bun:test";
import { MessageBus } from "../../src/platform/message_bus.js";

describe("MessageBus", () => {
  test("delivers FIFO per recipient", () => {
    const bus = new MessageBus();
    bus.send({ to: "a", from: "x", payload: 1 });
    bus.send({ to: "a", from: "x", payload: 2 });
    const m1 = bus.receiveNext("a");
    const m2 = bus.receiveNext("a");
    expect(m1.payload).toBe(1);
    expect(m2.payload).toBe(2);
  });
});
