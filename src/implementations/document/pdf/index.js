import PDFPreviewer from './PDFPreviewer.js';

/**
 * PDF预览模块
 * 提供PDF文件预览功能
 */

/**
 * 创建PDF预览器实例
 * @param {Object} options - 配置选项
 * @param {HTMLElement} options.container - 容器元素
 * @param {Object} options.fileInfo - 文件信息
 * @param {Function} options.onLoad - 加载完成回调
 * @param {Function} options.onError - 错误回调
 * @param {Function} options.onProgress - 进度回调
 * @returns {PDFPreviewer} PDF预览器实例
 */
export function createPDFPreviewer(options) {
  return new PDFPreviewer(options);
}

/**
 * 检查文件是否为PDF
 * @param {File} file - 文件对象
 * @returns {boolean}
 */
export function isPDFFile(file) {
  return file.type === 'application/pdf' || 
         file.name.toLowerCase().endsWith('.pdf');
}

/**
 * 导出PDF预览器类
 */
export { PDFPreviewer as default };

/**
 * 模块信息
 */
export const moduleInfo = {
  name: 'PDF Previewer',
  version: '1.0.0',
  description: '基于PDF.js的PDF文件预览功能',
  supportedFormats: ['pdf'],
  features: [
    '缩放控制（25%-400%）',
    '翻页控制',
    '滚动查看',
    '加载进度显示',
    '错误提示'
  ]
};
