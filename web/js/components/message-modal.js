/**
 * 消息详情弹窗组件
 * 显示消息的完整技术数据
 */

const MessageModal = {
  // DOM 元素引用
  overlay: null,
  content: null,
  body: null,

  /**
   * 初始化组件
   */
  init() {
    this.overlay = document.getElementById('message-modal');
    this.content = this.overlay?.querySelector('.modal-content');
    this.body = document.getElementById('modal-body');

    // 点击遮罩层关闭
    if (this.overlay) {
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) {
          this.hide();
        }
      });
    }

    // 关闭按钮
    const closeBtn = this.overlay?.querySelector('.modal-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }

    // ESC 键关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.overlay?.classList.contains('hidden')) {
        this.hide();
      }
    });
  },

  /**
   * 显示消息详情
   * @param {string} messageId - 消息 ID
   */
  show(messageId) {
    // 从 ChatPanel 获取消息
    const message = ChatPanel.messagesById.get(messageId);
    if (!message) {
      Toast.show('消息不存在', 'error');
      return;
    }

    this.renderContent(message);
    
    if (this.overlay) {
      this.overlay.classList.remove('hidden');
    }
  },

  /**
   * 隐藏弹窗
   */
  hide() {
    if (this.overlay) {
      this.overlay.classList.add('hidden');
    }
  },

  /**
   * 渲染弹窗内容
   * @param {object} message - 消息对象
   */
  renderContent(message) {
    if (!this.body) return;

    const html = `
      <div class="detail-item">
        <div class="detail-label">消息 ID</div>
        <div class="detail-value">${this.escapeHtml(message.id)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">发送者</div>
        <div class="detail-value">${this.escapeHtml(message.from)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">接收者</div>
        <div class="detail-value">${this.escapeHtml(message.to)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">任务 ID</div>
        <div class="detail-value">${this.escapeHtml(message.taskId || '无')}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">创建时间</div>
        <div class="detail-value">${this.formatTime(message.createdAt)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">消息内容 (Payload)</div>
        <div class="json-viewer">${this.formatJson(message.payload)}</div>
      </div>
    `;

    this.body.innerHTML = html;
  },

  /**
   * 格式化时间
   * @param {string} isoTime - ISO 格式时间
   * @returns {string} 格式化后的时间
   */
  formatTime(isoTime) {
    if (!isoTime) return '未知';
    const date = new Date(isoTime);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  },

  /**
   * 格式化 JSON 并添加语法高亮
   * @param {any} data - 数据对象
   * @returns {string} 带高亮的 HTML
   */
  formatJson(data) {
    if (data === null || data === undefined) {
      return '<span class="json-null">null</span>';
    }

    try {
      const jsonStr = JSON.stringify(data, null, 2);
      return this.highlightJson(jsonStr);
    } catch (e) {
      return this.escapeHtml(String(data));
    }
  },

  /**
   * JSON 语法高亮
   * @param {string} json - JSON 字符串
   * @returns {string} 带高亮的 HTML
   */
  highlightJson(json) {
    // 转义 HTML
    let escaped = this.escapeHtml(json);
    
    // 高亮字符串（包括键名）
    escaped = escaped.replace(/"([^"\\]|\\.)*"/g, (match) => {
      // 检查是否是键名（后面跟着冒号）
      return `<span class="json-string">${match}</span>`;
    });
    
    // 高亮数字
    escaped = escaped.replace(/\b(-?\d+\.?\d*)\b/g, '<span class="json-number">$1</span>');
    
    // 高亮布尔值
    escaped = escaped.replace(/\b(true|false)\b/g, '<span class="json-boolean">$1</span>');
    
    // 高亮 null
    escaped = escaped.replace(/\bnull\b/g, '<span class="json-null">null</span>');
    
    return escaped;
  },

  /**
   * HTML 转义
   * @param {string} text - 原始文本
   * @returns {string} 转义后的文本
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
};

// 导出供其他模块使用
window.MessageModal = MessageModal;
