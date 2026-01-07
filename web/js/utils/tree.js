/**
 * 树结构工具函数
 * 用于构建和操作组织树
 */

const TreeUtils = {
  /**
   * 从智能体列表构建组织树
   * @param {Array} agents - 智能体数组
   * @returns {object} 树根节点
   */
  buildTree(agents) {
    if (!Array.isArray(agents) || agents.length === 0) {
      return null;
    }

    // 创建 ID 到智能体的映射
    const agentMap = new Map();
    agents.forEach(agent => {
      agentMap.set(agent.id, {
        id: agent.id,
        roleName: agent.roleName || '未知岗位',
        status: agent.status,
        children: [],
      });
    });

    // 构建父子关系
    let root = null;
    agents.forEach(agent => {
      const node = agentMap.get(agent.id);
      
      if (agent.id === 'root' || !agent.parentAgentId) {
        // 根节点
        root = node;
      } else {
        // 添加到父节点的 children
        const parent = agentMap.get(agent.parentAgentId);
        if (parent) {
          parent.children.push(node);
        }
      }
    });

    return root;
  },

  /**
   * 计算每个岗位的智能体数量
   * @param {Array} agents - 智能体数组
   * @returns {Map<string, number>} 岗位名称到数量的映射
   */
  countByRole(agents) {
    const counts = new Map();
    
    if (!Array.isArray(agents)) {
      return counts;
    }

    agents.forEach(agent => {
      const roleName = agent.roleName || '未知岗位';
      counts.set(roleName, (counts.get(roleName) || 0) + 1);
    });

    return counts;
  },

  /**
   * 将岗位统计转换为排序后的数组
   * @param {Map<string, number>} counts - 岗位统计 Map
   * @returns {Array<{name: string, count: number}>} 排序后的数组
   */
  roleCountsToArray(counts) {
    const arr = [];
    counts.forEach((count, name) => {
      arr.push({ name, count });
    });
    // 按数量降序排列
    arr.sort((a, b) => b.count - a.count);
    return arr;
  },

  /**
   * 遍历树的所有节点
   * @param {object} node - 树节点
   * @param {function} callback - 回调函数 (node, depth) => void
   * @param {number} depth - 当前深度
   */
  traverse(node, callback, depth = 0) {
    if (!node) return;
    
    callback(node, depth);
    
    if (node.children) {
      node.children.forEach(child => {
        this.traverse(child, callback, depth + 1);
      });
    }
  },

  /**
   * 查找节点
   * @param {object} root - 树根节点
   * @param {string} id - 要查找的节点 ID
   * @returns {object|null} 找到的节点或 null
   */
  findNode(root, id) {
    if (!root) return null;
    if (root.id === id) return root;
    
    if (root.children) {
      for (const child of root.children) {
        const found = this.findNode(child, id);
        if (found) return found;
      }
    }
    
    return null;
  },
};

// 导出供其他模块使用
window.TreeUtils = TreeUtils;
