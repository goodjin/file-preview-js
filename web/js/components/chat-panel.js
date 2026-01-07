/**
 * 对话面板组件
 * 显示与选中智能体的对话消息，支持发送消息
 */

const ChatPanel = {
  // 组件状态
  currentAgentId: null,  // 当前智能体 ID
  currentAgent: null,    // 当前智能体对象
  messages: [],          // 消息列表
  messagesById: new Map(), // 消息 ID 索引

  // DOM 元素引用
  headerTitle: null,
  headerRole: null,
  headerStatus: null,
  messageList: null,
  chatInput: null,
  sendBtn: null,

  /**
   * 初始化组件
   */
  init() {
    this.headerTitle = document.querySelector('.chat-title .agent-name');
    this.headerRole = document.querySelector('.chat-title .agent-role');
    this.headerStatus = document.querySelector('.chat-status');
    this.messageList = document.getElementById('message-list');
    this.chatInput = document.getElementById('chat-input');
    this.sendBtn = document.getElementById('send-btn');

    // 绑定发送按钮事件
    if (this.sendBtn) {
      this.sendBtn.addEventListener('click', () => this.sendMessage());
    }

    // 绑定输入框回车事件
    if (this.chatInput) {
      this.chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }
  },

  /**
   * 设置当前智能体
   * @param {object} agent - 智能体对象
   */
  setAgent(agent) {
    this.currentAgent = agent;
    this.currentAgentId = agent ? agent.id : null;
    this.updateHeader();
  },

  /**
   * 更新头部信息
   */
  updateHeader() {
    if (this.headerTitle) {
      this.headerTitle.textContent = this.currentAgent ? this.currentAgent.id : '选择一个智能体';
    }
    if (this.headerRole) {
      this.headerRole.textContent = this.currentAgent ? (this.currentAgent.roleName || '') : '';
      this.headerRole.style.display = this.currentAgent?.roleName ? 'inline-block' : 'none';
    }
    if (this.headerStatus) {
      if (this.currentAgent?.status === 'terminated') {
        this.headerStatus.textContent = '已终止';
        this.headerStatus.style.color = '#f44336';
      } else {
        this.headerStatus.textContent = '';
      }
    }
  },

  /**
   * 设置消息列表
   * @param {Array} messages - 消息数组
   */
  setMessages(messages) {
    this.messages = messages || [];
    this.messagesById.clear();
    this.messages.forEach(msg => {
      this.messagesById.set(msg.id, msg);
    });
    this.render();
    this.scrollToBottom();
  },

  /**
   * 追加新消息
   * @param {object} message - 消息对象
   */
  appendMessage(message) {
    // 避免重复添加
    if (this.messagesById.has(message.id)) {
      return;
    }
    this.messages.push(message);
    this.messagesById.set(message.id, message);
    this.render();
    this.scrollToBottom();
  },

  /**
   * 判断消息是否为当前智能体发送
   * @param {object} message - 消息对象
   * @returns {boolean}
   */
  isSentMessage(message) {
    return message.from === this.currentAgentId;
  },

  /**
   * 格式化消息时间
   * @param {string} isoTime - ISO 格式时间
   * @returns {string} 格式化后的时间
   */
  formatMessageTime(isoTime) {
    if (!isoTime) return '';
    const date = new Date(isoTime);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  },

  /**
   * 获取消息内容文本
   * @param {object} message - 消息对象
   * @returns {string} 消息文本
   */
  getMessageText(message) {
    if (!message.payload) return '[空消息]';
    
    // 尝试获取消息内容
    if (typeof message.payload === 'string') {
      return message.payload;
    }
    if (message.payload.message) {
      return message.payload.message;
    }
    if (message.payload.content) {
      return message.payload.content;
    }
    if (message.payload.text) {
      return message.payload.text;
    }
    
    // 如果是对象，显示简短摘要
    return '[复杂消息 - 点击查看详情]';
  },

  /**
   * 获取发送者显示名称
   * @param {object} message - 消息对象
   * @returns {string} 发送者名称
   */
  getSenderName(message) {
    return message.from || '未知';
  },

  /**
   * 渲染消息列表
   */
  render() {
    if (!this.messageList) return;

    if (!this.currentAgentId) {
      this.messageList.innerHTML = `
        <div class="empty-state">请从左侧选择一个智能体查看对话</div>
      `;
      return;
    }

    if (this.messages.length === 0) {
      this.messageList.innerHTML = `
        <div class="empty-state">暂无消息</div>
      `;
      return;
    }

    const html = this.messages.map(message => {
      const isSent = this.isSentMessage(message);
      const messageClass = isSent ? 'sent' : 'received';
      const senderName = this.getSenderName(message);
      const messageText = this.getMessageText(message);
      const time = this.formatMessageTime(message.createdAt);

      return `
        <div class="message-item ${messageClass}" data-message-id="${message.id}">
          <div class="message-avatar">${senderName.charAt(0).toUpperCase()}</div>
          <div class="message-content">
            <div class="message-header">
              <a class="message-sender" href="#" onclick="ChatPanel.navigateToSender('${message.from}', '${message.id}'); return false;">
                ${this.escapeHtml(senderName)}
              </a>
              <span class="message-time">${time}</span>
            </div>
            <div class="message-bubble">${this.escapeHtml(messageText)}</div>
            <button class="message-detail-btn" onclick="MessageModal.show('${message.id}')">
              详情
            </button>
          </div>
        </div>
      `;
    }).join('');

    this.messageList.innerHTML = html;
  },

  /**
   * 导航到发送者的聊天界面并滚动到消息位置
   * @param {string} senderId - 发送者 ID
   * @param {string} messageId - 消息 ID
   */
  navigateToSender(senderId, messageId) {
    // 如果发送者就是当前智能体，只需滚动到消息
    if (senderId === this.currentAgentId) {
      this.scrollToMessage(messageId);
      return;
    }

    // 切换到发送者的聊天界面
    if (window.App && window.App.selectAgentAndScrollToMessage) {
      window.App.selectAgentAndScrollToMessage(senderId, messageId);
    } else if (window.AgentList) {
      // 备用方案：先选择智能体，然后滚动
      window.AgentList.selectAgent(senderId);
      // 延迟滚动，等待消息加载
      setTimeout(() => {
        this.scrollToMessage(messageId);
      }, 300);
    }
  },

  /**
   * 滚动到指定消息
   * @param {string} messageId - 消息 ID
   */
  scrollToMessage(messageId) {
    if (!this.messageList) return;
    
    const messageEl = this.messageList.querySelector(`[data-message-id="${messageId}"]`);
    if (messageEl) {
      messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // 高亮效果
      messageEl.style.backgroundColor = '#fff3cd';
      setTimeout(() => {
        messageEl.style.backgroundColor = '';
      }, 2000);
    }
  },

  /**
   * 滚动到底部
   */
  scrollToBottom() {
    if (this.messageList) {
      this.messageList.scrollTop = this.messageList.scrollHeight;
    }
  },

  /**
   * 发送消息
   */
  async sendMessage() {
    if (!this.chatInput || !this.currentAgentId) return;

    const text = this.chatInput.value.trim();
    if (!text) return;

    // 禁用发送按钮
    if (this.sendBtn) {
      this.sendBtn.disabled = true;
    }

    try {
      await API.sendMessage(this.currentAgentId, text);
      // 清空输入框
      this.chatInput.value = '';
      // 显示成功提示
      Toast.show('消息已发送', 'success');
    } catch (error) {
      console.error('发送消息失败:', error);
      Toast.show('发送失败: ' + error.message, 'error');
    } finally {
      // 恢复发送按钮
      if (this.sendBtn) {
        this.sendBtn.disabled = false;
      }
    }
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
window.ChatPanel = ChatPanel;
