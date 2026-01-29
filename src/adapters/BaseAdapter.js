/**
 * BaseAdapter - 基础适配器类
 * 
 * 定义适配器的通用方法和接口，所有具体适配器都应该继承此类
 */

class BaseAdapter {
  constructor() {
    if (new.target === BaseAdapter) {
      throw new Error('BaseAdapter is abstract and cannot be instantiated directly');
    }
  }

  /**
   * 判断是否能处理该文件类型
   * @abstract
   * @param {string} fileType - 文件类型
   * @returns {boolean} 是否支持
   */
  canHandle(fileType) {
    throw new Error('canHandle method must be implemented by subclass');
  }

  /**
   * 解析文件
   * @abstract
   * @param {File} file - 文件对象
   * @returns {Promise<Object>} 解析后的数据
   */
  async parse(file) {
    throw new Error('parse method must be implemented by subclass');
  }

  /**
   * 渲染数据
   * @abstract
   * @param {Object} data - 解析后的数据
   * @returns {HTMLElement|string} 渲染结果
   */
  render(data) {
    throw new Error('render method must be implemented by subclass');
  }

  /**
   * 获取支持的文件类型列表
   * @abstract
   * @returns {string[]} 支持的文件类型数组
   */
  getSupportedTypes() {
    throw new Error('getSupportedTypes method must be implemented by subclass');
  }

  /**
   * 验证文件
   * @param {File} file - 文件对象
   * @returns {boolean} 文件是否有效
   */
  validateFile(file) {
    if (!file) {
      throw new Error('File is required');
    }
    if (!(file instanceof File)) {
      throw new Error('Invalid file object');
    }
    return true;
  }

  /**
   * 获取文件扩展名
   * @param {string} fileName - 文件名
   * @returns {string} 文件扩展名
   */
  getFileExtension(fileName) {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
  }
}

export default BaseAdapter;
