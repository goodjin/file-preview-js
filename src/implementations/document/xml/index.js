/**
 * XML预览模块入口文件
 * 导出XMLPreviewer类供外部使用
 */

import XMLPreviewer from './XMLPreviewer.js';

/**
 * 创建XML预览器实例
 * @param {Object} options - 配置选项
 * @param {HTMLElement} options.container - 容器元素
 * @param {Object} options.fileInfo - 文件信息
 * @param {Function} options.onLoad - 加载完成回调
 * @param {Function} options.onError - 错误回调
 * @param {Function} options.onProgress - 进度回调
 * @returns {XMLPreviewer} XML预览器实例
 */
export function createXMLPreviewer(options) {
  return new XMLPreviewer(options);
}

/**
 * 获取XML预览器类
 * @returns {XMLPreviewer} XML预览器类
 */
export function getXMLPreviewerClass() {
  return XMLPreviewer;
}

export default XMLPreviewer;
