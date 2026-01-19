import { describe, test, expect, beforeEach, vi } from 'vitest';
import { ConversationManager } from '../../../../src/platform/services/conversation/conversation_manager.js';

/**
 * ConversationManager 自动压缩功能测试
 * 
 * 测试范围：
 * - 自动压缩管理器的设置和获取
 * - processAutoCompression 方法的各种场景
 * - 错误处理和日志记录
 */
describe('ConversationManager - Auto Compression', () => {
  let conversationManager;
  let mockAutoCompressionManager;
  let mockLogger;

  beforeEach(() => {
    // 创建 mock 对象
    mockAutoCompressionManager = {
      process: vi.fn()
    };

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };

    // 创建 ConversationManager 实例
    conversationManager = new ConversationManager({
      logger: mockLogger
    });
  });

  describe('setAutoCompressionManager', () => {
    test('设置自动压缩管理器', () => {
      conversationManager.setAutoCompressionManager(mockAutoCompressionManager);
      
      expect(conversationManager._autoCompressionManager).toBe(mockAutoCompressionManager);
    });

    test('可以设置为 null', () => {
      conversationManager.setAutoCompressionManager(mockAutoCompressionManager);
      conversationManager.setAutoCompressionManager(null);
      
      expect(conversationManager._autoCompressionManager).toBeNull();
    });
  });

  describe('构造函数中设置自动压缩管理器', () => {
    test('通过构造函数参数设置', () => {
      const manager = new ConversationManager({
        autoCompressionManager: mockAutoCompressionManager,
        logger: mockLogger
      });
      
      expect(manager._autoCompressionManager).toBe(mockAutoCompressionManager);
    });

    test('默认为 null', () => {
      const manager = new ConversationManager({
        logger: mockLogger
      });
      
      expect(manager._autoCompressionManager).toBeNull();
    });
  });

  describe('processAutoCompression', () => {
    beforeEach(() => {
      conversationManager.setAutoCompressionManager(mockAutoCompressionManager);
    });

    test('正常处理自动压缩', async () => {
      const agentId = 'test-agent';
      const messages = [
        { role: 'system', content: '你是一个助手' },
        { role: 'user', content: '你好' },
        { role: 'assistant', content: '你好！有什么可以帮助你的吗？' }
      ];

      // 设置会话
      conversationManager.conversations.set(agentId, messages);

      await conversationManager.processAutoCompression(agentId);

      // 验证压缩管理器被调用
      expect(mockAutoCompressionManager.process).toHaveBeenCalledWith(messages);
      expect(mockAutoCompressionManager.process).toHaveBeenCalledTimes(1);

      // 验证日志记录
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'ConversationManager.processAutoCompression: 开始自动压缩',
        { agentId, messageCount: 3 }
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'ConversationManager.processAutoCompression: 自动压缩完成',
        { agentId, messageCount: 3 }
      );
    });

    test('未设置压缩管理器时跳过处理', async () => {
      conversationManager.setAutoCompressionManager(null);
      const agentId = 'test-agent';

      await conversationManager.processAutoCompression(agentId);

      // 验证日志记录
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'ConversationManager.processAutoCompression: 未设置压缩管理器，跳过自动压缩',
        { agentId }
      );
    });

    test('会话不存在时跳过处理', async () => {
      const agentId = 'non-existent-agent';

      await conversationManager.processAutoCompression(agentId);

      // 验证压缩管理器未被调用
      expect(mockAutoCompressionManager.process).not.toHaveBeenCalled();

      // 验证日志记录
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'ConversationManager.processAutoCompression: 会话不存在，跳过自动压缩',
        { agentId }
      );
    });

    test('压缩管理器抛出异常时的处理', async () => {
      const agentId = 'test-agent';
      const messages = [{ role: 'user', content: 'test' }];
      const error = new Error('压缩管理器异常');

      // 设置会话
      conversationManager.conversations.set(agentId, messages);

      // 模拟压缩管理器抛出异常
      mockAutoCompressionManager.process.mockRejectedValue(error);

      // 不应该抛出异常
      await expect(conversationManager.processAutoCompression(agentId)).resolves.toBeUndefined();

      // 验证错误日志
      expect(mockLogger.error).toHaveBeenCalledWith(
        'ConversationManager.processAutoCompression: 自动压缩异常',
        {
          agentId,
          error: error.message,
          stack: error.stack
        }
      );
    });

    test('传递的消息数组是引用', async () => {
      const agentId = 'test-agent';
      const messages = [
        { role: 'system', content: '你是一个助手' },
        { role: 'user', content: '你好' }
      ];

      // 设置会话
      conversationManager.conversations.set(agentId, messages);

      await conversationManager.processAutoCompression(agentId);

      // 验证传递给压缩管理器的是同一个数组引用
      expect(mockAutoCompressionManager.process).toHaveBeenCalledWith(messages);
      
      // 获取调用参数
      const calledWith = mockAutoCompressionManager.process.mock.calls[0][0];
      expect(calledWith).toBe(messages); // 应该是同一个对象引用
    });

    test('无日志记录器时不应该出错', async () => {
      const managerWithoutLogger = new ConversationManager({
        autoCompressionManager: mockAutoCompressionManager
      });

      const agentId = 'test-agent';
      const messages = [{ role: 'user', content: 'test' }];
      
      managerWithoutLogger.conversations.set(agentId, messages);

      // 不应该抛出异常
      await expect(managerWithoutLogger.processAutoCompression(agentId)).resolves.toBeUndefined();

      // 验证压缩管理器被调用
      expect(mockAutoCompressionManager.process).toHaveBeenCalledWith(messages);
    });
  });
});