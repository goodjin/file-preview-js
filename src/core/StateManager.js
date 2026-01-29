/**
 * StateManager - 状态管理器
 * 负责管理预览器的全局状态，支持状态订阅和持久化
 */

// 默认状态定义
const DEFAULT_STATE = {
  // 当前文件
  currentFile: {
    name: null,
    type: null,
    size: 0,
    url: null,
  },
  
  // 预览器状态
  previewer: {
    zoom: 1.0,
    currentPage: 1,
    totalPages: 0,
    isLoaded: false,
    isLoading: false,
  },
  
  // UI状态
  ui: {
    isFullscreen: false,
    toolbarVisible: true,
    sidebarVisible: false,
  },
  
  // 用户偏好（持久化）
  preferences: {
    defaultZoom: 1.0,
    autoRotate: false,
    theme: 'light',
  },
};

// 需要持久化的状态路径
const PERSISTENT_KEYS = [
  'preferences',
  'ui.toolbarVisible',
  'ui.sidebarVisible',
];

class StateManager {
  constructor(initialState = {}) {
    // 使用Proxy创建响应式状态
    this._state = this._createProxy(initialState);
    // 订阅者: Map<key, Array<{callback, id}>>
    this._subscribers = new Map();
    // 订阅ID计数器
    this._subscriberId = 0;
    // 状态变更历史（用于调试和回滚）
    this._history = [];
    this._maxHistorySize = 50;
  }

  /**
   * 创建Proxy代理，实现响应式监听
   * @private
   */
  _createProxy(initialState) {
    const mergedState = this._deepMerge(DEFAULT_STATE, initialState);
    return this._createProxyRecursive(mergedState, '');
  }

  /**
   * 递归创建Proxy
   * @private
   */
  _createProxyRecursive(obj, path) {
    const self = this;
    
    return new Proxy(obj, {
      get(target, prop) {
        const value = target[prop];
        
        // 如果是对象，继续代理
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          return self._createProxyRecursive(value, path ? `${path}.${prop}` : prop);
        }
        
        return value;
      },
      
      set(target, prop, value) {
        const oldValue = target[prop];
        const key = path ? `${path}.${prop}` : prop;
        
        // 如果值没有变化，不触发更新
        if (oldValue === value) {
          return true;
        }
        
        target[prop] = value;
        
        // 触发订阅通知
        self._notifySubscribers(key, value, oldValue);
        
        // 如果是对象属性，也触发父级路径的订阅
        if (path) {
          self._notifySubscribers(path, target, { ...target, [prop]: oldValue });
        }
        
        // 记录历史
        self._addToHistory(key, value, oldValue);
        
        return true;
      }
    });
  }

  /**
   * 获取状态
   * @param {string} key - 状态键（支持路径式访问，如 'previewer.zoom'）
   * @returns {*} 状态值
   */
  get(key) {
    if (!key) {
      return this._state;
    }

    return this._getByPath(this._state, key);
  }

  /**
   * 通过路径获取值
   * @private
   */
  _getByPath(obj, path) {
    const keys = path.split('.');
    let current = obj;
    
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  /**
   * 设置状态
   * @param {string} key - 状态键（支持路径式访问）
   * @param {*} value - 状态值
   */
  set(key, value) {
    const keys = key.split('.');
    let current = this._state;
    
    // 遍历到最后一个键的前一个
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current) || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }
    
    // 设置最后一个键的值
    current[keys[keys.length - 1]] = value;
  }

  /**
   * 批量更新状态
   * @param {Object} changes - 变更对象 { 'previewer.zoom': 1.5, 'ui.isFullscreen': true }
   */
  update(changes) {
    for (const [key, value] of Object.entries(changes)) {
      this.set(key, value);
    }
  }

  /**
   * 重置状态
   * @param {string} key - 状态键（可选，不提供则重置所有）
   */
  reset(key) {
    if (!key) {
      // 重置所有状态
      const mergedState = this._deepMerge(DEFAULT_STATE, {});
      Object.keys(this._state).forEach(k => {
        delete this._state[k];
      });
      Object.assign(this._state, mergedState);
    } else {
      // 重置指定路径的状态
      const defaultValue = this._getByPath(DEFAULT_STATE, key);
      if (defaultValue !== undefined) {
        this.set(key, defaultValue);
      }
    }
  }

  /**
   * 订阅状态变化
   * @param {string} key - 状态键
   * @param {Function} callback - 回调函数 (newValue, oldValue) => void
   * @returns {number} 订阅ID
   */
  subscribe(key, callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('Callback must be a function');
    }

    if (!this._subscribers.has(key)) {
      this._subscribers.set(key, []);
    }

    const subscriber = {
      id: ++this._subscriberId,
      callback
    };

    this._subscribers.get(key).push(subscriber);
    return subscriber.id;
  }

  /**
   * 取消订阅
   * @param {string} key - 状态键
   * @param {number|Function} idOrCallback - 订阅ID或回调函数
   */
  unsubscribe(key, idOrCallback) {
    if (!this._subscribers.has(key)) {
      return;
    }

    const subscribers = this._subscribers.get(key);
    const index = subscribers.findIndex(s => 
      (typeof idOrCallback === 'number' && s.id === idOrCallback) ||
      (typeof idOrCallback === 'function' && s.callback === idOrCallback)
    );

    if (index !== -1) {
      subscribers.splice(index, 1);
      
      if (subscribers.length === 0) {
        this._subscribers.delete(key);
      }
    }
  }

  /**
   * 清除所有订阅
   */
  clearSubscribers() {
    this._subscribers.clear();
  }

  /**
   * 通知订阅者
   * @private
   */
  _notifySubscribers(key, newValue, oldValue) {
    // 通知完全匹配的订阅者
    if (this._subscribers.has(key)) {
      const subscribers = this._subscribers.get(key).slice();
      for (const subscriber of subscribers) {
        try {
          subscriber.callback(newValue, oldValue);
        } catch (error) {
          console.error(`Error in state subscriber for ${key}:`, error);
        }
      }
    }

    // 通知父级路径的订阅者（如订阅了 'previewer' 也会收到 'previewer.zoom' 的变化）
    const keys = key.split('.');
    for (let i = keys.length - 1; i > 0; i--) {
      const parentKey = keys.slice(0, i).join('.');
      if (this._subscribers.has(parentKey)) {
        const subscribers = this._subscribers.get(parentKey).slice();
        for (const subscriber of subscribers) {
          try {
            subscriber.callback(this._getByPath(this._state, parentKey), undefined);
          } catch (error) {
            console.error(`Error in state subscriber for ${parentKey}:`, error);
          }
        }
      }
    }
  }

  /**
   * 持久化状态到LocalStorage
   * @param {Array<string>} keys - 要持久化的键（可选，不提供则使用默认配置）
   */
  persist(keys = PERSISTENT_KEYS) {
    try {
      const data = {};
      
      for (const key of keys) {
        const value = this._getByPath(this._state, key);
        if (value !== undefined) {
          data[key] = value;
        }
      }
      
      localStorage.setItem('previewer_state', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to persist state:', error);
    }
  }

  /**
   * 从LocalStorage恢复状态
   * @returns {boolean} 是否成功恢复
   */
  restore() {
    try {
      const stored = localStorage.getItem('previewer_state');
      if (!stored) {
        return false;
      }
      
      const data = JSON.parse(stored);
      
      for (const [key, value] of Object.entries(data)) {
        this.set(key, value);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to restore state:', error);
      return false;
    }
  }

  /**
   * 清除持久化状态
   */
  clearPersisted() {
    try {
      localStorage.removeItem('previewer_state');
    } catch (error) {
      console.error('Failed to clear persisted state:', error);
    }
  }

  /**
   * 获取状态快照
   * @returns {Object} 状态快照
   */
  getSnapshot() {
    return JSON.parse(JSON.stringify(this._state));
  }

  /**
   * 恢复状态快照
   * @param {Object} snapshot - 状态快照
   */
  restoreSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') {
      throw new Error('Invalid snapshot');
    }
    
    this._clearState();
    Object.assign(this._state, this._deepMerge(DEFAULT_STATE, snapshot));
  }

  /**
   * 添加到历史记录
   * @private
   */
  _addToHistory(key, newValue, oldValue) {
    this._history.push({
      key,
      newValue,
      oldValue,
      timestamp: Date.now()
    });
    
    // 限制历史记录大小
    if (this._history.length > this._maxHistorySize) {
      this._history.shift();
    }
  }

  /**
   * 获取变更历史
   * @param {number} limit - 返回的记录数
   * @returns {Array} 历史记录
   */
  getHistory(limit = 10) {
    return this._history.slice(-limit);
  }

  /**
   * 清空历史记录
   */
  clearHistory() {
    this._history = [];
  }

  /**
   * 深度合并对象
   * @private
   */
  _deepMerge(target, source) {
    const result = { ...target };
    
    for (const key of Object.keys(source)) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this._deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * 清空状态
   * @private
   */
  _clearState() {
    Object.keys(this._state).forEach(key => {
      delete this._state[key];
    });
  }
}

// 导出单例实例
const stateManager = new StateManager();
export default stateManager;
export { StateManager, DEFAULT_STATE, PERSISTENT_KEYS };
