/**
 * 适配器基类
 * 所有适配器必须继承此类
 * 
 * @description 定义适配器的统一接口
 * @module BaseAdapter
 * @version 1.0.0
 */

/**
 * 适配器基类
 * @class BaseAdapter
 */
export class BaseAdapter {
  /**
   * 创建适配器实例
   * @param {Object} options - 适配器选项
   * @param {EventBus} options.eventBus - 事件总线实例
   * @param {StateManager} options.stateManager - 状态管理器实例
   */
  constructor(options = {}) {
    this.eventBus = options.eventBus;
    this.stateManager = options.stateManager;
    this.container = options.container;
  }

  /**
   * 检查是否支持该文件类型（静态方法）
   * @param {string} fileType - 文件类型
   * @returns {boolean} 是否支持
   * @throws {Error} 子类必须实现此方法
   */
  static supports(fileType) {
    throw new Error('Method must be implemented by subclass');
  }

  /**
   * 加载文件
   * @param {File} file - 文件对象
   * @returns {Promise<Object>} 加载结果
   * @throws {Error} 子类必须实现此方法
   */
  async load(file) {
    throw new Error('Method must be implemented by subclass');
  }

  /**
   * 渲染预览
   * @param {HTMLElement} container - 容器元素
   * @param {Object} data - 加载的数据
   * @returns {Promise<void>}
   * @throws {Error} 子类必须实现此方法
   */
  async render(container, data) {
    throw new Error('Method must be implemented by subclass');
  }

  /**
   * 销毁预览器
   * 清理资源和事件监听
   */
  destroy() {
    // 清理容器
    if (this.container) {
      this.container.innerHTML = '';
    }

    // 子类可以覆盖此方法进行额外的清理
  }

  /**
   * 触发加载进度事件
   * @param {number} progress - 进度（0-100）
   */
  emitProgress(progress) {
    if (this.eventBus) {
      this.eventBus.emit('file:load:progress', { progress });
    }
  }

  /**
   * 触发错误事件
   * @param {Error} error - 错误对象
   * @param {string} message - 错误消息
   */
  emitError(error, message) {
    if (this.eventBus) {
      this.eventBus.emit('file:load:error', { error, message });
    }
  }

  /**
   * 触发文件加载完成事件
   */
  emitLoaded() {
    if (this.eventBus) {
      this.eventBus.emit('file:loaded', {});
    }
  }
}