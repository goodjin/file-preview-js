/**
 * 状态管理器
 * 管理全局状态
 * 
 * @description 使用观察者模式实现的状态管理器
 * @module StateManager
 * @version 1.0.0
 */

/**
 * 预定义状态键
 * @enum {string}
 */
export const StateKeys = {
  CURRENT_FILE: 'currentFile',
  FILE_TYPE: 'fileType',
  ZOOM_LEVEL: 'zoomLevel',
  CURRENT_PAGE: 'currentPage',
  TOTAL_PAGES: 'totalPages',
  LOADING: 'loading',
  ERROR: 'error'
};

/**
 * 状态管理器类
 * @class StateManager
 */
export class StateManager {
  /**
   * 创建状态管理器实例
   * @param {EventBus} eventBus - 事件总线实例
   */
  constructor(eventBus) {
    this.state = {};
    this.eventBus = eventBus;
    this.subscribers = new Map();
  }

  /**
   * 获取状态
   * @param {string} key - 状态键
   * @returns {*} 状态值
   */
  getState(key) {
    return this.state[key];
  }

  /**
   * 获取所有状态
   * @returns {Object} 所有状态
   */
  getAllState() {
    return { ...this.state };
  }

  /**
   * 设置状态
   * @param {string} key - 状态键
   * @param {*} value - 状态值
   */
  setState(key, value) {
    const oldValue = this.state[key];
    this.state[key] = value;
    
    // 触发状态变化事件
    this.eventBus.emit(`state:${key}`, { oldValue, newValue: value });
  }

  /**
   * 批量设置状态
   * @param {Object} states - 状态对象
   */
  setMultipleStates(states) {
    Object.entries(states).forEach(([key, value]) => {
      this.setState(key, value);
    });
  }

  /**
   * 订阅状态变化
   * @param {string} key - 状态键
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消订阅函数
   */
  subscribe(key, callback) {
    const wrapper = ({ oldValue, newValue }) => {
      callback(newValue, oldValue);
    };
    
    this.eventBus.on(`state:${key}`, wrapper);
    
    // 保存订阅器
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, []);
    }
    this.subscribers.get(key).push(wrapper);
    
    // 返回取消订阅函数
    return () => {
      this.eventBus.off(`state:${key}`, wrapper);
      const callbacks = this.subscribers.get(key);
      const index = callbacks.indexOf(wrapper);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * 取消指定状态的所有订阅
   * @param {string} key - 状态键
   */
  unsubscribeAll(key) {
    const callbacks = this.subscribers.get(key);
    if (callbacks) {
      callbacks.forEach(callback => {
        this.eventBus.off(`state:${key}`, callback);
      });
      this.subscribers.delete(key);
    }
  }

  /**
   * 清除所有状态和订阅
   */
  clear() {
    this.state = {};
    this.subscribers.forEach((callbacks, key) => {
      callbacks.forEach(callback => {
        this.eventBus.off(`state:${key}`, callback);
      });
    });
    this.subscribers.clear();
  }
}