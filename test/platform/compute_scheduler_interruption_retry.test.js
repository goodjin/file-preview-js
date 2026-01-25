import { describe, test, expect } from "bun:test";
import { ComputeScheduler } from "../../src/platform/runtime/compute_scheduler.js";
import { TurnEngine } from "../../src/platform/runtime/turn_engine.js";
import { AgentCancelManager } from "../../src/platform/runtime/agent_cancel_manager.js";

describe("ComputeScheduler - interruption triggers llm retry", () => {
  test("should cancel in-flight llm and retry with merged interruption", async () => {
    const convByAgent = new Map();
    const bus = (() => {
      const queues = new Map();
      return {
        deliverDueMessages: () => {},
        waitForMessage: async () => {},
        hasPending: () => true,
        receiveNext: (agentId) => {
          const q = queues.get(agentId) ?? [];
          const msg = q.shift() ?? null;
          queues.set(agentId, q);
          return msg;
        },
        send: () => ({ messageId: "x" }),
        _push: (agentId, msg) => {
          const q = queues.get(agentId) ?? [];
          q.push(msg);
          queues.set(agentId, q);
        }
      };
    })();

    const state = (() => {
      const statusByAgent = new Map();
      const active = new Set();
      const interruptions = new Map();
      return {
        getAgentComputeStatus: (agentId) => statusByAgent.get(agentId) ?? "idle",
        setAgentComputeStatus: (agentId, s) => void statusByAgent.set(agentId, s),
        markAgentAsActivelyProcessing: (agentId) => void active.add(agentId),
        unmarkAgentAsActivelyProcessing: (agentId) => void active.delete(agentId),
        addInterruption: (agentId, msg) => {
          const q = interruptions.get(agentId) ?? [];
          q.push(msg);
          interruptions.set(agentId, q);
        },
        getAndClearInterruptions: (agentId) => {
          const q = interruptions.get(agentId) ?? [];
          interruptions.delete(agentId);
          return q;
        }
      };
    })();

    let firstResolve;
    const chatCalls = [];

    const cancelManager = new AgentCancelManager();

    const runtime = {
      log: null,
      bus,
      _state: state,
      _agents: new Map([["a1", { id: "a1" }]]),
      _cancelManager: cancelManager,
      llm: { abort: () => true },
      _conversationManager: { buildContextStatusPrompt: () => "" },
      _buildAgentContext: (agent) => ({ agent }),
      _buildSystemPromptForAgent: () => "sys",
      _ensureConversation: (agentId) => {
        if (!convByAgent.has(agentId)) convByAgent.set(agentId, []);
        return convByAgent.get(agentId);
      },
      _formatMessageForLlm: (_ctx, m) => (m?.payload?.text ? String(m.payload.text) : "msg"),
      _checkContextAndWarn: () => {},
      getToolDefinitions: () => [],
      getLlmClientForAgent: () => ({
        chat: async (input) => {
          chatCalls.push(input);
          if (chatCalls.length === 1) {
            return await new Promise((resolve) => {
              firstResolve = resolve;
            });
          }
          return { role: "assistant", content: "ok" };
        }
      }),
      executeToolCall: async () => ({ ok: true }),
      _emitToolCall: () => {},
      handleMessageInterruption: (agentId, newMessage) => {
        state.addInterruption(agentId, newMessage);
        cancelManager.abort(agentId, { reason: "message_interruption" });
      }
    };

    bus._push("a1", { id: "m1", from: "user", to: "a1", payload: { text: "hi" } });
    const turnEngine = new TurnEngine(runtime);
    const scheduler = new ComputeScheduler(runtime, turnEngine);

    scheduler._ingestMessagesToTurns();
    scheduler._runOneStep();
    expect(chatCalls.length).toBe(1);

    runtime.handleMessageInterruption("a1", { id: "m2", from: "user", to: "a1", payload: { text: "interrupt" } });
    firstResolve({ role: "assistant", content: "late" });
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));

    scheduler._runOneStep();
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));

    expect(chatCalls.length).toBe(2);
    const conv = convByAgent.get("a1") ?? [];
    const hasMerged = conv.some((m) => m?.role === "user" && typeof m.content === "string" && m.content.includes("插话消息"));
    expect(hasMerged).toBe(true);
  });
});

