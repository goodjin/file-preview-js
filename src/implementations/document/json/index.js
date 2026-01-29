/**
 * JSON模块入口
 * 导出JSON预览器
 */
import JSONPreviewer from './JSONPreviewer.js';

/**
 * 创建JSON预览器实例
 * @param {Object} options - 配置选项
 * @returns {JSONPreviewer} JSON预览器实例
 */
export function createJSONPreviewer(options) {
  return new JSONPreviewer(options);
}

/**
 * 导出JSON预览器类
 */
export { default as JSONPreviewer } from './JSONPreviewer.js';

/**
 * 模块信息
 */
export const moduleInfo = {
  name: 'JSON预览器',
  version: '1.0.0',
  supportedFormats: ['json', 'application/json'],
  features: [
    'JSON格式化显示',
    '语法高亮',
    '折叠/展开节点',
    '滚动查看',
    '错误提示'
  ]
};
