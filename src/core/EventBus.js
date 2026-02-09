/**
 * 事件总线
 * 模块间事件通信，解耦模块依赖
 * 
 * @description 实现发布-订阅模式的事件总线
 * @module EventBus
 * @version 1.0.0
 */

/**
 * 事件类型常量
 * @enum {string}
 */
export const Events = {
  // 文件事件
  FILE_LOADED: 'file:loaded',
  FILE_LOAD_PROGRESS: 'file:load:progress',
  FILE_LOAD_ERROR: 'file:load:error',
  
  // 预览事件
  PREVIEW_READY: 'preview:ready',
  PREVIEW_ERROR: 'preview:error',
  
  // 交互事件
  ZOOM_CHANGED: 'zoom:changed',
  PAGE_CHANGED: 'page:changed',
  FULLSCREEN_TOGGLE: 'fullscreen:toggle',
  
  // 应用事件
  APP_READY: 'app:ready',
  APP_ERROR: 'app:error'
};

/**
 * 事件总线类
 * @class EventBus
 */
export class EventBus {
  /**
   * 创建事件总线实例
   */
  constructor() {
    this.events = new Map();
  }

  /**
   * 订阅事件
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消订阅函数
   */
  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    
    this.events.get(event).push(callback);
    
    // 返回取消订阅函数
    return () => this.off(event, callback);
  }

  /**
   * 触发事件
   * @param {string} event - 事件名称
   * @param {*} data - 事件数据
   */
  emit(event, data) {
    const callbacks = this.events.get(event);
    if (callbacks && callbacks.length > 0) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * 取消订阅
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  off(event, callback) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * 订阅一次性事件
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消订阅函数
   */
  once(event, callback) {
    const wrapper = (data) => {
      callback(data);
      this.off(event, wrapper);
    };
    return this.on(event, wrapper);
  }

  /**
   * 清除所有事件监听器
   */
  clear() {
    this.events.clear();
  }

  /**
   * 获取事件监听器数量
   * @param {string} event - 事件名称
   * @returns {number} 监听器数量
   */
  listenerCount(event) {
    const callbacks = this.events.get(event);
    return callbacks ? callbacks.length : 0;
  }
}