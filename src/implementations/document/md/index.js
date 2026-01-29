/**
 * Markdown预览模块入口文件
 */

import MDPreviewer from './MDPreviewer.js';

/**
 * 创建Markdown预览器实例
 * @param {Object} options - 配置选项
 * @param {HTMLElement} options.container - 容器元素
 * @param {Object} options.fileInfo - 文件信息
 * @param {Function} options.onLoad - 加载完成回调
 * @param {Function} options.onError - 错误回调
 * @param {Function} options.onProgress - 进度回调
 * @returns {MDPreviewer} Markdown预览器实例
 */
export function createMDPreviewer(options) {
  return new MDPreviewer(options);
}

/**
 * 模块信息
 */
export const moduleInfo = {
  name: 'Markdown Previewer',
  version: '1.0.0',
  description: 'Markdown文件预览模块，支持标准Markdown语法和代码高亮',
  supportedFormats: ['.md', '.markdown'],
  dependencies: [
    {
      name: 'marked.js',
      version: '^9.0.0',
      cdn: 'https://cdn.jsdelivr.net/npm/marked/lib/marked.min.js',
      optional: true
    },
    {
      name: 'highlight.js',
      version: '^11.0.0',
      cdn: 'https://cdn.jsdelivr.net/npm/highlight.js/lib/core.min.js',
      optional: true
    }
  ]
};

export default MDPreviewer;
