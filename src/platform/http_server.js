import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { createNoopModuleLogger } from "./logger.js";

/**
 * HTTP服务器组件：提供REST API接口与Agent Society交互。
 * 
 * 端点：
 * - POST /api/submit - 提交需求给根智能体
 * - POST /api/send - 发送消息到指定智能体
 * - GET /api/messages/:taskId - 查询任务消息
 * - GET /api/agents - 列出活跃智能体
 */
export class HTTPServer {
  /**
   * @param {{port?:number, society?:any, logger?:any}} options
   */
  constructor(options = {}) {
    this.port = options.port ?? 3000;
    this.society = options.society ?? null;
    this.log = options.logger ?? createNoopModuleLogger();
    this._server = null;
    this._messagesByTaskId = new Map(); // taskId -> messages[]
    this._isRunning = false;
  }

  /**
   * 设置关联的AgentSociety实例。
   * @param {any} society
   */
  setSociety(society) {
    this.society = society;
    // 注册消息监听器，收集用户收到的消息
    if (society) {
      society.onUserMessage((message) => {
        const taskId = message?.taskId;
        if (taskId) {
          if (!this._messagesByTaskId.has(taskId)) {
            this._messagesByTaskId.set(taskId, []);
          }
          this._messagesByTaskId.get(taskId).push({
            id: message.id,
            from: message.from,
            taskId: message.taskId,
            payload: message.payload,
            createdAt: message.createdAt
          });
        }
      });
    }
  }

  /**
   * 启动HTTP服务器。
   * @returns {Promise<{ok:boolean, port?:number, error?:string}>}
   */
  async start() {
    if (this._isRunning) {
      return { ok: true, port: this.port };
    }

    return new Promise((resolve) => {
      try {
        this._server = createServer((req, res) => {
          this._handleRequest(req, res);
        });

        this._server.on("error", (err) => {
          const message = err && typeof err.message === "string" ? err.message : String(err);
          void this.log.error("HTTP服务器错误", { error: message });
          resolve({ ok: false, error: message });
        });

        this._server.listen(this.port, () => {
          this._isRunning = true;
          void this.log.info("HTTP服务器启动", { port: this.port });
          resolve({ ok: true, port: this.port });
        });
      } catch (err) {
        const message = err && typeof err.message === "string" ? err.message : String(err);
        void this.log.error("HTTP服务器启动失败", { error: message });
        resolve({ ok: false, error: message });
      }
    });
  }


  /**
   * 停止HTTP服务器。
   * @returns {Promise<{ok:boolean}>}
   */
  async stop() {
    if (!this._server || !this._isRunning) {
      return { ok: true };
    }

    return new Promise((resolve) => {
      this._server.close((err) => {
        this._isRunning = false;
        if (err) {
          const message = err && typeof err.message === "string" ? err.message : String(err);
          void this.log.error("HTTP服务器关闭错误", { error: message });
          resolve({ ok: false, error: message });
        } else {
          void this.log.info("HTTP服务器已关闭");
          resolve({ ok: true });
        }
      });
    });
  }

  /**
   * 检查服务器是否正在运行。
   * @returns {boolean}
   */
  isRunning() {
    return this._isRunning;
  }

  /**
   * 处理HTTP请求。
   * @param {import("node:http").IncomingMessage} req
   * @param {import("node:http").ServerResponse} res
   */
  _handleRequest(req, res) {
    const url = new URL(req.url ?? "/", `http://localhost:${this.port}`);
    const method = req.method?.toUpperCase() ?? "GET";
    const pathname = url.pathname;

    void this.log.debug("收到HTTP请求", { method, pathname });

    // 设置CORS头
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // 路由分发
    if (method === "POST" && pathname === "/api/submit") {
      this._handleSubmit(req, res);
    } else if (method === "POST" && pathname === "/api/send") {
      this._handleSend(req, res);
    } else if (method === "GET" && pathname.startsWith("/api/messages/")) {
      const taskId = pathname.slice("/api/messages/".length);
      this._handleGetMessages(taskId, res);
    } else if (method === "GET" && pathname === "/api/agents") {
      this._handleGetAgents(res);
    } else {
      this._sendJson(res, 404, { error: "not_found", path: pathname });
    }
  }

  /**
   * 处理 POST /api/submit - 提交需求给根智能体。
   * @param {import("node:http").IncomingMessage} req
   * @param {import("node:http").ServerResponse} res
   */
  _handleSubmit(req, res) {
    this._readJsonBody(req, (err, body) => {
      if (err) {
        this._sendJson(res, 400, { error: "invalid_json", message: err.message });
        return;
      }

      const text = body?.text;
      if (!text || typeof text !== "string") {
        this._sendJson(res, 400, { error: "missing_text", message: "请求体必须包含text字段" });
        return;
      }

      if (!this.society) {
        this._sendJson(res, 500, { error: "society_not_initialized" });
        return;
      }

      // 调用User_Endpoint将需求转发给根智能体
      const result = this.society.sendTextToAgent("root", text);
      
      if (result.error) {
        this._sendJson(res, 400, { error: result.error });
        return;
      }

      void this.log.info("HTTP提交需求", { taskId: result.taskId });
      this._sendJson(res, 200, { taskId: result.taskId });
    });
  }


  /**
   * 处理 POST /api/send - 发送消息到指定智能体。
   * @param {import("node:http").IncomingMessage} req
   * @param {import("node:http").ServerResponse} res
   */
  _handleSend(req, res) {
    this._readJsonBody(req, (err, body) => {
      if (err) {
        this._sendJson(res, 400, { error: "invalid_json", message: err.message });
        return;
      }

      const agentId = body?.agentId;
      const text = body?.text;
      const taskId = body?.taskId;

      if (!agentId || typeof agentId !== "string") {
        this._sendJson(res, 400, { error: "missing_agent_id", message: "请求体必须包含agentId字段" });
        return;
      }

      if (!text || typeof text !== "string") {
        this._sendJson(res, 400, { error: "missing_text", message: "请求体必须包含text字段" });
        return;
      }

      if (!this.society) {
        this._sendJson(res, 500, { error: "society_not_initialized" });
        return;
      }

      // 调用User_Endpoint将消息发送到指定智能体
      const options = taskId ? { taskId } : {};
      const result = this.society.sendTextToAgent(agentId, text, options);

      if (result.error) {
        this._sendJson(res, 400, { error: result.error });
        return;
      }

      void this.log.info("HTTP发送消息", { agentId, taskId: result.taskId });
      this._sendJson(res, 200, { 
        messageId: randomUUID(), // 生成消息ID用于追踪
        taskId: result.taskId,
        to: result.to
      });
    });
  }

  /**
   * 处理 GET /api/messages/:taskId - 查询任务消息。
   * @param {string} taskId
   * @param {import("node:http").ServerResponse} res
   */
  _handleGetMessages(taskId, res) {
    if (!taskId || taskId.trim() === "") {
      this._sendJson(res, 400, { error: "missing_task_id" });
      return;
    }

    const messages = this._messagesByTaskId.get(taskId) ?? [];
    
    void this.log.debug("HTTP查询消息", { taskId, count: messages.length });
    this._sendJson(res, 200, { 
      taskId,
      messages,
      count: messages.length
    });
  }

  /**
   * 处理 GET /api/agents - 列出活跃智能体。
   * @param {import("node:http").ServerResponse} res
   */
  _handleGetAgents(res) {
    if (!this.society || !this.society.runtime) {
      this._sendJson(res, 500, { error: "society_not_initialized" });
      return;
    }

    const agents = this.society.runtime.listAgentInstances();
    
    void this.log.debug("HTTP查询智能体列表", { count: agents.length });
    this._sendJson(res, 200, { 
      agents,
      count: agents.length
    });
  }

  /**
   * 读取请求体JSON。
   * @param {import("node:http").IncomingMessage} req
   * @param {(err:Error|null, body?:any)=>void} callback
   */
  _readJsonBody(req, callback) {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        const parsed = JSON.parse(body);
        callback(null, parsed);
      } catch (err) {
        callback(err);
      }
    });
    req.on("error", (err) => {
      callback(err);
    });
  }

  /**
   * 发送JSON响应。
   * @param {import("node:http").ServerResponse} res
   * @param {number} statusCode
   * @param {any} data
   */
  _sendJson(res, statusCode, data) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.writeHead(statusCode);
    res.end(JSON.stringify(data));
  }

  /**
   * 获取指定taskId的消息列表（用于测试）。
   * @param {string} taskId
   * @returns {any[]}
   */
  getMessagesByTaskId(taskId) {
    return this._messagesByTaskId.get(taskId) ?? [];
  }

  /**
   * 清除所有消息记录（用于测试）。
   */
  clearMessages() {
    this._messagesByTaskId.clear();
  }
}
