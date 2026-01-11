/**
 * 岗位详情弹窗组件
 * 显示岗位的详细信息、职责描述、关联智能体列表
 */

const RoleDetailModal = {
  // DOM 元素引用
  overlay: null,
  content: null,
  body: null,
  
  // 当前显示的岗位
  currentRole: null,
  
  // LLM 服务列表缓存
  llmServices: null,
  
  // 工具组列表缓存
  toolGroups: null,

  /**
   * 初始化组件
   */
  init() {
    this.overlay = document.getElementById('role-detail-modal');
    this.content = this.overlay?.querySelector('.modal-content');
    this.body = document.getElementById('role-detail-body');

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
    
    // 预加载 LLM 服务列表
    this.loadLlmServices();
    
    // 预加载工具组列表
    this.loadToolGroups();
  },

  /**
   * 加载工具组列表
   */
  async loadToolGroups() {
    try {
      const result = await API.getToolGroups();
      this.toolGroups = result.toolGroups || [];
    } catch (error) {
      console.error('加载工具组列表失败:', error);
      this.toolGroups = [];
    }
  },

  /**
   * 加载 LLM 服务列表
   */
  async loadLlmServices() {
    try {
      const result = await API.getLlmServices();
      this.llmServices = result.services || [];
    } catch (error) {
      console.error('加载 LLM 服务列表失败:', error);
      this.llmServices = [];
    }
  },

  /**
   * 通过岗位ID显示详情
   * @param {string} roleId - 岗位 ID
   */
  async showByRoleId(roleId) {
    // 从 App 获取岗位信息
    const role = window.App?.roles?.find(r => r.id === roleId);
    if (!role) {
      Toast.show('岗位不存在', 'error');
      return;
    }
    await this.show(role);
  },

  /**
   * 通过岗位名称显示详情
   * @param {string} roleName - 岗位名称
   */
  async showByRoleName(roleName) {
    const role = window.App?.roles?.find(r => r.name === roleName);
    if (!role) {
      Toast.show('岗位不存在', 'error');
      return;
    }
    await this.show(role);
  },

  /**
   * 显示岗位详情
   * @param {object} role - 岗位对象
   */
  async show(role) {
    this.currentRole = role;
    
    // 获取该岗位下的所有智能体
    const agents = this.getAgentsByRole(role.id);
    
    // 确保 LLM 服务列表已加载
    if (!this.llmServices) {
      await this.loadLlmServices();
    }
    
    // 确保工具组列表已加载
    if (!this.toolGroups) {
      await this.loadToolGroups();
    }
    
    this.renderContent(role, agents);
    
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
    this.currentRole = null;
  },

  /**
   * 获取指定岗位的所有智能体
   * @param {string} roleId - 岗位 ID
   * @returns {Array} 智能体列表
   */
  getAgentsByRole(roleId) {
    if (!window.App?.agents) return [];
    return window.App.agents.filter(a => a.roleId === roleId);
  },

  /**
   * 渲染弹窗内容
   * @param {object} role - 岗位对象
   * @param {Array} agents - 该岗位下的智能体列表
   */
  renderContent(role, agents) {
    if (!this.body) return;

    const activeAgents = agents.filter(a => a.status !== 'terminated');
    const terminatedAgents = agents.filter(a => a.status === 'terminated');
    const isSystemRole = role.id === 'root' || role.id === 'user';
    
    // 获取当前 LLM 服务名称
    const currentServiceName = this.getLlmServiceName(role.llmServiceId);

    const html = `
      <!-- 基本信息 -->
      <div class="detail-section">
        <h4 class="section-title">基本信息</h4>
        <div class="detail-item">
          <div class="detail-label">岗位名称</div>
          <div class="detail-value">${this.escapeHtml(role.name)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">岗位 ID</div>
          <div class="detail-value monospace">${this.escapeHtml(role.id)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">创建者</div>
          <div class="detail-value">${this.escapeHtml(role.createdBy || '系统')}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">创建时间</div>
          <div class="detail-value">${this.formatTime(role.createdAt)}</div>
        </div>
      </div>

      <!-- 大模型服务 -->
      <div class="detail-section">
        <h4 class="section-title">大模型服务</h4>
        <div id="llm-service-view" class="detail-item">
          <div class="detail-label">当前服务</div>
          <div class="detail-value llm-service-display">
            <span id="llm-service-name">${this.escapeHtml(currentServiceName)}</span>
            ${!isSystemRole ? `<button class="edit-llm-btn" onclick="RoleDetailModal.toggleLlmEditMode()" title="修改">✏️</button>` : ''}
          </div>
        </div>
        <div id="llm-service-edit" class="llm-service-edit hidden">
          <select id="llm-service-select" class="llm-service-select">
            <option value="">使用默认服务</option>
            ${this.renderLlmServiceOptions(role.llmServiceId)}
          </select>
          <div class="edit-actions">
            <button class="cancel-btn" onclick="RoleDetailModal.cancelLlmEdit()">取消</button>
            <button class="save-btn" onclick="RoleDetailModal.saveLlmService()">保存</button>
          </div>
        </div>
        ${isSystemRole ? `<div class="hint-text">系统岗位不可修改</div>` : ''}
      </div>

      <!-- 工具组配置 -->
      <div class="detail-section">
        <h4 class="section-title">
          工具组配置
          ${!isSystemRole ? `<button class="edit-tool-groups-btn" onclick="RoleDetailModal.toggleToolGroupsEditMode()" title="修改">✏️</button>` : ''}
        </h4>
        <div id="tool-groups-view" class="detail-item">
          <div class="detail-label">可用工具组</div>
          <div class="detail-value tool-groups-display">
            ${this.renderToolGroupsDisplay(role.toolGroups)}
          </div>
        </div>
        <div id="tool-groups-edit" class="tool-groups-edit hidden">
          <div class="tool-groups-checkboxes">
            ${this.renderToolGroupsCheckboxes(role.toolGroups)}
          </div>
          <div class="tool-groups-hint">
            <span class="hint-icon">💡</span>
            <span>不选择任何工具组将使用默认的全部工具组</span>
          </div>
          <div class="edit-actions">
            <button class="cancel-btn" onclick="RoleDetailModal.cancelToolGroupsEdit()">取消</button>
            <button class="save-btn" onclick="RoleDetailModal.saveToolGroups()">保存</button>
          </div>
        </div>
        ${isSystemRole ? `<div class="hint-text">${role.id === 'root' ? 'root 岗位仅使用组织管理工具' : '系统岗位不可修改'}</div>` : ''}
      </div>

      <!-- 智能体统计 -->
      <div class="detail-section">
        <h4 class="section-title">智能体统计</h4>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">${agents.length}</div>
            <div class="stat-label">总数</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${activeAgents.length}</div>
            <div class="stat-label">运行中</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${terminatedAgents.length}</div>
            <div class="stat-label">已终止</div>
          </div>
        </div>
      </div>

      <!-- 岗位职责 -->
      <div class="detail-section">
        <h4 class="section-title">
          岗位职责 (Prompt)
          ${!isSystemRole ? `<button class="edit-prompt-btn" onclick="RoleDetailModal.toggleEditMode()" title="编辑">✏️</button>` : ''}
        </h4>
        <div id="role-prompt-view" class="role-prompt-viewer">${this.escapeHtml(role.rolePrompt || '无')}</div>
        <div id="role-prompt-edit" class="role-prompt-edit hidden">
          <textarea id="role-prompt-textarea" class="role-prompt-textarea" placeholder="输入岗位职责描述...">${this.escapeHtml(role.rolePrompt || '')}</textarea>
          <div class="edit-actions">
            <button class="cancel-btn" onclick="RoleDetailModal.cancelEdit()">取消</button>
            <button class="save-btn" onclick="RoleDetailModal.savePrompt()">保存</button>
          </div>
        </div>
        ${isSystemRole ? `<div class="hint-text">系统岗位不可编辑</div>` : ''}
      </div>

      <!-- 智能体列表 -->
      ${agents.length > 0 ? `
      <div class="detail-section">
        <h4 class="section-title">关联智能体</h4>
        <div class="agent-list-compact">
          ${agents.map(agent => this.renderAgentItem(agent)).join('')}
        </div>
      </div>
      ` : ''}
    `;

    this.body.innerHTML = html;
  },

  /**
   * 获取 LLM 服务名称
   * @param {string|null} serviceId - 服务 ID
   * @returns {string} 服务名称
   */
  getLlmServiceName(serviceId) {
    if (!serviceId) {
      return '默认服务';
    }
    if (!this.llmServices) {
      return serviceId;
    }
    const service = this.llmServices.find(s => s.id === serviceId);
    return service ? service.name : serviceId;
  },

  /**
   * 渲染 LLM 服务选项
   * @param {string|null} currentServiceId - 当前选中的服务 ID
   * @returns {string} HTML 字符串
   */
  renderLlmServiceOptions(currentServiceId) {
    if (!this.llmServices || this.llmServices.length === 0) {
      return '';
    }
    return this.llmServices.map(service => {
      const selected = service.id === currentServiceId ? 'selected' : '';
      const tags = service.capabilityTags?.join(', ') || '';
      const title = tags ? `${service.description || ''}\n能力标签: ${tags}` : (service.description || '');
      return `<option value="${this.escapeHtml(service.id)}" ${selected} title="${this.escapeHtml(title)}">${this.escapeHtml(service.name)}</option>`;
    }).join('');
  },

  /**
   * 切换 LLM 服务编辑模式
   */
  toggleLlmEditMode() {
    const viewEl = document.getElementById('llm-service-view');
    const editEl = document.getElementById('llm-service-edit');
    
    if (viewEl && editEl) {
      viewEl.classList.add('hidden');
      editEl.classList.remove('hidden');
      
      // 聚焦到选择框
      const select = document.getElementById('llm-service-select');
      if (select) {
        select.focus();
      }
    }
  },

  /**
   * 取消 LLM 服务编辑
   */
  cancelLlmEdit() {
    const viewEl = document.getElementById('llm-service-view');
    const editEl = document.getElementById('llm-service-edit');
    const select = document.getElementById('llm-service-select');
    
    if (viewEl && editEl) {
      viewEl.classList.remove('hidden');
      editEl.classList.add('hidden');
      
      // 恢复原始选择
      if (select && this.currentRole) {
        select.value = this.currentRole.llmServiceId || '';
      }
    }
  },

  /**
   * 保存 LLM 服务设置
   */
  async saveLlmService() {
    if (!this.currentRole) return;
    
    const select = document.getElementById('llm-service-select');
    const newServiceId = select?.value || null;
    
    try {
      const result = await API.updateRoleLlmService(this.currentRole.id, newServiceId);
      
      if (result.ok && result.role) {
        // 更新本地数据
        this.currentRole.llmServiceId = result.role.llmServiceId;
        
        // 更新 App 中的岗位数据
        if (window.App?.roles) {
          const roleIndex = window.App.roles.findIndex(r => r.id === this.currentRole.id);
          if (roleIndex !== -1) {
            window.App.roles[roleIndex].llmServiceId = result.role.llmServiceId;
          }
        }
        
        // 更新显示
        const nameEl = document.getElementById('llm-service-name');
        if (nameEl) {
          nameEl.textContent = this.getLlmServiceName(result.role.llmServiceId);
        }
        
        // 退出编辑模式
        this.cancelLlmEdit();
        
        Toast.show('大模型服务已更新', 'success');
      }
    } catch (error) {
      console.error('保存大模型服务失败:', error);
      Toast.show('保存失败: ' + error.message, 'error');
    }
  },

  /**
   * 渲染工具组显示
   * @param {string[]|null} toolGroups - 工具组列表
   * @returns {string} HTML 字符串
   */
  renderToolGroupsDisplay(toolGroups) {
    if (!toolGroups || toolGroups.length === 0) {
      return '<span class="tool-groups-default">全部工具组（默认）</span>';
    }
    
    return toolGroups.map(groupId => {
      const group = this.toolGroups?.find(g => g.id === groupId);
      const name = group ? group.id : groupId;
      const description = group?.description || '';
      return `<span class="tool-group-tag" title="${this.escapeHtml(description)}">${this.escapeHtml(name)}</span>`;
    }).join('');
  },

  /**
   * 渲染工具组复选框
   * @param {string[]|null} selectedGroups - 已选中的工具组
   * @returns {string} HTML 字符串
   */
  renderToolGroupsCheckboxes(selectedGroups) {
    if (!this.toolGroups || this.toolGroups.length === 0) {
      return '<div class="no-tool-groups">暂无可用工具组</div>';
    }
    
    const selectedSet = new Set(selectedGroups || []);
    
    return this.toolGroups.map(group => {
      const checked = selectedSet.has(group.id) ? 'checked' : '';
      const toolList = group.tools?.join(', ') || '';
      return `
        <label class="tool-group-checkbox" title="${this.escapeHtml(group.description || '')}\n工具: ${this.escapeHtml(toolList)}">
          <input type="checkbox" name="toolGroup" value="${this.escapeHtml(group.id)}" ${checked}>
          <span class="tool-group-name">${this.escapeHtml(group.id)}</span>
          <span class="tool-group-count">(${group.toolCount || 0})</span>
        </label>
      `;
    }).join('');
  },

  /**
   * 切换工具组编辑模式
   */
  toggleToolGroupsEditMode() {
    const viewEl = document.getElementById('tool-groups-view');
    const editEl = document.getElementById('tool-groups-edit');
    
    if (viewEl && editEl) {
      viewEl.classList.add('hidden');
      editEl.classList.remove('hidden');
    }
  },

  /**
   * 取消工具组编辑
   */
  cancelToolGroupsEdit() {
    const viewEl = document.getElementById('tool-groups-view');
    const editEl = document.getElementById('tool-groups-edit');
    
    if (viewEl && editEl) {
      viewEl.classList.remove('hidden');
      editEl.classList.add('hidden');
      
      // 恢复原始选择
      const checkboxes = editEl.querySelectorAll('input[name="toolGroup"]');
      const selectedSet = new Set(this.currentRole?.toolGroups || []);
      checkboxes.forEach(cb => {
        cb.checked = selectedSet.has(cb.value);
      });
    }
  },

  /**
   * 保存工具组设置
   */
  async saveToolGroups() {
    if (!this.currentRole) return;
    
    const checkboxes = document.querySelectorAll('#tool-groups-edit input[name="toolGroup"]:checked');
    const selectedGroups = Array.from(checkboxes).map(cb => cb.value);
    
    // 如果没有选择任何工具组，设为 null（使用默认的全部工具组）
    const toolGroups = selectedGroups.length > 0 ? selectedGroups : null;
    
    try {
      const result = await API.updateRoleToolGroups(this.currentRole.id, toolGroups);
      
      if (result.ok && result.role) {
        // 更新本地数据
        this.currentRole.toolGroups = result.role.toolGroups;
        
        // 更新 App 中的岗位数据
        if (window.App?.roles) {
          const roleIndex = window.App.roles.findIndex(r => r.id === this.currentRole.id);
          if (roleIndex !== -1) {
            window.App.roles[roleIndex].toolGroups = result.role.toolGroups;
          }
        }
        
        // 更新显示
        const displayEl = document.querySelector('#tool-groups-view .tool-groups-display');
        if (displayEl) {
          displayEl.innerHTML = this.renderToolGroupsDisplay(result.role.toolGroups);
        }
        
        // 退出编辑模式
        this.cancelToolGroupsEdit();
        
        Toast.show('工具组配置已更新', 'success');
      }
    } catch (error) {
      console.error('保存工具组配置失败:', error);
      Toast.show('保存失败: ' + error.message, 'error');
    }
  },

  /**
   * 切换编辑模式
   */
  toggleEditMode() {
    const viewEl = document.getElementById('role-prompt-view');
    const editEl = document.getElementById('role-prompt-edit');
    
    if (viewEl && editEl) {
      viewEl.classList.add('hidden');
      editEl.classList.remove('hidden');
      
      // 聚焦到文本框
      const textarea = document.getElementById('role-prompt-textarea');
      if (textarea) {
        textarea.focus();
      }
    }
  },

  /**
   * 取消编辑
   */
  cancelEdit() {
    const viewEl = document.getElementById('role-prompt-view');
    const editEl = document.getElementById('role-prompt-edit');
    const textarea = document.getElementById('role-prompt-textarea');
    
    if (viewEl && editEl) {
      viewEl.classList.remove('hidden');
      editEl.classList.add('hidden');
      
      // 恢复原始内容
      if (textarea && this.currentRole) {
        textarea.value = this.currentRole.rolePrompt || '';
      }
    }
  },

  /**
   * 保存职责提示词
   */
  async savePrompt() {
    if (!this.currentRole) return;
    
    const textarea = document.getElementById('role-prompt-textarea');
    const newPrompt = textarea?.value || '';
    
    try {
      const result = await API.updateRolePrompt(this.currentRole.id, newPrompt);
      
      if (result.ok && result.role) {
        // 更新本地数据
        this.currentRole.rolePrompt = result.role.rolePrompt;
        
        // 更新 App 中的岗位数据
        if (window.App?.roles) {
          const roleIndex = window.App.roles.findIndex(r => r.id === this.currentRole.id);
          if (roleIndex !== -1) {
            window.App.roles[roleIndex].rolePrompt = result.role.rolePrompt;
          }
        }
        
        // 更新显示
        const viewEl = document.getElementById('role-prompt-view');
        if (viewEl) {
          viewEl.textContent = result.role.rolePrompt || '无';
        }
        
        // 退出编辑模式
        this.cancelEdit();
        
        Toast.show('岗位职责已更新', 'success');
      }
    } catch (error) {
      console.error('保存岗位职责失败:', error);
      Toast.show('保存失败: ' + error.message, 'error');
    }
  },

  /**
   * 渲染智能体列表项
   * @param {object} agent - 智能体对象
   * @returns {string} HTML 字符串
   */
  renderAgentItem(agent) {
    const displayName = agent.customName || agent.id;
    const statusClass = agent.status === 'terminated' ? 'terminated' : 'active';
    const statusText = agent.status === 'terminated' ? '已终止' : '运行中';
    
    return `
      <div class="agent-list-item" onclick="RoleDetailModal.openAgentDetail('${agent.id}')">
        <div class="agent-list-item-info">
          <span class="agent-list-item-name">${this.escapeHtml(displayName)}</span>
          ${agent.customName ? `<span class="agent-list-item-id">${this.escapeHtml(agent.id)}</span>` : ''}
        </div>
        <span class="status-badge ${statusClass}">${statusText}</span>
      </div>
    `;
  },

  /**
   * 打开智能体详情
   * @param {string} agentId - 智能体 ID
   */
  openAgentDetail(agentId) {
    this.hide();
    if (window.AgentDetailModal) {
      window.AgentDetailModal.show(agentId);
    }
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
window.RoleDetailModal = RoleDetailModal;
