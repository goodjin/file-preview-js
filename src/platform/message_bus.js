/**
 * 最小异步消息总线：按收件人队列缓存消息，运行时循环拉取并投递。
 */
import { randomUUID } from "node:crypto";
import { createNoopModuleLogger } from "./logger.js";

export class MessageBus {
  /**
   * @param {{logger?: {debug:(m:string,d?:any)=>Promise<void>, info:(m:string,d?:any)=>Promise<void>, warn:(m:string,d?:any)=>Promise<void>, error:(m:string,d?:any)=>Promise<void>}}} [options]
   */
  constructor(options = {}) {
    this._queues = new Map();
    this._waiters = new Set();
    this.log = options.logger ?? createNoopModuleLogger();
  }

  /**
   * 发送异步消息。
   * @param {{to:string, from:string, payload:any, taskId?:string}} message
   * @returns {string} message_id
   */
  send(message) {
    const id = randomUUID();
    const envelope = {
      id,
      createdAt: new Date().toISOString(),
      ...message
    };
    const q = this._queues.get(envelope.to) ?? [];
    const queueSizeBefore = q.length;
    q.push(envelope);
    this._queues.set(envelope.to, q);
    void this.log.info("发送消息", {
      agentId: envelope.from,
      id,
      to: envelope.to,
      from: envelope.from,
      taskId: envelope.taskId ?? null,
      payload: envelope.payload ?? null,
      queueSizeBefore,
      queueSizeAfter: q.length
    });
    for (const w of this._waiters) w();
    this._waiters.clear();
    return id;
  }

  /**
   * 取出某个收件人的下一条消息（FIFO）。
   * @param {string} agentId
   * @returns {any|null} message
   */
  receiveNext(agentId) {
    const q = this._queues.get(agentId);
    if (!q || q.length === 0) return null;
    const queueSizeBefore = q.length;
    const msg = q.shift();
    void this.log.info("接收消息", {
      agentId,
      to: agentId,
      id: msg?.id ?? null,
      from: msg?.from ?? null,
      taskId: msg?.taskId ?? null,
      payload: msg?.payload ?? null,
      queueSizeBefore,
      queueSizeAfter: q.length
    });
    return msg;
  }

  /**
   * 是否存在待投递消息。
   * @returns {boolean}
   */
  hasPending() {
    for (const q of this._queues.values()) {
      if (q.length > 0) return true;
    }
    return false;
  }

  /**
   * 获取指定智能体的队列深度。
   * @param {string} agentId
   * @returns {number}
   */
  getQueueDepth(agentId) {
    const q = this._queues.get(agentId);
    return q ? q.length : 0;
  }

  /**
   * 清空指定智能体的消息队列。
   * @param {string} agentId
   * @returns {any[]} 被清空的消息列表
   */
  clearQueue(agentId) {
    const q = this._queues.get(agentId);
    if (!q || q.length === 0) return [];
    const messages = [...q];
    q.length = 0;
    void this.log.info("清空消息队列", { agentId, clearedCount: messages.length });
    return messages;
  }

  /**
   * 等待直到有新消息入队（或超时）。
   * @param {{timeoutMs?:number}} [options]
   * @returns {Promise<boolean>} resolved=true 表示收到新消息，false 表示超时
   */
  async waitForMessage(options = {}) {
    if (this.hasPending()) return true;
    const timeoutMs = typeof options.timeoutMs === "number" ? options.timeoutMs : 0;
    return await new Promise((resolve) => {
      let done = false;
      const wake = () => {
        if (done) return;
        done = true;
        this._waiters.delete(wake);
        resolve(true);
      };
      this._waiters.add(wake);

      if (timeoutMs > 0) {
        const timer = setTimeout(() => {
          if (done) return;
          done = true;
          this._waiters.delete(wake);
          resolve(false);
        }, timeoutMs);
        if (timer && typeof timer.unref === "function") timer.unref();
      }
    });
  }

  /**
   * 获取所有待处理消息的总数。
   * @returns {number}
   */
  getPendingCount() {
    let count = 0;
    for (const q of this._queues.values()) {
      count += q.length;
    }
    return count;
  }
}
