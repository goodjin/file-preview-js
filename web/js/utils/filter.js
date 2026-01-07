/**
 * 筛选工具函数
 * 提供智能体列表的筛选功能
 */

const FilterUtils = {
  /**
   * 按岗位名称筛选智能体列表
   * 支持部分匹配，不区分大小写
   * @param {Array} agents - 智能体数组
   * @param {string} keyword - 筛选关键词
   * @returns {Array} 筛选后的新数组
   */
  filterByRole(agents, keyword) {
    if (!Array.isArray(agents)) {
      return [];
    }
    
    // 空关键词返回全部
    if (!keyword || keyword.trim() === '') {
      return [...agents];
    }
    
    const lowerKeyword = keyword.toLowerCase().trim();
    
    return agents.filter(agent => {
      const roleName = (agent.roleName || '').toLowerCase();
      return roleName.includes(lowerKeyword);
    });
  },

  /**
   * 按智能体 ID 筛选
   * 支持部分匹配，不区分大小写
   * @param {Array} agents - 智能体数组
   * @param {string} keyword - 筛选关键词
   * @returns {Array} 筛选后的新数组
   */
  filterById(agents, keyword) {
    if (!Array.isArray(agents)) {
      return [];
    }
    
    if (!keyword || keyword.trim() === '') {
      return [...agents];
    }
    
    const lowerKeyword = keyword.toLowerCase().trim();
    
    return agents.filter(agent => {
      const id = (agent.id || '').toLowerCase();
      return id.includes(lowerKeyword);
    });
  },

  /**
   * 综合筛选（同时匹配岗位名称和智能体 ID）
   * @param {Array} agents - 智能体数组
   * @param {string} keyword - 筛选关键词
   * @returns {Array} 筛选后的新数组
   */
  filterByKeyword(agents, keyword) {
    if (!Array.isArray(agents)) {
      return [];
    }
    
    if (!keyword || keyword.trim() === '') {
      return [...agents];
    }
    
    const lowerKeyword = keyword.toLowerCase().trim();
    
    return agents.filter(agent => {
      const roleName = (agent.roleName || '').toLowerCase();
      const id = (agent.id || '').toLowerCase();
      return roleName.includes(lowerKeyword) || id.includes(lowerKeyword);
    });
  },

  /**
   * 按状态筛选智能体
   * @param {Array} agents - 智能体数组
   * @param {string} status - 状态 ('active', 'terminated', 或 'all')
   * @returns {Array} 筛选后的新数组
   */
  filterByStatus(agents, status) {
    if (!Array.isArray(agents)) {
      return [];
    }
    
    if (!status || status === 'all') {
      return [...agents];
    }
    
    return agents.filter(agent => agent.status === status);
  },
};

// 导出供其他模块使用
window.FilterUtils = FilterUtils;
