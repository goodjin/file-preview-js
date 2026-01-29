/**
 * Office模块主入口
 * 提供Office文件预览功能的统一访问接口
 */

import OfficeAdapter from './OfficeAdapter.js';

/**
 * 创建Office预览器实例
 * @param {Object} options - 配置选项
 * @returns {OfficeAdapter}
 */
export function createPreviewer(options = {}) {
  return new OfficeAdapter(options);
}

/**
 * 检测文件类型是否为Office格式
 * @param {string|File} file - 文件名或File对象
 * @returns {boolean}
 */
export function isOfficeFile(file) {
  if (!file) return false;
  
  const fileName = typeof file === 'string' ? file : file.name;
  const ext = fileName.split('.').pop().toLowerCase();
  
  return OfficeAdapter.getSupportedTypes().includes(ext);
}

/**
 * 获取支持的Office文件类型列表
 * @returns {string[]}
 */
export function getSupportedTypes() {
  return OfficeAdapter.getSupportedTypes();
}

/**
 * 获取文件类型的显示名称
 * @param {string} fileType - 文件扩展名
 * @returns {string}
 */
export function getFileTypeName(fileType) {
  const typeMap = {
    'doc': 'Microsoft Word 97-2003 文档',
    'docx': 'Microsoft Word 文档',
    'xls': 'Microsoft Excel 97-2003 工作簿',
    'xlsx': 'Microsoft Excel 工作簿',
    'csv': '逗号分隔值文件',
    'ppt': 'Microsoft PowerPoint 97-2003 演示文稿',
    'pptx': 'Microsoft PowerPoint 演示文稿'
  };
  
  return typeMap[fileType.toLowerCase()] || 'Office 文件';
}

/**
 * 获取文件类型的图标配置
 * @param {string} fileType - 文件扩展名
 * @returns {Object} { name, color }
 */
export function getFileTypeIcon(fileType) {
  const ext = fileType.toLowerCase();
  
  const iconMap = {
    'doc': { name: 'word', color: '#D04424' },
    'docx': { name: 'word', color: '#D04424' },
    'xls': { name: 'excel', color: '#217346' },
    'xlsx': { name: 'excel', color: '#217346' },
    'csv': { name: 'excel', color: '#217346' },
    'ppt': { name: 'powerpoint', color: '#D24726' },
    'pptx': { name: 'powerpoint', color: '#D24726' }
  };
  
  return iconMap[ext] || { name: 'file', color: '#6B7280' };
}

/**
 * 获取模块版本信息
 * @returns {Object}
 */
export function getVersion() {
  return {
    name: 'office-preview',
    version: '0.1.0',
    phase: 'P0',
    supportedFormats: ['docx', 'xlsx', 'pptx'],
    allFormats: OfficeAdapter.getSupportedTypes()
  };
}

/**
 * 导出OfficeAdapter类
 */
export { OfficeAdapter, OfficeAdapter as default };
export { PreviewError } from './OfficeAdapter.js';
