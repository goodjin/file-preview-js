import OpenAI from "openai";
import { createNoopModuleLogger } from "./logger.js";

/**
 * 最小 LLM 客户端：使用 OpenAI SDK 调用本地 LMStudio 的 OpenAI 兼容接口。
 */
export class LlmClient {
  /**
   * @param {{baseURL:string, model:string, apiKey:string, maxRetries?:number, logger?: {debug:(m:string,d?:any)=>Promise<void>, info:(m:string,d?:any)=>Promise<void>, warn:(m:string,d?:any)=>Promise<void>, error:(m:string,d?:any)=>Promise<void>}} options
   */
  constructor(options) {
    this.baseURL = options.baseURL;
    this.model = options.model;
    this.apiKey = options.apiKey;
    this.maxRetries = options.maxRetries ?? 3;
    this.log = options.logger ?? createNoopModuleLogger();
    this._client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseURL
    });
  }

  /**
   * 调用聊天补全（支持工具调用）。
   * @param {{messages:any[], tools?:any[], temperature?:number, meta?:any}} input
   * @returns {Promise<any>} message
   */
  async chat(input) {
    return await this._chatWithRetry(input, this.maxRetries);
  }

  /**
   * 带重试的聊天补全调用（指数退避策略）。
   * @param {{messages:any[], tools?:any[], temperature?:number, meta?:any}} input
   * @param {number} maxRetries 最大重试次数
   * @returns {Promise<any>} message
   */
  async _chatWithRetry(input, maxRetries) {
    const meta = input?.meta ?? null;
    const currentMessage = Array.isArray(input?.messages) && input.messages.length > 0 ? input.messages[input.messages.length - 1] : null;
    const payload = {
      model: this.model,
      messages: input.messages,
      tools: input.tools,
      tool_choice: input.tools && input.tools.length > 0 ? "auto" : undefined,
      temperature: typeof input.temperature === "number" ? input.temperature : 0.2
    };
    await this.log.info("LLM 请求内容", {
      meta,
      payload: {
        model: payload.model,
        tool_choice: payload.tool_choice,
        temperature: payload.temperature,
        tool_names: Array.isArray(payload.tools) ? payload.tools.map((t) => t?.function?.name).filter(Boolean) : [],
        current_message: currentMessage
      }
    });

    let lastError = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const startTime = Date.now();
      try {
        const resp = await this._client.chat.completions.create(payload);
        const latencyMs = Date.now() - startTime;
        const msg = resp.choices?.[0]?.message ?? null;
        
        // 提取token使用信息
        const usage = resp.usage ?? {};
        const promptTokens = usage.prompt_tokens ?? undefined;
        const completionTokens = usage.completion_tokens ?? undefined;
        const totalTokens = usage.total_tokens ?? undefined;
        
        await this.log.info("LLM 响应内容", { meta, message: msg });
        
        // 记录LLM调用指标
        await this.log.logLlmMetrics({
          latencyMs,
          promptTokens,
          completionTokens,
          totalTokens,
          success: true,
          model: this.model
        }, meta);
        
        // 将 token 使用信息附加到消息对象上，供调用者使用
        if (msg) {
          msg._usage = {
            promptTokens: promptTokens ?? 0,
            completionTokens: completionTokens ?? 0,
            totalTokens: totalTokens ?? 0
          };
        }
        
        return msg;
      } catch (err) {
        const latencyMs = Date.now() - startTime;
        lastError = err;
        const text = err && typeof err.message === "string" ? err.message : String(err ?? "unknown error");
        
        // 记录失败的LLM调用指标
        await this.log.logLlmMetrics({
          latencyMs,
          success: false,
          model: this.model
        }, meta);
        
        // 如果是最后一次尝试，不再重试
        if (attempt >= maxRetries - 1) {
          void this.log.error("LLM 请求失败（已达最大重试次数）", { 
            meta, 
            message: text, 
            attempt: attempt + 1, 
            maxRetries 
          });
          throw err;
        }

        // 计算指数退避延迟：2^n 秒（n 为重试次数，从0开始）
        const delayMs = Math.pow(2, attempt) * 1000;
        void this.log.warn("LLM 调用失败，重试中", { 
          meta,
          message: text,
          attempt: attempt + 1, 
          maxRetries, 
          delayMs 
        });
        
        await this._sleep(delayMs);
      }
    }

    // 理论上不会到达这里，但为了类型安全
    throw lastError;
  }

  /**
   * 延迟指定毫秒数。
   * @param {number} ms
   * @returns {Promise<void>}
   */
  async _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
