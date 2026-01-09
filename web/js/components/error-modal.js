/**
 * 错误弹窗组件
 * 显示持久的错误信息，支持复制内容和手动关闭
 */

const ErrorModal = {
  // DOM 元素引用
  overlay: null,
  content: null,
  closeBtn: null,
  copyBtn: null,
  errorTitle: null,
  errorMessage: null,
  errorDetails: null,
  
  // 当前错误信息
  currentError: null,

  /**
   * 初始化组件
   */
  init() {
    this._createModal();
    this._bindEvents();
  },

  /**
   * 创建弹窗 DOM 结构
   */
  _createModal() {
    // 创建弹窗覆盖层
    this.overlay = document.createElement('div');
    this.overlay.id = 'error-modal';
    this.overlay.className = 'error-modal-overlay hidden';
    
    this.overlay.innerHTML = `
      <div class="error-modal-content">
        <div class="error-modal-header">
          <div class="error-modal-icon">⚠️</div>
          <h3 class="error-modal-title">发生错误</h3>
          <button class="error-modal-close-btn" title="关闭">&times;</button>
        </div>
        <div class="error-modal-body">
          <div class="error-modal-message"></div>
          <div class="error-modal-details-section">
            <div class="error-modal-details-header">
              <span>详细信息</span>
              <button class="error-modal-copy-btn" title="复制错误信息">📋 复制</button>
            </div>
            <pre class="error-modal-details"></pre>
          </div>
        </div>
        <div class="error-modal-footer">
          <span class="error-modal-timestamp"></span>
          <button class="error-modal-confirm-btn">我知道了</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.overlay);
    
    // 获取元素引用
    this.content = this.overlay.querySelector('.error-modal-content');
    this.closeBtn = this.overlay.querySelector('.error-modal-close-btn');
    this.copyBtn = this.overlay.querySelector('.error-modal-copy-btn');
    this.confirmBtn = this.overlay.querySelector('.error-modal-confirm-btn');
    this.errorTitle = this.overlay.querySelector('.error-modal-title');
    this.errorMessage = this.overlay.querySelector('.error-modal-message');
    this.errorDetails = this.overlay.querySelector('.error-modal-details');
    this.errorTimestamp = this.overlay.querySelector('.error-modal-timestamp');
  },

  /**
   * 绑定事件
   */
  _bindEvents() {
    // 关闭按钮
    this.closeBtn.addEventListener('click', () => this.hide());
    this.confirmBtn.addEventListener('click', () => this.hide());
    
    // 点击覆盖层关闭（可选）
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });
    
    // ESC 键关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.overlay.classList.contains('hidden')) {
        this.hide();
      }
    });
    
    // 复制按钮
    this.copyBtn.addEventListener('click', () => this._copyErrorInfo());
  },

  /**
   * 显示错误弹窗
   * @param {object} error - 错误信息对象
   * @param {string} error.title - 错误标题（可选）
   * @param {string} error.message - 错误消息
   * @param {string} error.errorType - 错误类型
   * @param {string} error.agentId - 相关智能体ID（可选）
   * @param {string} error.originalError - 原始错误信息（可选）
   * @param {string} error.timestamp - 时间戳（可选）
   * @param {object} error.details - 其他详细信息（可选）
   */
  show(error) {
    if (!error) return;
    
    this.currentError = error;
    
    // 设置标题
    const title = error.title || this._getErrorTitle(error.errorType);
    this.errorTitle.textContent = title;
    
    // 设置消息
    this.errorMessage.textContent = error.message || '发生未知错误';
    
    // 设置详细信息
    const details = this._formatErrorDetails(error);
    this.errorDetails.textContent = details;
    
    // 设置时间戳
    const timestamp = error.timestamp ? new Date(error.timestamp).toLocaleString('zh-CN') : new Date().toLocaleString('zh-CN');
    this.errorTimestamp.textContent = timestamp;
    
    // 显示弹窗
    this.overlay.classList.remove('hidden');
    
    // 聚焦到确认按钮
    this.confirmBtn.focus();
  },

  /**
   * 隐藏错误弹窗
   */
  hide() {
    this.overlay.classList.add('hidden');
    this.currentError = null;
  },

  /**
   * 根据错误类型获取标题
   * @param {string} errorType - 错误类型
   * @returns {string} 错误标题
   */
  _getErrorTitle(errorType) {
    const titles = {
      'llm_call_failed': 'LLM 调用失败',
      'llm_call_aborted': 'LLM 调用已中断',
      'context_limit_exceeded': '上下文超出限制',
      'max_tool_rounds_exceeded': '工具调用次数超限',
      'agent_message_processing_failed': '智能体处理异常',
      'network_error': '网络错误',
      'api_error': 'API 错误'
    };
    return titles[errorType] || '发生错误';
  },

  /**
   * 格式化错误详细信息
   * @param {object} error - 错误对象
   * @returns {string} 格式化后的详细信息
   */
  _formatErrorDetails(error) {
    const lines = [];
    
    if (error.errorType) {
      lines.push(`错误类型: ${error.errorType}`);
    }
    if (error.agentId) {
      lines.push(`智能体ID: ${error.agentId}`);
    }
    if (error.originalError) {
      lines.push(`原始错误: ${error.originalError}`);
    }
    if (error.errorName) {
      lines.push(`错误名称: ${error.errorName}`);
    }
    if (error.taskId) {
      lines.push(`任务ID: ${error.taskId}`);
    }
    if (error.originalMessageId) {
      lines.push(`消息ID: ${error.originalMessageId}`);
    }
    
    // 添加其他详细信息
    const excludeKeys = ['title', 'message', 'errorType', 'agentId', 'originalError', 'errorName', 'taskId', 'originalMessageId', 'timestamp', 'kind'];
    for (const [key, value] of Object.entries(error)) {
      if (!excludeKeys.includes(key) && value !== undefined && value !== null) {
        if (typeof value === 'object') {
          lines.push(`${key}: ${JSON.stringify(value, null, 2)}`);
        } else {
          lines.push(`${key}: ${value}`);
        }
      }
    }
    
    return lines.join('\n');
  },

  /**
   * 复制错误信息到剪贴板
   */
  async _copyErrorInfo() {
    if (!this.currentError) return;
    
    const copyText = [
      `错误: ${this.errorTitle.textContent}`,
      `消息: ${this.errorMessage.textContent}`,
      `时间: ${this.errorTimestamp.textContent}`,
      '',
      '详细信息:',
      this.errorDetails.textContent
    ].join('\n');
    
    try {
      await navigator.clipboard.writeText(copyText);
      
      // 显示复制成功提示
      const originalText = this.copyBtn.textContent;
      this.copyBtn.textContent = '✓ 已复制';
      this.copyBtn.classList.add('copied');
      
      setTimeout(() => {
        this.copyBtn.textContent = originalText;
        this.copyBtn.classList.remove('copied');
      }, 2000);
    } catch (err) {
      console.error('复制失败:', err);
      // 降级方案：选中文本
      const range = document.createRange();
      range.selectNodeContents(this.errorDetails);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      
      Toast.warning('自动复制失败，请手动复制选中的文本');
    }
  },

  /**
   * 从消息 payload 中检测并显示错误
   * @param {object} message - 消息对象
   * @returns {boolean} 是否显示了错误弹窗
   */
  checkAndShowError(message) {
    if (!message || !message.payload) return false;
    
    const payload = message.payload;
    
    // 检查是否是错误消息
    if (payload.kind === 'error') {
      this.show({
        title: this._getErrorTitle(payload.errorType),
        message: payload.message,
        errorType: payload.errorType,
        agentId: payload.agentId,
        originalError: payload.originalError,
        errorName: payload.errorName,
        taskId: payload.taskId || message.taskId,
        originalMessageId: payload.originalMessageId,
        timestamp: payload.timestamp || message.createdAt,
        ...payload
      });
      return true;
    }
    
    return false;
  }
};

// 导出供其他模块使用
window.ErrorModal = ErrorModal;
