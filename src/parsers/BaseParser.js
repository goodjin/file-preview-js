/**
 * 基础解析器类
 * 定义所有解析器的通用接口
 */
export class BaseParser {
  /**
   * 解析文件内容
   * @param {ArrayBuffer} fileData - 文件二进制数据
   * @returns {Promise<Object>} 解析结果
   */
  async parse(fileData) {
    throw new Error('parse方法必须由子类实现');
  }

  /**
   * 验证文件格式
   * @param {ArrayBuffer} fileData - 文件二进制数据
   * @returns {boolean} 是否有效
   */
  validate(fileData) {
    throw new Error('validate方法必须由子类实现');
  }

  /**
   * 获取文件元数据
   * @param {ArrayBuffer} fileData - 文件二进制数据
   * @returns {Object} 元数据
   */
  getMetadata(fileData) {
    throw new Error('getMetadata方法必须由子类实现');
  }
}
