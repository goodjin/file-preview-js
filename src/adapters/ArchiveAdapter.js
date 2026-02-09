/**
 * 压缩包适配器
 * 支持：zip、rar、7z、tar、gzip、jar等压缩格式
 * 
 * @description 统一压缩包文件的预览接口
 * @module ArchiveAdapter
 * @version 1.0.0
 */

import { BaseAdapter } from './BaseAdapter.js';
import { FileTypeDetector } from '../core/FileTypeDetector.js';

/**
 * 压缩包适配器类
 * @class ArchiveAdapter
 * @extends BaseAdapter
 */
export class ArchiveAdapter extends BaseAdapter {
  /**
   * 支持的压缩格式列表
   * @type {Array<string>}
   */
  static supportedFormats = ['zip', 'rar', '7z', 'tar', 'gz', 'gzip', 'jar'];

  /**
   * 检查是否支持该文件类型
   * @param {string} fileType - 文件类型
   * @returns {boolean} 是否支持
   */
  static supports(fileType) {
    return this.supportedFormats.includes(fileType);
  }

  /**
   * 加载文件
   * @param {File} file - 文件对象
   * @returns {Promise<Object>} 加载结果
   */
  async load(file) {
    try {
      this.emitProgress(10);

      const ext = FileTypeDetector.getExtension(file.name);

      // TODO: 使用JSZip等库解析压缩包
      // const arrayBuffer = await file.arrayBuffer();
      // 
      // 对于zip/7z格式，使用JSZip
      // if (ext === 'zip' || ext === '7z') {
      //   const zip = await JSZip.loadAsync(arrayBuffer);
      //   // 解析文件列表
      //   const files = [];
      //   zip.forEach((relativePath, zipEntry) => {
      //     files.push({
      //       name: relativePath,
      //       file: zipEntry,
      //       dir: zipEntry.dir
      //     });
      //   });
      //   
      //   return {
      //     type: 'archive',
      //     ext,
      //     files,
      //     numFiles: files.length
      //   };
      // }
      // 
      // 对于rar格式，可能需要unrar.js或其他库
      // 对于tar/gz格式，可以使用node-tar或其他库

      this.emitProgress(50);

      // 模拟压缩包解析结果（临时实现）
      const mockResult = this.mockArchiveParse(file.name, ext);

      this.emitProgress(100);

      return mockResult;
    } catch (error) {
      this.emitError(error, 'Failed to load archive file');
      throw error;
    }
  }

  /**
   * 模拟压缩包解析（临时实现）
   * @param {string} fileName - 文件名
   * @param {string} ext - 文件扩展名
   * @returns {Object} 解析结果
   */
  mockArchiveParse(fileName, ext) {
    // 实际实现中，这里会调用相应的解析库
    const mockFiles = [
      {
        name: 'README.txt',
        size: 1024 * 2,
        type: 'text/plain',
        dir: false
      },
      {
        name: 'document.docx',
        size: 1024 * 25,
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        dir: false
      },
      {
        name: 'images/',
        dir: true,
        size: 0
      },
      {
        name: 'images/photo1.jpg',
        size: 1024 * 150,
        type: 'image/jpeg',
        dir: false
      },
      {
        name: 'images/photo2.png',
        size: 1024 * 200,
        type: 'image/png',
        dir: false
      },
      {
        name: 'data/',
        dir: true,
        size: 0
      },
      {
        name: 'data/config.json',
        size: 1024 * 3,
        type: 'application/json',
        dir: false
      }
    ];

    return {
      type: 'archive',
      ext,
      files: mockFiles,
      numFiles: mockFiles.length
    };
  }

  /**
   * 渲染预览
   * @param {HTMLElement} container - 容器元素
   * @param {Object} data - 加载的数据
   * @returns {Promise<void>}
   */
  async render(container, data) {
    if (!container) {
      throw new Error('Container is required');
    }

    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'archive-preview';

    // 文件列表
    const fileList = this.createFileList(data.files);
    wrapper.appendChild(fileList);

    // 文件统计
    const stats = this.createStats(data.files);
    wrapper.appendChild(stats);

    container.appendChild(wrapper);

    this.emitLoaded();
  }

  /**
   * 创建文件列表
   * @param {Array} files - 文件数组
   * @returns {HTMLElement} 文件列表元素
   */
  createFileList(files) {
    const container = document.createElement('div');
    container.className = 'archive-file-list';

    files.forEach((file, index) => {
      const item = document.createElement('div');
      item.className = `archive-file-item${file.dir ? ' directory' : ' file'}`;
      item.dataset.index = index;

      // 文件图标
      const icon = document.createElement('span');
      icon.className = 'archive-file-item__icon';
      icon.textContent = this.getFileIcon(file);
      item.appendChild(icon);

      // 文件名
      const name = document.createElement('span');
      name.className = 'archive-file-item__name';
      name.textContent = file.name;
      item.appendChild(name);

      // 文件信息
      if (!file.dir) {
        const info = document.createElement('span');
        info.className = 'archive-file-item__info';
        info.textContent = this.formatFileSize(file.size);
        item.appendChild(info);
      }

      container.appendChild(item);
    });

    return container;
  }

  /**
   * 创建文件统计
   * @param {Array} files - 文件数组
   * @returns {HTMLElement} 统计元素
   */
  createStats(files) {
    const stats = document.createElement('div');
    stats.className = 'archive-stats';

    const totalFiles = files.filter(f => !f.dir).length;
    const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
    const folders = files.filter(f => f.dir).length;

    stats.innerHTML = `
      <div class="archive-stats__item">
        <span class="archive-stats__label">Files:</span>
        <span class="archive-stats__value">${totalFiles}</span>
      </div>
      <div class="archive-stats__item">
        <span class="archive-stats__label">Folders:</span>
        <span class="archive-stats__value">${folders}</span>
      </div>
      <div class="archive-stats__item">
        <span class="archive-stats__label">Total Size:</span>
        <span class="archive-stats__value">${this.formatFileSize(totalSize)}</span>
      </div>
    `;

    return stats;
  }

  /**
   * 获取文件图标
   * @param {Object} file - 文件对象
   * @returns {string} 图标
   */
  getFileIcon(file) {
    if (file.dir) {
      return '📁';
    }

    const ext = file.name.split('.').pop().toLowerCase();
    const iconMap = {
      'txt': '📄',
      'docx': '📄',
      'doc': '📄',
      'pdf': '📑',
      'jpg': '🖼️',
      'jpeg': '🖼️',
      'png': '🖼️',
      'gif': '🖼️',
      'zip': '📦',
      'rar': '📦',
      'json': '📋',
      'xml': '📄'
    };

    return iconMap[ext] || '📄';
  }

  /**
   * 格式化文件大小
   * @param {number} bytes - 字节数
   * @returns {string} 格式化后的文件大小
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 触发加载进度事件
   * @param {number} progress - 进度（0-100）
   */
  emitProgress(progress) {
    if (this.eventBus) {
      this.eventBus.emit('file:load:progress', { progress });
    }
  }

  /**
   * 触发错误事件
   * @param {Error} error - 错误对象
   * @param {string} message - 错误消息
   */
  emitError(error, message) {
    if (this.eventBus) {
      this.eventBus.emit('file:load:error', { error, message });
    }
  }

  /**
   * 触发加载完成事件
   */
  emitLoaded() {
    if (this.eventBus) {
      this.eventBus.emit('file:loaded', {});
    }
  }

  /**
   * 销毁预览器
   */
  destroy() {
    // 清理容器
    const wrapper = document.querySelector('.archive-preview');
    if (wrapper) {
      wrapper.innerHTML = '';
    }
  }
}