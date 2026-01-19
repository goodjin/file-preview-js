/**
 * LlmHandler 自动压缩集成测试
 * 
 * 测试 LlmHandler 中自动压缩功能的集成：
 * - 在 LLM 调用前触发自动压缩
 * - 自动压缩失败不影响 LLM 调用
 * - 完整调用链路测试
 */

import { describe, expect, test, beforeEach, jest } from "bun:test";
import { LlmHandler } from "../../src/platform/runtime/llm_handler.js";

describe("LlmHandler - Auto Compression Integration", () => {
  let llmHandler;
  let mockRuntime;
  let mockConversationManager;
  let mockLlmClient;
  let mockLogger;

  beforeEach(() => {
    // 创建 mock 对象
    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    mockLlmClient = {
      chat: jest.fn(),
      hasActiveRequest: jest.fn(),
      abort: jest.fn()
    };

    mockConversationManager = {
      processAutoCompression: jest.fn(),
      isContextExceeded: jest.fn(),
      getContextStatus: jest.fn(),
      updateTokenUsage: jest.fn(),
      buildContextStatusPrompt: jest.fn(),
      persistConversation: jest.fn()
    };

    mockRuntime = {
      log: mockLogger,
      llm: mockLlmClient,
      _conversationManager: mockConversationManager,
      setAgentComputeStatus: jest.fn(),
      getAgentComputeStatus: jest.fn(),
      getLlmClientForAgent: jest.fn(),
      _buildSystemPromptForAgent: jest.fn(),
      _ensureConversation: jest.fn(),
      _formatMessageForLlm: jest.fn(),
      _checkContextAndWarn: jest.fn(),
      getToolDefinitions: jest.fn(),
      maxToolRounds: 5,
      _activeProcessingAgents: new Set(),
      _agentMetaById: new Map(),
      _agents: new Map(),
      bus: {
        send: jest.fn()
      },
      _generateUUID: jest.fn(),
      _storeErrorMessageCallback: jest.fn(),
      executeToolCall: jest.fn(),
      _emitToolCall: jest.fn(),
      _state: {
        getAndClearInterruptions: jest.fn().mockReturnValue([])
      },
      contentRouter: null,
      artifacts: null
    };

    llmHandler = new LlmHandler(mockRuntime);
  });

  test("handleWithLlm 在 LLM 调用前触发自动压缩", async () => {
    // 准备测试数据
    const agentId = "test-agent";
    const ctx = {
      agent: { id: agentId },
      currentMessage: null,
      tools: {
        sendMessage: jest.fn().mockReturnValue({ messageId: "sent-msg-1" })
      }
    };
    const message = {
      id: "msg-1",
      payload: { text: "Hello" }
    };

    // 设置 mock 返回值
    mockRuntime.getLlmClientForAgent.mockReturnValue(mockLlmClient);
    mockRuntime._buildSystemPromptForAgent.mockReturnValue("System prompt");
    mockRuntime._ensureConversation.mockReturnValue([
      { role: "system", content: "System prompt" }
    ]);
    mockRuntime._formatMessageForLlm.mockReturnValue("Hello");
    mockRuntime.getToolDefinitions.mockReturnValue([]);
    mockConversationManager.buildContextStatusPrompt.mockReturnValue("");
    mockConversationManager.isContextExceeded.mockReturnValue(false);
    mockConversationManager.processAutoCompression.mockResolvedValue();
    
    // 模拟 LLM 返回纯文本响应（无工具调用）
    mockLlmClient.chat.mockResolvedValue({
      role: "assistant",
      content: "Hello back!",
      tool_calls: null,
      _usage: {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15
      }
    });

    // 执行测试
    await llmHandler.handleWithLlm(ctx, message);

    // 验证自动压缩被调用
    expect(mockConversationManager.processAutoCompression).toHaveBeenCalledWith(agentId);

    // 验证 LLM 调用正常进行
    expect(mockLlmClient.chat).toHaveBeenCalled();
    
    // 验证对话持久化被调用
    expect(mockConversationManager.persistConversation).toHaveBeenCalledWith(agentId);
  });

  test("自动压缩失败不影响 LLM 调用", async () => {
    // 准备测试数据
    const agentId = "test-agent";
    const ctx = {
      agent: { id: agentId },
      currentMessage: null,
      tools: {
        sendMessage: jest.fn().mockReturnValue({ messageId: "sent-msg-1" })
      }
    };
    const message = {
      id: "msg-1",
      payload: { text: "Hello" }
    };

    // 设置 mock 返回值
    mockRuntime.getLlmClientForAgent.mockReturnValue(mockLlmClient);
    mockRuntime._buildSystemPromptForAgent.mockReturnValue("System prompt");
    mockRuntime._ensureConversation.mockReturnValue([
      { role: "system", content: "System prompt" }
    ]);
    mockRuntime._formatMessageForLlm.mockReturnValue("Hello");
    mockRuntime.getToolDefinitions.mockReturnValue([]);
    mockConversationManager.buildContextStatusPrompt.mockReturnValue("");
    mockConversationManager.isContextExceeded.mockReturnValue(false);
    
    // 模拟自动压缩失败
    const compressionError = new Error("Compression failed");
    mockConversationManager.processAutoCompression.mockRejectedValue(compressionError);
    
    // 模拟 LLM 返回纯文本响应
    mockLlmClient.chat.mockResolvedValue({
      role: "assistant",
      content: "Hello back!",
      tool_calls: null,
      _usage: {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15
      }
    });

    // 执行测试 - 不应该抛出异常
    await expect(llmHandler.handleWithLlm(ctx, message)).resolves.toBeUndefined();

    // 验证自动压缩被调用
    expect(mockConversationManager.processAutoCompression).toHaveBeenCalledWith(agentId);

    // 验证 LLM 调用仍然进行（自动压缩失败不影响后续流程）
    expect(mockLlmClient.chat).toHaveBeenCalled();
    
    // 验证对话持久化被调用
    expect(mockConversationManager.persistConversation).toHaveBeenCalledWith(agentId);
  });

  test("没有 agentId 时不调用自动压缩", async () => {
    // 准备测试数据 - 没有 agentId
    const ctx = {
      agent: null,
      currentMessage: null
    };
    const message = {
      id: "msg-1",
      payload: { text: "Hello" }
    };

    // 设置 mock 返回值 - 没有任何 llmClient
    mockRuntime.getLlmClientForAgent.mockReturnValue(null);
    mockRuntime.llm = null; // 也设置 runtime.llm 为 null

    // 执行测试 - 应该直接返回，因为没有 llmClient
    await llmHandler.handleWithLlm(ctx, message);

    // 验证自动压缩未被调用
    expect(mockConversationManager.processAutoCompression).not.toHaveBeenCalled();
    
    // 验证 LLM 调用也未被调用
    expect(mockLlmClient.chat).not.toHaveBeenCalled();
  });

  test("没有 conversationManager 时不调用自动压缩", async () => {
    // 准备测试数据
    const agentId = "test-agent";
    const ctx = {
      agent: { id: agentId },
      currentMessage: null,
      tools: {
        sendMessage: jest.fn().mockReturnValue({ messageId: "sent-msg-1" })
      }
    };
    const message = {
      id: "msg-1",
      payload: { text: "Hello" }
    };

    // 移除 conversationManager
    mockRuntime._conversationManager = null;
    mockRuntime.getLlmClientForAgent.mockReturnValue(mockLlmClient);
    mockRuntime._buildSystemPromptForAgent.mockReturnValue("System prompt");
    mockRuntime._ensureConversation.mockReturnValue([
      { role: "system", content: "System prompt" }
    ]);
    mockRuntime._formatMessageForLlm.mockReturnValue("Hello");
    mockRuntime.getToolDefinitions.mockReturnValue([]);
    
    // 模拟 LLM 返回纯文本响应
    mockLlmClient.chat.mockResolvedValue({
      role: "assistant",
      content: "Hello back!",
      tool_calls: null,
      _usage: {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15
      }
    });

    // 执行测试
    await llmHandler.handleWithLlm(ctx, message);

    // 验证自动压缩未被调用（因为没有 conversationManager）
    expect(mockConversationManager.processAutoCompression).not.toHaveBeenCalled();
    
    // 验证 LLM 调用正常进行（没有 conversationManager 不影响 LLM 调用）
    expect(mockLlmClient.chat).toHaveBeenCalled();
  });

  test("上下文超过硬性限制时仍会先调用自动压缩", async () => {
    // 准备测试数据
    const agentId = "test-agent";
    const ctx = {
      agent: { id: agentId },
      currentMessage: null
    };
    const message = {
      id: "msg-1",
      payload: { text: "Hello" }
    };

    // 设置 mock 返回值
    mockRuntime.getLlmClientForAgent.mockReturnValue(mockLlmClient);
    mockRuntime._buildSystemPromptForAgent.mockReturnValue("System prompt");
    mockRuntime._ensureConversation.mockReturnValue([]);
    mockRuntime._formatMessageForLlm.mockReturnValue("Hello");
    mockRuntime.getToolDefinitions.mockReturnValue([]);
    mockConversationManager.buildContextStatusPrompt.mockReturnValue("");
    mockConversationManager.processAutoCompression.mockResolvedValue();
    
    // 模拟上下文超过硬性限制
    mockConversationManager.isContextExceeded.mockReturnValue(true);
    mockConversationManager.getContextStatus.mockReturnValue({
      usedTokens: 150000,
      maxTokens: 128000,
      usagePercent: 1.17
    });

    // 设置智能体元数据
    mockRuntime._agentMetaById.set(agentId, { parentAgentId: "parent-agent" });
    mockRuntime._agents.set("parent-agent", {});

    // 执行测试
    await llmHandler.handleWithLlm(ctx, message);

    // 验证自动压缩仍然被调用（在硬性限制检查之前）
    expect(mockConversationManager.processAutoCompression).toHaveBeenCalledWith(agentId);
    
    // 验证硬性限制检查被调用
    expect(mockConversationManager.isContextExceeded).toHaveBeenCalledWith(agentId);
    
    // 验证 LLM 调用被拒绝（因为超过硬性限制）
    expect(mockLlmClient.chat).not.toHaveBeenCalled();
    
    // 验证错误通知被发送给父智能体
    expect(mockRuntime.bus.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "parent-agent",
        from: agentId,
        payload: expect.objectContaining({
          kind: "error",
          errorType: "context_limit_exceeded"
        })
      })
    );
  });

  test("自动压缩调用顺序正确", async () => {
    // 准备测试数据
    const agentId = "test-agent";
    const ctx = {
      agent: { id: agentId },
      currentMessage: null,
      tools: {
        sendMessage: jest.fn().mockReturnValue({ messageId: "sent-msg-1" })
      }
    };
    const message = {
      id: "msg-1",
      payload: { text: "Hello" }
    };

    // 创建调用顺序追踪
    const callOrder = [];
    
    // 设置 mock 返回值并追踪调用顺序
    mockRuntime.getLlmClientForAgent.mockReturnValue(mockLlmClient);
    mockRuntime._buildSystemPromptForAgent.mockReturnValue("System prompt");
    mockRuntime._ensureConversation.mockReturnValue([
      { role: "system", content: "System prompt" }
    ]);
    mockRuntime._formatMessageForLlm.mockReturnValue("Hello");
    mockRuntime.getToolDefinitions.mockReturnValue([]);
    mockConversationManager.buildContextStatusPrompt.mockReturnValue("");
    mockConversationManager.isContextExceeded.mockReturnValue(false);
    
    mockConversationManager.processAutoCompression.mockImplementation(async () => {
      callOrder.push('processAutoCompression');
    });
    
    mockLlmClient.chat.mockImplementation(async () => {
      callOrder.push('llmClient.chat');
      return {
        role: "assistant",
        content: "Hello back!",
        tool_calls: null,
        _usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15
        }
      };
    });

    mockConversationManager.persistConversation.mockImplementation(async () => {
      callOrder.push('persistConversation');
    });

    // 执行测试
    await llmHandler.handleWithLlm(ctx, message);

    // 验证调用顺序：自动压缩 -> LLM 调用 -> 持久化
    expect(callOrder).toEqual([
      'processAutoCompression',
      'llmClient.chat',
      'persistConversation'
    ]);
  });
});