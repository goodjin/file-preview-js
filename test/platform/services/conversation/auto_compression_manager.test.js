import { describe, test, expect, beforeEach, vi } from 'vitest';
import { AutoCompressionManager } from '../../../../src/platform/services/conversation/auto_compression_manager.js';

/**
 * AutoCompressionManager 单元测试
 * 
 * 测试范围：
 * - 构造函数参数验证
 * - process 方法基础功能
 * - 配置加载机制
 * - 错误处理
 */
describe('AutoCompressionManager', () => {
  let mockConfigService;
  let mockLlmClient;
  let mockLogger;

  beforeEach(() => {
    // 创建 mock 对象
    mockConfigService = {
      get: vi.fn(),
      set: vi.fn()
    };

    mockLlmClient = {
      chat: vi.fn(),
      complete: vi.fn()
    };

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };
  });

  describe('构造函数', () => {
    test('正常创建实例', () => {
      const manager = new AutoCompressionManager(mockConfigService, mockLlmClient, mockLogger);
      
      expect(manager).toBeInstanceOf(AutoCompressionManager);
      expect(manager._configService).toBe(mockConfigService);
      expect(manager._llmClient).toBe(mockLlmClient);
      expect(manager._logger).toBe(mockLogger);
    });

    test('缺少 configService 时抛出异常', () => {
      expect(() => {
        new AutoCompressionManager(null, mockLlmClient, mockLogger);
      }).toThrow('AutoCompressionManager requires configService');
    });

    test('缺少 llmClient 时抛出异常', () => {
      expect(() => {
        new AutoCompressionManager(mockConfigService, null, mockLogger);
      }).toThrow('AutoCompressionManager requires llmClient');
    });

    test('缺少 logger 时抛出异常', () => {
      expect(() => {
        new AutoCompressionManager(mockConfigService, mockLlmClient, null);
      }).toThrow('AutoCompressionManager requires logger');
    });
  });

  describe('process 方法', () => {
    let manager;

    beforeEach(() => {
      manager = new AutoCompressionManager(mockConfigService, mockLlmClient, mockLogger);
    });

    test('处理正常的消息数组', async () => {
      const messages = [
        { role: 'system', content: '你是一个助手' },
        { role: 'user', content: '你好' },
        { role: 'assistant', content: '你好！有什么可以帮助你的吗？' }
      ];

      await manager.process(messages);

      // 验证日志记录
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'AutoCompressionManager.process: 开始处理自动压缩',
        { messageCount: 3 }
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'AutoCompressionManager.process: 自动压缩处理完成（当前为基础版本）',
        { messageCount: 3, processed: true }
      );
    });

    test('处理空消息数组', async () => {
      const messages = [];

      await manager.process(messages);

      // 验证日志记录
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'AutoCompressionManager.process: 消息数组为空，跳过压缩'
      );
    });

    test('处理非数组参数', async () => {
      await manager.process(null);

      // 验证警告日志
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'AutoCompressionManager.process: messages 不是数组',
        { messagesType: 'object' }
      );

      await manager.process('invalid');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'AutoCompressionManager.process: messages 不是数组',
        { messagesType: 'string' }
      );
    });

    test('处理过程中的异常不应该抛出', async () => {
      // 模拟内部异常
      const originalDebug = mockLogger.debug;
      mockLogger.debug = vi.fn(() => {
        throw new Error('模拟日志异常');
      });

      const messages = [{ role: 'user', content: 'test' }];

      // 不应该抛出异常
      await expect(manager.process(messages)).resolves.toBeUndefined();

      // 验证错误日志
      expect(mockLogger.error).toHaveBeenCalledWith(
        'AutoCompressionManager.process: 处理异常',
        expect.objectContaining({
          error: '模拟日志异常',
          messageCount: 1
        })
      );

      // 恢复 mock
      mockLogger.debug = originalDebug;
    });
  });

  describe('_loadConfig 方法', () => {
    let manager;

    beforeEach(() => {
      manager = new AutoCompressionManager(mockConfigService, mockLlmClient, mockLogger);
    });

    test('加载默认配置', () => {
      const config = manager._loadConfig();

      expect(config).toEqual({
        enabled: true,
        threshold: 0.8,
        keepRecentCount: 10,
        summaryMaxTokens: 1000,
        summaryModel: null,
        summaryTimeout: 30000
      });

      // 验证日志记录
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'AutoCompressionManager._loadConfig: 配置加载完成',
        { config }
      );
    });

    test('配置缓存机制', () => {
      // 第一次加载
      const config1 = manager._loadConfig();
      
      // 第二次加载应该使用缓存
      const config2 = manager._loadConfig();
      
      expect(config1).toBe(config2); // 应该是同一个对象引用
      
      // debug 日志应该只调用一次（第一次加载）
      expect(mockLogger.debug).toHaveBeenCalledTimes(1);
    });

    test('配置缓存过期后重新加载', async () => {
      // 设置较短的缓存时间用于测试
      manager._configCacheTtl = 10; // 10ms
      
      // 第一次加载
      const config1 = manager._loadConfig();
      
      // 等待缓存过期
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // 第二次加载应该重新读取
      const config2 = manager._loadConfig();
      
      expect(config1).toEqual(config2); // 内容相同
      expect(config1).not.toBe(config2); // 但不是同一个对象引用
      
      // debug 日志应该调用两次
      expect(mockLogger.debug).toHaveBeenCalledTimes(2);
    });
  });
});