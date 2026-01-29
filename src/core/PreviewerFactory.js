/**
 * PreviewerFactory - 预览器工厂
 * 负责根据文件类型创建对应的预览器实例
 */

class PreviewerError extends Error {
  constructor(code, message, details) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = 'PreviewerError';
  }
}

class PreviewerFactory {
  constructor() {
    this._previewers = new Map(); // fileType -> previewerClass
    this._instances = new WeakMap(); // 预览器实例跟踪
  }

  /**
   * 注册预览器类型
   * @param {string} fileType - 文件类型（如 'xlsx', 'pdf'）
   * @param {class} previewerClass - 预览器类
   */
  register(fileType, previewerClass) {
    if (!fileType || typeof fileType !== 'string') {
      throw new PreviewerError('INVALID_TYPE', 'File type must be a non-empty string');
    }
    if (typeof previewerClass !== 'function' || !previewerClass.prototype) {
      throw new PreviewerError('INVALID_CLASS', 'PreviewerClass must be a constructor function');
    }
    
    this._previewers.set(fileType.toLowerCase(), previewerClass);
  }

  /**
   * 注销预览器类型
   * @param {string} fileType - 文件类型
   * @returns {boolean} 是否成功注销
   */
  unregister(fileType) {
    return this._previewers.delete(fileType.toLowerCase());
  }

  /**
   * 创建预览器实例
   * @param {string} fileType - 文件类型
   * @param {File} file - 文件对象
   * @param {HTMLElement} container - 容器元素
   * @returns {object} 预览器实例
   */
  create(fileType, file, container) {
    const normalizedType = fileType.toLowerCase();
    const PreviewerClass = this._previewers.get(normalizedType);

    if (!PreviewerClass) {
      const supported = Array.from(this._previewers.keys());
      throw new PreviewerError(
        'UNSUPPORTED_FILE_TYPE',
        `Unsupported file type: ${fileType}`,
        { supportedTypes: supported }
      );
    }

    try {
      const instance = new PreviewerClass(file, container);
      this._instances.set(instance, {
        type: normalizedType,
        createdAt: Date.now()
      });
      return instance;
    } catch (error) {
      throw new PreviewerError(
        'CREATE_FAILED',
        `Failed to create previewer for ${fileType}`,
        { originalError: error.message }
      );
    }
  }

  /**
   * 销毁预览器实例
   * @param {object} previewer - 预览器实例
   */
  destroy(previewer) {
    if (!previewer) {
      return;
    }

    try {
      // 调用预览器的destroy方法（如果存在）
      if (typeof previewer.destroy === 'function') {
        previewer.destroy();
      }
      
      // 移除跟踪
      this._instances.delete(previewer);
    } catch (error) {
      console.error('Error destroying previewer:', error);
    }
  }

  /**
   * 获取支持的文件类型列表
   * @returns {Array<string>} 文件类型数组
   */
  getSupportedTypes() {
    return Array.from(this._previewers.keys());
  }

  /**
   * 检查文件类型是否支持
   * @param {string} fileType - 文件类型
   * @returns {boolean} 是否支持
   */
  isSupported(fileType) {
    return this._previewers.has(fileType.toLowerCase());
  }

  /**
   * 清空所有注册的预览器
   */
  clear() {
    this._previewers.clear();
  }
}

// 导出单例实例
const factory = new PreviewerFactory();
export default factory;
export { PreviewerFactory, PreviewerError };
