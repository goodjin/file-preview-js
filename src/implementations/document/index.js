/**
 * 文档预览模块
 * 提供多种文档格式的预览功能
 */

// 导出基类
export { default as DocumentPreviewer } from './DocumentPreviewer.js';

// 导出PDF预览模块
export {
  default as PDFPreviewer,
  createPDFPreviewer,
  isPDFFile,
  moduleInfo as PDFModuleInfo
} from './pdf/index.js';

// 导出工具函数
export { default as FileUtils } from './utils/FileUtils.js';
export { default as PageUtils } from './utils/PageUtils.js';

/**
 * 模块信息
 */
export const moduleInfo = {
  name: 'Document Previewer',
  version: '1.0.0',
  description: '多格式文档预览功能',
  supportedFormats: ['pdf', 'txt', 'md', 'json', 'xml', 'rtf', 'epub', 'ofd'],
  features: [
    'PDF预览（已实现）',
    'TXT预览（待实现）',
    'MD预览（待实现）',
    'JSON预览（待实现）',
    'XML预览（待实现）',
    'RTF预览（待实现）',
    'EPUB预览（待实现）',
    'OFD预览（待实现）'
  ]
};

/**
 * 根据文件类型创建预览器
 * @param {File} file - 文件对象
 * @param {Object} options - 配置选项
 * @returns {DocumentPreviewer|PDFPreviewer|null} 预览器实例
 */
export async function createPreviewer(file, options) {
  const extension = file.name.split('.').pop().toLowerCase();
  
  switch (extension) {
    case 'pdf':
      const { createPDFPreviewer } = await import('./pdf/index.js');
      return createPDFPreviewer(options);
    // 其他格式待实现
    default:
      return null;
  }
}

/**
 * 检查文件类型是否支持
 * @param {File} file - 文件对象
 * @returns {boolean}
 */
export function isSupported(file) {
  const extension = file.name.split('.').pop().toLowerCase();
  return moduleInfo.supportedFormats.includes(extension);
}
