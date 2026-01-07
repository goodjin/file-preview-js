/**
 * 主应用模块
 * 管理全局状态、路由、定时轮询
 */

const App = {
  // 应用状态
  currentView: 'list',      // 当前视图 ('list' 或 'overview')
  selectedAgentId: null,    // 当前选中的智能体 ID
  agents: [],               // 所有智能体
  agentsById: new Map(),    // 智能体 ID 索引
  roles: [],                // 所有岗位
  pollInterval: 2000,       // 轮询间隔（毫秒）
  pollTimer: null,          // 轮询定时器
  lastMessageCounts: new Map(), // 上次各智能体的消息数量

  /**
   * 初始化应用
   */
  async init() {
    console.log('智能体对话查看器初始化中...');

    // 初始化所有组件
    Toast.init();
    AgentList.init();
    ChatPanel.init();
    OverviewPanel.init();
    MessageModal.init();

    // 绑定视图切换按钮
    this.bindViewToggle();

    // 加载初始数据
    await this.loadInitialData();

    // 启动轮询
    this.startPolling();

    console.log('智能体对话查看器初始化完成');
  },

  /**
   * 绑定视图切换按钮事件
   */
  bindViewToggle() {
    const listBtn = document.getElementById('view-list-btn');
    const overviewBtn = document.getElementById('view-overview-btn');

    if (listBtn) {
      listBtn.addEventListener('click', () => this.switchToListView());
    }
    if (overviewBtn) {
      overviewBtn.addEventListener('click', () => this.switchToOverviewView());
    }
  },

  /**
   * 切换到列表视图
   */
  switchToListView() {
    this.currentView = 'list';
    this.updateViewToggleButtons();
    OverviewPanel.hide();
  },

  /**
   * 切换到总览视图
   */
  switchToOverviewView() {
    this.currentView = 'overview';
    this.updateViewToggleButtons();
    OverviewPanel.show();
  },

  /**
   * 更新视图切换按钮状态
   */
  updateViewToggleButtons() {
    const listBtn = document.getElementById('view-list-btn');
    const overviewBtn = document.getElementById('view-overview-btn');

    if (listBtn) {
      listBtn.classList.toggle('active', this.currentView === 'list');
    }
    if (overviewBtn) {
      overviewBtn.classList.toggle('active', this.currentView === 'overview');
    }
  },

  /**
   * 加载初始数据
   */
  async loadInitialData() {
    try {
      // 并行加载智能体、岗位和组织树
      const [agentsRes, rolesRes, treeRes] = await Promise.all([
        API.getAgents(),
        API.getRoles(),
        API.getOrgTree(),
      ]);

      // 更新智能体数据
      this.agents = agentsRes.agents || [];
      this.agentsById.clear();
      this.agents.forEach(agent => {
        this.agentsById.set(agent.id, agent);
      });

      // 更新岗位数据
      this.roles = rolesRes.roles || [];

      // 更新组件
      AgentList.setAgents(this.agents);
      OverviewPanel.setAgents(this.agents);
      OverviewPanel.setRoles(this.roles);
      OverviewPanel.setTree(treeRes.tree);

      // 默认选择第一个智能体
      if (this.agents.length > 0 && !this.selectedAgentId) {
        // 按创建时间升序排序后选择第一个
        const sorted = SortUtils.sortByCreatedAt(this.agents, 'asc');
        this.selectAgent(sorted[0].id);
      }

    } catch (error) {
      console.error('加载初始数据失败:', error);
      Toast.error('加载数据失败，请刷新页面重试');
    }
  },

  /**
   * 选择智能体
   * @param {string} agentId - 智能体 ID
   */
  async selectAgent(agentId) {
    this.selectedAgentId = agentId;
    
    // 更新智能体列表选中状态
    AgentList.selectAgent(agentId);

    // 获取智能体对象
    const agent = this.agentsById.get(agentId);
    ChatPanel.setAgent(agent);

    // 加载消息
    await this.loadMessages(agentId);
  },

  /**
   * 选择智能体并滚动到指定消息
   * @param {string} agentId - 智能体 ID
   * @param {string} messageId - 消息 ID
   */
  async selectAgentAndScrollToMessage(agentId, messageId) {
    await this.selectAgent(agentId);
    // 延迟滚动，确保消息已渲染
    setTimeout(() => {
      ChatPanel.scrollToMessage(messageId);
    }, 100);
  },

  /**
   * 加载指定智能体的消息
   * @param {string} agentId - 智能体 ID
   */
  async loadMessages(agentId) {
    try {
      const res = await API.getAgentMessages(agentId);
      const messages = res.messages || [];
      
      // 更新消息计数
      this.lastMessageCounts.set(agentId, messages.length);
      
      ChatPanel.setMessages(messages);
    } catch (error) {
      console.error(`加载智能体 ${agentId} 的消息失败:`, error);
      Toast.error('加载消息失败');
    }
  },

  /**
   * 智能体选择回调（供 AgentList 调用）
   * @param {string} agentId - 智能体 ID
   */
  onAgentSelected(agentId) {
    this.selectAgent(agentId);
  },

  /**
   * 启动轮询
   */
  startPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }

    this.pollTimer = setInterval(() => {
      this.poll();
    }, this.pollInterval);
  },

  /**
   * 停止轮询
   */
  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  },

  /**
   * 执行一次轮询
   */
  async poll() {
    try {
      // 更新智能体列表
      const agentsRes = await API.getAgents();
      const newAgents = agentsRes.agents || [];
      
      // 检查是否有新智能体
      if (newAgents.length !== this.agents.length) {
        this.agents = newAgents;
        this.agentsById.clear();
        this.agents.forEach(agent => {
          this.agentsById.set(agent.id, agent);
        });
        AgentList.setAgents(this.agents);
        OverviewPanel.setAgents(this.agents);
        
        // 更新组织树
        const treeRes = await API.getOrgTree();
        OverviewPanel.setTree(treeRes.tree);
      }

      // 更新当前选中智能体的消息
      if (this.selectedAgentId) {
        const messagesRes = await API.getAgentMessages(this.selectedAgentId);
        const messages = messagesRes.messages || [];
        const lastCount = this.lastMessageCounts.get(this.selectedAgentId) || 0;
        
        if (messages.length > lastCount) {
          // 有新消息，追加到列表
          const newMessages = messages.slice(lastCount);
          newMessages.forEach(msg => {
            ChatPanel.appendMessage(msg);
          });
          this.lastMessageCounts.set(this.selectedAgentId, messages.length);
        }
      }

      // 检查其他智能体是否有新消息
      await this.checkNewMessages();

    } catch (error) {
      console.error('轮询失败:', error);
    }
  },

  /**
   * 检查其他智能体是否有新消息
   */
  async checkNewMessages() {
    // 只检查非当前选中的智能体
    for (const agent of this.agents) {
      if (agent.id === this.selectedAgentId) continue;

      try {
        const res = await API.getAgentMessages(agent.id);
        const messages = res.messages || [];
        const lastCount = this.lastMessageCounts.get(agent.id) || 0;

        if (messages.length > lastCount) {
          // 有新消息，标记该智能体
          AgentList.markNewMessage(agent.id);
          this.lastMessageCounts.set(agent.id, messages.length);
        }
      } catch (error) {
        // 忽略单个智能体的错误
      }
    }
  },
};

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

// 导出供其他模块使用
window.App = App;
