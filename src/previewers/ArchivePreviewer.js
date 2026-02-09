/**
 * 压缩包预览器
 * 支持zip、7z、tar、rar、gzip、jar等压缩格式
 * 
 * @description 使用JSZip等库解析压缩包文件
 * @module ArchivePreviewer
 * @version 1.0.0
 */

// 导入JSZip库（将通过npm安装）
// import JSZip from 'jszip';

/**
 * 压缩包预览器类
 * @class ArchivePreviewer
 */
export class ArchivePreviewer {
  /**
   * 支持的压缩格式
   * @type {Array<string>}
   */
  static supportedFormats = ['zip', '7z', 'tar', 'rar', 'gzip', 'gz', 'jar'];

  /**
   * 创建压缩包预览器实例
   * @param {Object} options - 预览器选项
   * @param {EventBus} options.eventBus - 事件总线实例
   * @param {StateManager} options.stateManager - 状态管理器实例
   */
  constructor(options = {}) {
    this.eventBus = options.eventBus;
    this.stateManager = options.stateManager;
    this.files = [];
    this.currentFile = null;
    this.zip = null;
  }

  /**
   * 加载压缩包文件
   * @param {File} file - 文件对象
   * @returns {Promise<Object>} 加载结果
   */
  async load(file) {
    try {
      this.emitProgress(10);

      const ext = file.name.split('.').pop().toLowerCase();

      // TODO: 使用JSZip库解析压缩包
      // const arrayBuffer = await file.arrayBuffer();
      // this.zip = await JSZip.loadAsync(arrayBuffer);
      // 
      // 提取所有文件
      // this.files = [];
      // this.zip.forEach((relativePath, file) => {
      //   this.files.push({
      //     name: relativePath,
      //     file: file,
      //     dir: file.dir
      //   });
      // });

      this.emitProgress(50);

      // 模拟压缩包内容（临时实现）
      const mockFiles = this.mockZipParse(file.name, ext);
      this.files = mockFiles;
      this.currentFile = null;

      this.emitProgress(100);

      return {
        type: 'archive',
        ext,
        files: this.files,
        numFiles: this.files.length,
        totalSize: file.size
      };
    } catch (error) {
      this.emitError(error, 'Failed to load archive file');
      throw error;
    }
  }

  /**
   * 模拟Zip解析（临时实现）
   * @param {string} fileName - 文件名
   * @param {string} ext - 文件扩展名
   * @returns {Array<Object>} 文件列表
   */
  mockZipParse(fileName, ext) {
    // 实际实现中，这里会调用JSZip.loadAsync()
    return [
      {
        name: 'document.docx',
        size: 1024 * 50,
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        dir: false,
        date: '2024-01-15T10:30:00Z'
      },
      {
        name: 'presentation.pptx',
        size: 1024 * 30,
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        dir: false,
        date: '2024-01-15T10:35:00Z'
      },
      {
        name: 'spreadsheet.xlsx',
        size: 1024 * 40,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dir: false,
        date: '2024-01-15T10:40:00Z'
      },
      {
        name: 'image.jpg',
        size: 1024 * 100,
        type: 'image/jpeg',
        dir: false,
        date: '2024-01-15T10:45:00Z'
      },
      {
        name: 'data/',
        dir: true,
        size: 0
      },
      {
        name: 'data/config.json',
        size: 1024 * 5,
        type: 'application/json',
        dir: false,
        date: '2024-01-15T10:50:00Z'
      },
      {
        name: 'data/readme.txt',
        size: 1024 * 2,
        type: 'text/plain',
        dir: false,
        date: '2024-01-15T10:55:00Z'
      }
    ];
  }

  /**
   * 渲染压缩包预览
   * @param {HTMLElement} container - 容器元素
   * @param {Object} data - 加载的数据
   * @returns {Promise<void>}
   */
  async render(container, data) {
    if (!container) {
      throw new Error('Container is required');
    }

    try {
      container.innerHTML = '';

      const wrapper = document.createElement('div');
      wrapper.className = 'archive-preview';

      // 文件列表
      const fileList = this.createFileList(data.files);
      wrapper.appendChild(fileList);

      // 文件详情
      const fileDetail = this.createFileDetail();
      wrapper.appendChild(fileDetail);

      container.appendChild(wrapper);

      this.emitLoaded();
    } catch (error) {
      this.emitError(error, 'Failed to render archive file');
      throw error;
    }
  }

  /**
   * 创建文件列表
   * @param {Array} files - 文件数组
   * @returns {HTMLElement} 文件列表元素
   */
  createFileList(files) {
    const container = document.createElement('div');
    container.className = 'archive-file-list';

    // 表头
    const header = document.createElement('div');
    header.className = 'archive-file-list__header';

    const columns = ['Name', 'Size', 'Type', 'Date'];
    const flexWidths = ['40%', '20%', '20%', '20%'];

    columns.forEach((col, index) => {
      const th = document.createElement('div');
      th.className = 'archive-file-list__header-cell';
      th.style.flex = flexWidths[index];
      th.textContent = col;
      header.appendChild(th);
    });

    container.appendChild(header);

    // 文件行
    const body = document.createElement('div');
    body.className = 'archive-file-list__body';

    files.forEach((file, index) => {
      const row = document.createElement('div');
      row.className = `archive-file-list__row${index % 2 === 0 ? ' even' : ' odd'}`;
      row.dataset.index = index;

      // 名称
      const nameCell = document.createElement('div');
      nameCell.className = 'archive-file-list__cell';
      nameCell.style.flex = flexWidths[0];
      nameCell.textContent = this.getFileName(file);
      row.appendChild(nameCell);

      // 大小
      const sizeCell = document.createElement('div');
      sizeCell.className = 'archive-file-list__cell';
      sizeCell.style.flex = flexWidths[1];
      sizeCell.textContent = this.formatFileSize(file.size);
      row.appendChild(sizeCell);

      // 类型
      const typeCell = document.createElement('div');
      typeCell.className = 'archive-file-list__cell';
      typeCell.style.flex = flexWidths[2];
      typeCell.textContent = this.getFileType(file);
      row.appendChild(typeCell);

      // 日期
      const dateCell = document.createElement('div');
      dateCell.className = 'archive-file-list__cell';
      dateCell.style.flex = flexWidths[3];
      dateCell.textContent = this.formatDate(file.date);
      row.appendChild(dateCell);

      row.addEventListener('click', () => {
        this.selectFile(file);
      });

      body.appendChild(row);
    });

    container.appendChild(header);
    container.appendChild(body);

    return container;
  }

  /**
   * 获取文件显示名称
   * @param {Object} file - 文件对象
   * @returns {string} 显示名称
   */
  getFileName(file) {
    const icon = this.getFileIcon(file);
    return `${icon} ${file.name}`;
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
      'docx': '📄',
      'doc': '📄',
      'xlsx': '📊',
      'xls': '📊',
      'pptx': '📽',
      'ppt': '📽',
      'pdf': '📑',
      'jpg': '🖼️',
      'jpeg': '🖼️',
      'png': '🖼️',
      'gif': '🖼️',
      'zip': '📦',
      'rar': '📦',
      'txt': '📃',
      'md': '📃',
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
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 获取文件类型
   * @param {Object} file - 文件对象
   * @returns {string} 文件类型
   */
  getFileType(file) {
    if (file.dir) {
      return 'Folder';
    }

    const ext = file.name.split('.').pop();
    const typeMap = {
      'docx': 'Word Document',
      'doc': 'Word Document',
      'xlsx': 'Excel Spreadsheet',
      'xls': 'Excel Spreadsheet',
      'pptx': 'PowerPoint Presentation',
      'ppt': 'PowerPoint Presentation',
      'pdf': 'PDF Document',
      'jpg': 'JPEG Image',
      'jpeg': 'JPEG Image',
      'png': 'PNG Image',
      'gif': 'GIF Image',
      'txt': 'Plain Text',
      'md': 'Markdown',
      'json': 'JSON File',
      'xml': 'XML File',
      'zip': 'ZIP Archive',
      'rar': 'RAR Archive'
    };

    return typeMap[ext] || 'File';
  }

  /**
   * 格式化日期
   * @param {string} date - 日期字符串
   * @returns {string} 格式化后的日期
   */
  formatDate(date) {
    if (!date) return '-';

    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  /**
   * 选择文件
   * @param {Object} file - 文件对象
   */
  selectFile(file) {
    if (file.dir) {
      return;
    }

    this.currentFile = file;

    // 更新文件详情
    const fileDetail = document.querySelector('.archive-file-detail');
    if (fileDetail) {
      this.updateFileDetail(file, fileDetail);
    }

    // 高亮选中行
    const allRows = document.querySelectorAll('.archive-file-list__row');
    allRows.forEach(row => {
      row.classList.remove('selected');
    });

    const selectedRow = document.querySelector(`[data-index="${this.files.indexOf(file)}"]`);
    if (selectedRow) {
      selectedRow.classList.add('selected');
    }
  }

  /**
   * 创建文件详情
   * @returns {HTMLElement} 文件详情元素
   */
  createFileDetail() {
    const detail = document.createElement('div');
    detail.className = 'archive-file-detail';
    detail.innerHTML = '<div class="archive-file-detail__empty">Select a file to view details</div>';
    return detail;
  }

  /**
   * 更新文件详情
   * @param {Object} file - 文件对象
   * @param {HTMLElement} detail - 详情元素
   */
  updateFileDetail(file, detail) {
    const icon = this.getFileIcon(file);
    const ext = file.name.split('.').pop().toLowerCase();

    detail.innerHTML = `
      <div class="archive-file-detail__icon">${icon}</div>
      <div class="archive-file-detail__info">
        <div class="archive-file-detail__name">${file.name}</div>
        <div class="archive-file-detail__meta">
          <span class="archive-file-detail__type">${this.getFileType(file)}</span>
          <span class="archive-file-detail__size">${this.formatFileSize(file.size)}</span>
        </div>
        <div class="archive-file-detail__date">Modified: ${this.formatDate(file.date)}</div>
      </div>
    `;

    // 添加下载按钮（TODO：实现下载功能）
    const actions = document.createElement('div');
    actions.className = 'archive-file-detail__actions';

    const downloadButton = document.createElement('button');
    downloadButton.className = 'archive-file-detail__button';
    downloadButton.textContent = 'Download';
    downloadButton.addEventListener('click', () => {
      this.triggerCallback('file:download', file);
    });

    actions.appendChild(downloadButton);
    detail.appendChild(actions);
  }

  /**
   * 获取总页数
   * @returns {number} 总页数（压缩包为1）
   */
  getTotalPages() {
    return 1;
  }

  /**
   * 获取当前页码
   * @returns {number} 当前页码（压缩包为1）
   */
  getCurrentPage() {
    return 1;
  }

  /**
   * 触发回调
   * @param {string} event - 事件名称
   * @param {*} data - 事件数据
   */
  triggerCallback(event, data) {
    if (this.eventBus) {
      this.eventBus.emit(event, data);
    }
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
    this.files = [];
    this.currentFile = null;
    if (this.zip) {
      this.zip = null;
    }
  }
}