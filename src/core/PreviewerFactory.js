/**
 * 预览器工厂
 * 根据文件类型创建对应的预览器实例
 * 
 * @description 使用工厂模式创建预览器实例
 * @module PreviewerFactory
 * @version 1.0.0
 */

import { FileTypeDetector } from './FileTypeDetector.js';

/**
 * 预览器注册表
 * @type {Map<string, Class>}
 */
const previewerRegistry = new Map();

/**
 * 预览器工厂类
 * @class PreviewerFactory
 */
export class PreviewerFactory {
  /**
   * 创建预览器实例
   * @param {File} file - 文件对象
   * @param {Object} options - 预览选项
   * @param {EventBus} options.eventBus - 事件总线实例
   * @param {StateManager} options.stateManager - 状态管理器实例
   * @param {HTMLElement} options.container - 容器元素
   * @returns {Object} 预览器实例
   * @throws {Error} 当文件类型不支持时抛出异常
   */
  static create(file, options = {}) {
    // 检测文件类型
    const fileType = FileTypeDetector.detect(file);
    
    // 检查是否支持该文件类型
    if (!FileTypeDetector.isSupported(fileType)) {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
    
    // 获取预览器类
    const PreviewerClass = this.getPreviewerClass(fileType);
    
    // 创建预览器实例
    const previewer = new PreviewerClass(options);
    
    return previewer;
  }

  /**
   * 根据文件类型获取预览器类
   * @param {string} fileType - 文件类型
   * @returns {Class} 预览器类
   * @throws {Error} 当未注册预览器时抛出异常
   */
  static getPreviewerClass(fileType) {
    const PreviewerClass = previewerRegistry.get(fileType);
    
    if (!PreviewerClass) {
      throw new Error(`No previewer registered for file type: ${fileType}`);
    }
    
    return PreviewerClass;
  }

  /**
   * 注册新的预览器类型
   * @param {string} fileType - 文件类型
   * @param {Class} PreviewerClass - 预览器类
   */
  static register(fileType, PreviewerClass) {
    if (!FileTypeDetector.isSupported(fileType)) {
      throw new Error(`Cannot register previewer for unsupported file type: ${fileType}`);
    }
    
    previewerRegistry.set(fileType, PreviewerClass);
  }

  /**
   * 批量注册预览器
   * @param {Object} previewerMap - 预览器映射对象 { fileType: PreviewerClass }
   */
  static registerMultiple(previewerMap) {
    Object.entries(previewerMap).forEach(([fileType, PreviewerClass]) => {
      this.register(fileType, PreviewerClass);
    });
  }

  /**
   * 取消注册预览器
   * @param {string} fileType - 文件类型
   */
  static unregister(fileType) {
    previewerRegistry.delete(fileType);
  }

  /**
   * 检查是否已注册预览器
   * @param {string} fileType - 文件类型
   * @returns {boolean} 是否已注册
   */
  static isRegistered(fileType) {
    return previewerRegistry.has(fileType);
  }

  /**
   * 获取所有已注册的文件类型
   * @returns {Array<string>} 文件类型列表
   */
  static getRegisteredTypes() {
    return Array.from(previewerRegistry.keys());
  }

  /**
   * 清除所有注册的预览器
   */
  static clear() {
    previewerRegistry.clear();
  }
}