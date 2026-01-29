/**
 * EventBus - 事件总线
 * 提供统一的发布订阅机制，支持跨模块通信
 */

// 系统级事件
export const SystemEvents = {
  FILE_LOADED: 'system:file_loaded',
  FILE_ERROR: 'system:file_error',
  FILE_UNLOADED: 'system:file_unloaded',
  SYSTEM_READY: 'system:ready',
};

// 预览器事件
export const PreviewerEvents = {
  RENDER_START: 'previewer:render_start',
  RENDER_COMPLETE: 'previewer:render_complete',
  RENDER_ERROR: 'previewer:render_error',
  PAGE_CHANGED: 'previewer:page_changed',
  ZOOM_CHANGED: 'previewer:zoom_changed',
};

// UI事件
export const UIEvents = {
  FULLSCREEN_ENTER: 'ui:fullscreen_enter',
  FULLSCREEN_EXIT: 'ui:fullscreen_exit',
  RESIZE: 'ui:resize',
};

class EventBus {
  constructor() {
    // 事件存储: Map<eventName, Array<{callback, priority, once, context}>>
    this._events = new Map();
    // 事件ID计数器
    this._eventId = 0;
  }

  /**
   * 订阅事件
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   * @param {Object} options - 选项 {priority: number, once: boolean, context: any}
   * @returns {number} 事件ID，用于取消订阅
   */
  on(event, callback, options = {}) {
    if (typeof callback !== 'function') {
      throw new TypeError('Callback must be a function');
    }

    if (!this._events.has(event)) {
      this._events.set(event, []);
    }

    const listener = {
      id: ++this._eventId,
      callback,
      priority: options.priority || 0,
      once: options.once || false,
      context: options.context || null
    };

    const listeners = this._events.get(event);
    
    // 按优先级插入（降序，priority高的在前）
    let insertIndex = listeners.findIndex(l => l.priority < listener.priority);
    if (insertIndex === -1) {
      listeners.push(listener);
    } else {
      listeners.splice(insertIndex, 0, listener);
    }

    return listener.id;
  }

  /**
   * 订阅一次性事件
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   * @param {Object} options - 选项 {priority: number, context: any}
   * @returns {number} 事件ID
   */
  once(event, callback, options = {}) {
    return this.on(event, callback, { ...options, once: true });
  }

  /**
   * 通过ID取消订阅
   * @param {string} event - 事件名称
   * @param {number} eventId - 事件ID
   */
  offById(event, eventId) {
    if (!this._events.has(event)) {
      return false;
    }

    const listeners = this._events.get(event);
    const index = listeners.findIndex(l => l.id === eventId);

    if (index !== -1) {
      listeners.splice(index, 1);
      
      // 如果没有监听器了，删除事件
      if (listeners.length === 0) {
        this._events.delete(event);
      }
      
      return true;
    }

    return false;
  }

  /**
   * 通过回调函数取消订阅
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  off(event, callback) {
    if (!this._events.has(event)) {
      return;
    }

    const listeners = this._events.get(event);
    const index = listeners.findIndex(l => l.callback === callback);

    if (index !== -1) {
      listeners.splice(index, 1);
      
      if (listeners.length === 0) {
        this._events.delete(event);
      }
    }
  }

  /**
   * 发布事件
   * @param {string} event - 事件名称
   * @param {*} data - 事件数据
   * @returns {boolean} 是否有监听器处理了事件
   */
  emit(event, data) {
    // 处理命名空间通配符（如 'previewer:*'）
    if (event.includes('*')) {
      return this._emitWildcard(event, data);
    }

    if (!this._events.has(event)) {
      return false;
    }

    const listeners = this._events.get(event).slice(); // 创建副本，避免在循环中修改

    // 标记是否有监听器处理了事件
    let handled = false;
    const toRemove = [];

    for (const listener of listeners) {
      try {
        const context = listener.context || null;
        listener.callback.call(context, data, event);
        handled = true;

        if (listener.once) {
          toRemove.push(listener.id);
        }
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    }

    // 移除一次性监听器
    for (const id of toRemove) {
      this.offById(event, id);
    }

    return handled;
  }

  /**
   * 处理命名空间通配符
   * @private
   */
  _emitWildcard(pattern, data) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    let handled = false;

    for (const [event] of this._events) {
      if (regex.test(event)) {
        if (this.emit(event, data)) {
          handled = true;
        }
      }
    }

    return handled;
  }

  /**
   * 获取事件的监听器数量
   * @param {string} event - 事件名称
   * @returns {number} 监听器数量
   */
  listenerCount(event) {
    if (!this._events.has(event)) {
      return 0;
    }
    return this._events.get(event).length;
  }

  /**
   * 获取所有事件名称
   * @returns {Array<string>} 事件名称数组
   */
  eventNames() {
    return Array.from(this._events.keys());
  }

  /**
   * 清除所有事件监听
   */
  clear() {
    this._events.clear();
  }

  /**
   * 清除指定事件的所有监听器
   * @param {string} event - 事件名称
   */
  clearEvent(event) {
    this._events.delete(event);
  }

  /**
   * 批量处理事件
   * @param {Array<{event: string, data: any}>} events - 事件数组
   */
  emitBatch(events) {
    events.forEach(({ event, data }) => {
      this.emit(event, data);
    });
  }

  /**
   * 异步发布事件（支持async回调）
   * @param {string} event - 事件名称
   * @param {*} data - 事件数据
   * @returns {Promise<Array>} 所有回调的返回值
   */
  async emitAsync(event, data) {
    if (!this._events.has(event)) {
      return [];
    }

    const listeners = this._events.get(event).slice();
    const results = [];
    const toRemove = [];

    for (const listener of listeners) {
      try {
        const context = listener.context || null;
        const result = await listener.callback.call(context, data, event);
        results.push(result);

        if (listener.once) {
          toRemove.push(listener.id);
        }
      } catch (error) {
        console.error(`Error in async event handler for ${event}:`, error);
        results.push(null);
      }
    }

    // 移除一次性监听器
    for (const id of toRemove) {
      this.offById(event, id);
    }

    return results;
  }

  /**
   * 创建事件命名空间
   * @param {string} namespace - 命名空间前缀
   * @returns {Object} 命名空间对象
   */
  namespace(namespace) {
    const self = this;
    
    return {
      on(event, callback, options) {
        return self.on(`${namespace}:${event}`, callback, options);
      },
      
      once(event, callback, options) {
        return self.once(`${namespace}:${event}`, callback, options);
      },
      
      off(event, callback) {
        self.off(`${namespace}:${event}`, callback);
      },
      
      emit(event, data) {
        return self.emit(`${namespace}:${event}`, data);
      },
      
      emitAsync(event, data) {
        return self.emitAsync(`${namespace}:${event}`, data);
      },
      
      listenerCount(event) {
        return self.listenerCount(`${namespace}:${event}`);
      }
    };
  }
}

// 导出单例实例
const eventBus = new EventBus();
export default eventBus;
export { EventBus };
