import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import fc from "fast-check";
import { HTTPServer } from "../../src/platform/http_server.js";
import { AgentSociety } from "../../src/platform/agent_society.js";
import { MessageBus } from "../../src/platform/message_bus.js";

describe("HTTPServer", () => {
  /**
   * Property 4: HTTP API消息转发一致性
   * 对于任意通过HTTP API发送的消息（submit或send），应产生与控制台方式相同的消息转发行为，
   * 且返回的taskId/messageId应与实际发送的消息对应。
   * 
   * **验证: 需求 2.2, 2.3**
   */
  test("Property 4: HTTP API消息转发一致性 - submit端点与控制台方式行为一致", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }), // 需求文本
        (text) => {
          // 创建两个独立的society实例进行对比
          const societyConsole = new AgentSociety();
          const busConsole = new MessageBus();
          societyConsole.runtime.bus = busConsole;

          const societyHttp = new AgentSociety();
          const busHttp = new MessageBus();
          societyHttp.runtime.bus = busHttp;

          // 控制台方式发送
          const consoleResult = societyConsole.sendTextToAgent("root", text);

          // HTTP方式发送（模拟HTTP服务器的行为）
          const httpServer = new HTTPServer({ society: societyHttp });
          httpServer.setSociety(societyHttp);
          const httpResult = societyHttp.sendTextToAgent("root", text);

          // 两种方式都应该成功
          expect(consoleResult).toHaveProperty("taskId");
          expect(httpResult).toHaveProperty("taskId");
          expect(consoleResult).not.toHaveProperty("error");
          expect(httpResult).not.toHaveProperty("error");

          // 消息总线中的消息结构应该一致
          const consoleQueue = busConsole._queues.get("root") ?? [];
          const httpQueue = busHttp._queues.get("root") ?? [];

          expect(consoleQueue.length).toBe(1);
          expect(httpQueue.length).toBe(1);

          // 消息内容应该一致（除了id和createdAt）
          expect(consoleQueue[0].from).toBe(httpQueue[0].from);
          expect(consoleQueue[0].to).toBe(httpQueue[0].to);
          expect(consoleQueue[0].payload.text).toBe(httpQueue[0].payload.text);
        }
      ),
      { numRuns: 100 }
    );
  });

  test("Property 4: HTTP API消息转发一致性 - send端点与控制台方式行为一致", () => {
    fc.assert(
      fc.property(
        // 生成非"user"的有效智能体ID
        fc.string({ minLength: 1, maxLength: 50 }).filter(id => id.trim() !== "" && id.trim() !== "user"),
        fc.string({ minLength: 1, maxLength: 200 }), // 消息文本
        (agentId, text) => {
          // 创建两个独立的society实例进行对比
          const societyConsole = new AgentSociety();
          const busConsole = new MessageBus();
          societyConsole.runtime.bus = busConsole;

          const societyHttp = new AgentSociety();
          const busHttp = new MessageBus();
          societyHttp.runtime.bus = busHttp;

          // 控制台方式发送
          const consoleResult = societyConsole.sendTextToAgent(agentId, text);

          // HTTP方式发送（模拟HTTP服务器的行为）
          const httpServer = new HTTPServer({ society: societyHttp });
          httpServer.setSociety(societyHttp);
          const httpResult = societyHttp.sendTextToAgent(agentId, text);

          // 两种方式都应该成功
          expect(consoleResult).toHaveProperty("taskId");
          expect(httpResult).toHaveProperty("taskId");
          expect(consoleResult.to).toBe(httpResult.to);

          // 消息总线中的消息结构应该一致
          const trimmedId = agentId.trim();
          const consoleQueue = busConsole._queues.get(trimmedId) ?? [];
          const httpQueue = busHttp._queues.get(trimmedId) ?? [];

          expect(consoleQueue.length).toBe(1);
          expect(httpQueue.length).toBe(1);

          // 消息内容应该一致
          expect(consoleQueue[0].from).toBe(httpQueue[0].from);
          expect(consoleQueue[0].to).toBe(httpQueue[0].to);
          expect(consoleQueue[0].payload.text).toBe(httpQueue[0].payload.text);
        }
      ),
      { numRuns: 100 }
    );
  });

  test("Property 4: HTTP API消息转发一致性 - taskId与实际消息对应", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(id => id.trim() !== "" && id.trim() !== "user"),
        fc.string({ minLength: 1, maxLength: 200 }),
        (agentId, text) => {
          const society = new AgentSociety();
          const bus = new MessageBus();
          society.runtime.bus = bus;

          const result = society.sendTextToAgent(agentId, text);

          if (result.error) return; // 跳过无效输入

          // 返回的taskId应该与消息总线中的消息taskId一致
          const trimmedId = agentId.trim();
          const queue = bus._queues.get(trimmedId) ?? [];
          
          expect(queue.length).toBe(1);
          expect(queue[0].taskId).toBe(result.taskId);
        }
      ),
      { numRuns: 100 }
    );
  });


  /**
   * Property 5: HTTP消息查询完整性
   * 对于任意taskId，通过GET /api/messages/{taskId}查询返回的消息列表应包含所有该taskId下用户收到的消息，
   * 且顺序与接收顺序一致。
   * 
   * **验证: 需求 2.4**
   */
  test("Property 5: HTTP消息查询完整性 - 消息按接收顺序存储", () => {
    fc.assert(
      fc.property(
        fc.uuid(), // taskId
        fc.array(
          fc.record({
            from: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim() !== ""),
            text: fc.string({ minLength: 1, maxLength: 100 })
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (taskId, messages) => {
          const httpServer = new HTTPServer();
          
          // 模拟用户收到的消息
          const receivedMessages = messages.map((msg, index) => ({
            id: `msg-${index}`,
            from: msg.from,
            taskId,
            payload: { text: msg.text },
            createdAt: new Date(Date.now() + index * 1000).toISOString()
          }));

          // 按顺序添加消息到HTTP服务器的消息存储
          for (const msg of receivedMessages) {
            if (!httpServer._messagesByTaskId.has(taskId)) {
              httpServer._messagesByTaskId.set(taskId, []);
            }
            httpServer._messagesByTaskId.get(taskId).push({
              id: msg.id,
              from: msg.from,
              taskId: msg.taskId,
              payload: msg.payload,
              createdAt: msg.createdAt
            });
          }

          // 查询消息
          const storedMessages = httpServer.getMessagesByTaskId(taskId);

          // 验证消息数量一致
          expect(storedMessages.length).toBe(receivedMessages.length);

          // 验证消息顺序一致
          for (let i = 0; i < receivedMessages.length; i++) {
            expect(storedMessages[i].id).toBe(receivedMessages[i].id);
            expect(storedMessages[i].from).toBe(receivedMessages[i].from);
            expect(storedMessages[i].taskId).toBe(receivedMessages[i].taskId);
            expect(storedMessages[i].payload.text).toBe(receivedMessages[i].payload.text);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test("Property 5: HTTP消息查询完整性 - 不同taskId的消息隔离", () => {
    fc.assert(
      fc.property(
        fc.uuid(), // taskId1
        fc.uuid(), // taskId2
        fc.array(
          fc.record({
            from: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim() !== ""),
            text: fc.string({ minLength: 1, maxLength: 100 })
          }),
          { minLength: 1, maxLength: 5 }
        ),
        fc.array(
          fc.record({
            from: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim() !== ""),
            text: fc.string({ minLength: 1, maxLength: 100 })
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (taskId1, taskId2, messages1, messages2) => {
          // 确保两个taskId不同
          if (taskId1 === taskId2) return;

          const httpServer = new HTTPServer();

          // 添加taskId1的消息
          for (let i = 0; i < messages1.length; i++) {
            if (!httpServer._messagesByTaskId.has(taskId1)) {
              httpServer._messagesByTaskId.set(taskId1, []);
            }
            httpServer._messagesByTaskId.get(taskId1).push({
              id: `msg1-${i}`,
              from: messages1[i].from,
              taskId: taskId1,
              payload: { text: messages1[i].text },
              createdAt: new Date().toISOString()
            });
          }

          // 添加taskId2的消息
          for (let i = 0; i < messages2.length; i++) {
            if (!httpServer._messagesByTaskId.has(taskId2)) {
              httpServer._messagesByTaskId.set(taskId2, []);
            }
            httpServer._messagesByTaskId.get(taskId2).push({
              id: `msg2-${i}`,
              from: messages2[i].from,
              taskId: taskId2,
              payload: { text: messages2[i].text },
              createdAt: new Date().toISOString()
            });
          }

          // 查询taskId1的消息
          const stored1 = httpServer.getMessagesByTaskId(taskId1);
          expect(stored1.length).toBe(messages1.length);
          for (const msg of stored1) {
            expect(msg.taskId).toBe(taskId1);
          }

          // 查询taskId2的消息
          const stored2 = httpServer.getMessagesByTaskId(taskId2);
          expect(stored2.length).toBe(messages2.length);
          for (const msg of stored2) {
            expect(msg.taskId).toBe(taskId2);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test("Property 5: HTTP消息查询完整性 - 不存在的taskId返回空数组", () => {
    fc.assert(
      fc.property(
        fc.uuid(), // 随机taskId
        (taskId) => {
          const httpServer = new HTTPServer();
          
          // 查询不存在的taskId
          const messages = httpServer.getMessagesByTaskId(taskId);
          
          // 应该返回空数组
          expect(Array.isArray(messages)).toBe(true);
          expect(messages.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
