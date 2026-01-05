/**
 * 会话上下文管理器
 * 负责管理智能体的会话上下文，包括压缩历史消息和检查上下文长度。
 * 支持基于 token 的上下文长度限制。
 */
export class ConversationManager {
  /**
   * @param {{maxContextMessages?:number, conversations?:Map, contextLimit?:{maxTokens:number, warningThreshold:number, criticalThreshold:number, hardLimitThreshold:number}, promptTemplates?:{contextStatus?:string, contextExceeded?:string, contextCritical?:string, contextWarning?:string}}} options
   */
  constructor(options = {}) {
    this.maxContextMessages = options.maxContextMessages ?? 50;
    this.conversations = options.conversations ?? new Map();
    
    // 上下文 token 限制配置
    this.contextLimit = options.contextLimit ?? {
      maxTokens: 128000,
      warningThreshold: 0.7,
      criticalThreshold: 0.9,
      hardLimitThreshold: 0.95
    };
    
    // 提示词模板（由外部加载后注入）
    this.promptTemplates = options.promptTemplates ?? {
      contextStatus: '【上下文状态】已使用 {{USED_TOKENS}}/{{MAX_TOKENS}} tokens ({{USAGE_PERCENT}}%)',
      contextExceeded: '⚠️ 严重警告：上下文已超过硬性限制({{HARD_LIMIT_THRESHOLD}}%)！必须立即采取行动：\n  1. 调用 compress_context 压缩历史\n  2. 或向上级请求拆分业务\n  3. 或创建子岗位分担工作\n  继续请求将导致调用失败！',
      contextCritical: '⚠️ 警告：上下文接近硬性限制({{CRITICAL_THRESHOLD}}%)，建议立即：\n  1. 调用 compress_context 压缩历史\n  2. 考虑拆分岗位或请求上级拆分业务',
      contextWarning: '提示：上下文使用率较高({{WARNING_THRESHOLD}}%)，请注意管理上下文长度。'
    };
    
    // 每个智能体的 token 使用统计（基于 LLM 返回的实际值）
    this._tokenUsage = new Map();
  }

  /**
   * 设置提示词模板。
   * @param {{contextStatus?:string, contextExceeded?:string, contextCritical?:string, contextWarning?:string}} templates
   */
  setPromptTemplates(templates) {
    this.promptTemplates = { ...this.promptTemplates, ...templates };
  }

  /**
   * 更新智能体的 token 使用统计（基于 LLM 返回的实际值）。
   * @param {string} agentId
   * @param {{promptTokens:number, completionTokens:number, totalTokens:number}} usage
   */
  updateTokenUsage(agentId, usage) {
    this._tokenUsage.set(agentId, {
      promptTokens: usage.promptTokens ?? 0,
      completionTokens: usage.completionTokens ?? 0,
      totalTokens: usage.totalTokens ?? 0,
      updatedAt: Date.now()
    });
  }

  /**
   * 获取智能体的 token 使用统计。
   * @param {string} agentId
   * @returns {{promptTokens:number, completionTokens:number, totalTokens:number, updatedAt:number}|null}
   */
  getTokenUsage(agentId) {
    return this._tokenUsage.get(agentId) ?? null;
  }

  /**
   * 获取智能体的上下文使用百分比。
   * @param {string} agentId
   * @returns {number} 0-1 之间的百分比，如果没有数据则返回 0
   */
  getContextUsagePercent(agentId) {
    const usage = this._tokenUsage.get(agentId);
    if (!usage || !usage.promptTokens) {
      return 0;
    }
    return usage.promptTokens / this.contextLimit.maxTokens;
  }

  /**
   * 获取智能体的上下文状态信息。
   * @param {string} agentId
   * @returns {{usedTokens:number, maxTokens:number, usagePercent:number, status:'normal'|'warning'|'critical'|'exceeded'}}
   */
  getContextStatus(agentId) {
    const usage = this._tokenUsage.get(agentId);
    const usedTokens = usage?.promptTokens ?? 0;
    const maxTokens = this.contextLimit.maxTokens;
    const usagePercent = usedTokens / maxTokens;
    
    let status = 'normal';
    if (usagePercent >= this.contextLimit.hardLimitThreshold) {
      status = 'exceeded';
    } else if (usagePercent >= this.contextLimit.criticalThreshold) {
      status = 'critical';
    } else if (usagePercent >= this.contextLimit.warningThreshold) {
      status = 'warning';
    }
    
    return {
      usedTokens,
      maxTokens,
      usagePercent,
      status
    };
  }

  /**
   * 检查智能体是否超过硬性上下文限制。
   * @param {string} agentId
   * @returns {boolean}
   */
  isContextExceeded(agentId) {
    const status = this.getContextStatus(agentId);
    return status.status === 'exceeded';
  }

  /**
   * 清除智能体的 token 使用统计。
   * @param {string} agentId
   */
  clearTokenUsage(agentId) {
    this._tokenUsage.delete(agentId);
  }

  /**
   * 获取或创建某个智能体的会话上下文。
   * @param {string} agentId
   * @param {string} systemPrompt
   * @returns {any[]}
   */
  ensureConversation(agentId, systemPrompt) {
    if (!this.conversations.has(agentId)) {
      this.conversations.set(agentId, [{ role: "system", content: systemPrompt }]);
    }
    return this.conversations.get(agentId);
  }

  /**
   * 获取智能体的会话上下文（如果存在）。
   * @param {string} agentId
   * @returns {any[]|undefined}
   */
  getConversation(agentId) {
    return this.conversations.get(agentId);
  }

  /**
   * 检查智能体是否有会话上下文。
   * @param {string} agentId
   * @returns {boolean}
   */
  hasConversation(agentId) {
    return this.conversations.has(agentId);
  }

  /**
   * 删除智能体的会话上下文。
   * @param {string} agentId
   * @returns {boolean}
   */
  deleteConversation(agentId) {
    return this.conversations.delete(agentId);
  }

  /**
   * 压缩会话上下文，保留系统提示词、摘要和最近的消息。
   * @param {string} agentId 智能体ID
   * @param {string} summary 对被压缩历史的重要内容摘要
   * @param {number} [keepRecentCount=10] 保留最近多少条消息
   * @returns {{ok:boolean, compressed?:boolean, originalCount?:number, newCount?:number, error?:string}}
   */
  compress(agentId, summary, keepRecentCount = 10) {
    const conv = this.conversations.get(agentId);
    
    if (!conv) {
      return { ok: false, error: "conversation_not_found" };
    }

    if (!summary || typeof summary !== "string") {
      return { ok: false, error: "invalid_summary" };
    }

    const originalCount = conv.length;

    // 如果消息数量不足以压缩，直接返回
    // 需要至少有：系统提示词(1) + 要保留的消息(keepRecentCount) + 至少1条要压缩的消息
    if (conv.length <= keepRecentCount + 1) {
      return { ok: true, compressed: false, originalCount, newCount: originalCount };
    }

    // 保留系统提示词（第一条消息）
    const systemPrompt = conv[0];
    
    // 保留最近的消息
    const recentMessages = conv.slice(-keepRecentCount);

    // 创建压缩后的上下文
    const compressed = [
      systemPrompt,
      { 
        role: "system", 
        content: `[历史摘要] ${summary}` 
      },
      ...recentMessages
    ];

    this.conversations.set(agentId, compressed);

    return { 
      ok: true, 
      compressed: true, 
      originalCount, 
      newCount: compressed.length 
    };
  }

  /**
   * 检查智能体的上下文是否超过限制，如果超过则返回警告信息。
   * @param {string} agentId
   * @returns {{warning:boolean, currentCount?:number, maxCount?:number}}
   */
  checkAndWarn(agentId) {
    const conv = this.conversations.get(agentId);
    
    if (!conv) {
      return { warning: false };
    }

    if (conv.length > this.maxContextMessages) {
      return {
        warning: true,
        currentCount: conv.length,
        maxCount: this.maxContextMessages
      };
    }

    return { warning: false };
  }

  /**
   * 获取智能体会话的当前消息数量。
   * @param {string} agentId
   * @returns {number}
   */
  getMessageCount(agentId) {
    const conv = this.conversations.get(agentId);
    return conv ? conv.length : 0;
  }

  /**
   * 生成上下文状态提示文本，用于注入到智能体的消息中。
   * @param {string} agentId
   * @returns {string} 上下文状态提示文本
   */
  buildContextStatusPrompt(agentId) {
    const status = this.getContextStatus(agentId);
    const percentStr = (status.usagePercent * 100).toFixed(1);
    
    // 使用模板生成基础状态提示
    let prompt = '\n\n' + this.promptTemplates.contextStatus
      .replace('{{USED_TOKENS}}', String(status.usedTokens))
      .replace('{{MAX_TOKENS}}', String(status.maxTokens))
      .replace('{{USAGE_PERCENT}}', percentStr);
    
    // 根据状态添加警告提示
    if (status.status === 'exceeded') {
      prompt += '\n' + this.promptTemplates.contextExceeded
        .replace('{{HARD_LIMIT_THRESHOLD}}', (this.contextLimit.hardLimitThreshold * 100).toFixed(0));
    } else if (status.status === 'critical') {
      prompt += '\n' + this.promptTemplates.contextCritical
        .replace('{{CRITICAL_THRESHOLD}}', (this.contextLimit.criticalThreshold * 100).toFixed(0));
    } else if (status.status === 'warning') {
      prompt += '\n' + this.promptTemplates.contextWarning
        .replace('{{WARNING_THRESHOLD}}', (this.contextLimit.warningThreshold * 100).toFixed(0));
    }
    
    return prompt;
  }
}
