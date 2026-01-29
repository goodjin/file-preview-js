/**
 * FileUploadComponent - 文件上传组件
 * 负责文件上传界面，提供文件选择和拖拽上传功能
 */
class FileUploadComponent {
  /**
   * 构造函数
   * @param {HTMLElement} container - 容器元素
   * @param {Object} options - 配置选项
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      accept: [],
      maxSize: 100 * 1024 * 1024,
      multiple: false,
      dragable: true,
      showProgress: true,
      autoUpload: false,
      acceptText: '支持 45 种文件格式',
      maxSizeText: '最大 100MB',
      ...options
    };

    this.selectedFiles = [];
    this.eventListeners = {};
    this.elements = {};
    this.isDragging = false;

    this._init();
  }

  /**
   * 初始化组件
   * @private
   */
  _init() {
    this._render();
    this._bindEvents();
  }

  /**
   * 渲染组件DOM
   * @private
   */
  _render() {
    // 主容器
    const uploadContainer = document.createElement('div');
    uploadContainer.className = 'file-upload-container';
    uploadContainer.setAttribute('data-component', 'file-upload');

    // 文件输入框（隐藏）
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.className = 'file-input';
    fileInput.style.display = 'none';
    if (this.options.multiple) {
      fileInput.multiple = true;
    }
    if (this.options.accept.length > 0) {
      fileInput.accept = this.options.accept.join(',');
    }
    uploadContainer.appendChild(fileInput);
    this.elements.fileInput = fileInput;

    // 拖拽上传区域
    const uploadZone = document.createElement('div');
    uploadZone.className = 'file-upload-zone';

    const uploadIcon = document.createElement('div');
    uploadIcon.className = 'upload-icon';
    uploadIcon.innerHTML = '📁';
    uploadZone.appendChild(uploadIcon);

    const uploadText = document.createElement('div');
    uploadText.className = 'upload-text';
    uploadText.textContent = '点击或拖拽上传文件';
    uploadZone.appendChild(uploadText);

    const uploadHint = document.createElement('div');
    uploadHint.className = 'upload-hint';
    uploadHint.textContent = `${this.options.acceptText}，${this.options.maxSizeText}`;
    uploadZone.appendChild(uploadHint);

    uploadContainer.appendChild(uploadZone);
    this.elements.uploadZone = uploadZone;

    // 文件列表区域
    const fileList = document.createElement('div');
    fileList.className = 'file-list';
    fileList.style.display = 'none';
    uploadContainer.appendChild(fileList);
    this.elements.fileList = fileList;

    this.container.appendChild(uploadContainer);
    this.elements.uploadContainer = uploadContainer;
  }

  /**
   * 绑定事件
   * @private
   */
  _bindEvents() {
    // 上传区域点击事件
    this.elements.uploadZone.addEventListener('click', () => {
      this.elements.fileInput.click();
    });

    // 文件选择事件
    this.elements.fileInput.addEventListener('change', (e) => {
      this._handleFileSelect(e.target.files);
    });

    // 拖拽事件
    if (this.options.dragable) {
      this._bindDragEvents();
    }
  }

  /**
   * 绑定拖拽事件
   * @private
   */
  _bindDragEvents() {
    const uploadZone = this.elements.uploadZone;

    uploadZone.addEventListener('dragenter', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.isDragging = true;
      uploadZone.classList.add('file-upload-zone--dragging');
      this.emit('dragEnter', e);
    });

    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    uploadZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.target === uploadZone) {
        this.isDragging = false;
        uploadZone.classList.remove('file-upload-zone--dragging');
        this.emit('dragLeave', e);
      }
    });

    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.isDragging = false;
      uploadZone.classList.remove('file-upload-zone--dragging');

      const files = e.dataTransfer.files;
      this._handleFileSelect(files);
      this.emit('dragDrop', e);
    });
  }

  /**
   * 处理文件选择
   * @private
   * @param {FileList} files - 文件列表
   */
  _handleFileSelect(files) {
    const validFiles = [];

    Array.from(files).forEach(file => {
      // 验证文件类型
      if (this.options.accept.length > 0) {
        const fileExt = this._getFileExtension(file.name).toLowerCase();
        const acceptExts = this.options.accept.map(ext => ext.replace('.', '').toLowerCase());
        if (!acceptExts.includes(fileExt) && !acceptExts.includes(fileExt.substring(1))) {
          this.emit('uploadError', {
            file,
            message: `不支持的文件类型: ${fileExt}`
          });
          return;
        }
      }

      // 验证文件大小
      if (file.size > this.options.maxSize) {
        this.emit('uploadError', {
          file,
          message: `文件大小超过限制: ${this._formatFileSize(this.options.maxSize)}`
        });
        return;
      }

      validFiles.push(file);
    });

    if (validFiles.length > 0) {
      if (this.options.multiple) {
        this.selectedFiles = [...this.selectedFiles, ...validFiles];
      } else {
        this.selectedFiles = validFiles;
      }

      this._updateFileList();
      this.emit('fileSelect', validFiles);

      // 自动上传
      if (this.options.autoUpload) {
        this._startUpload();
      }
    }
  }

  /**
   * 更新文件列表
   * @private
   */
  _updateFileList() {
    const fileList = this.elements.fileList;

    if (this.selectedFiles.length === 0) {
      fileList.style.display = 'none';
      fileList.innerHTML = '';
      return;
    }

    fileList.style.display = 'block';
    fileList.innerHTML = '';

    this.selectedFiles.forEach((file, index) => {
      const fileItem = this._createFileItem(file, index);
      fileList.appendChild(fileItem);
    });
  }

  /**
   * 创建文件项
   * @private
   * @param {File} file - 文件对象
   * @param {number} index - 索引
   * @returns {HTMLElement}
   */
  _createFileItem(file, index) {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.dataset.index = index;

    // 文件图标
    const fileIcon = document.createElement('div');
    fileIcon.className = 'file-item__icon';
    fileIcon.innerHTML = this._getFileIcon(file.type);
    fileItem.appendChild(fileIcon);

    // 文件信息
    const fileInfo = document.createElement('div');
    fileInfo.className = 'file-item__info';

    const fileName = document.createElement('div');
    fileName.className = 'file-item__name';
    fileName.textContent = file.name;
    fileName.title = file.name;
    fileInfo.appendChild(fileName);

    const fileSize = document.createElement('div');
    fileSize.className = 'file-item__size';
    fileSize.textContent = this._formatFileSize(file.size);
    fileInfo.appendChild(fileSize);

    fileItem.appendChild(fileInfo);

    // 进度条
    if (this.options.showProgress) {
      const progress = document.createElement('div');
      progress.className = 'file-item__progress';
      progress.style.display = 'none';

      const progressBar = document.createElement('div');
      progressBar.className = 'file-item__progress-bar';
      progress.appendChild(progressBar);

      const progressText = document.createElement('div');
      progressText.className = 'file-item__progress-text';
      progressText.textContent = '0%';
      progress.appendChild(progressText);

      fileItem.appendChild(progress);
    }

    // 删除按钮
    const removeBtn = document.createElement('button');
    removeBtn.className = 'file-item__remove';
    removeBtn.innerHTML = '×';
    removeBtn.title = '移除文件';
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._removeFile(index);
    });
    fileItem.appendChild(removeBtn);

    return fileItem;
  }

  /**
   * 获取文件图标
   * @private
   * @param {string} mimeType - MIME类型
   * @returns {string}
   */
  _getFileIcon(mimeType) {
    if (mimeType.startsWith('image/')) {
      return '🖼️';
    } else if (mimeType === 'application/pdf') {
      return '📕';
    } else if (mimeType.includes('word')) {
      return '📘';
    } else if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
      return '📗';
    } else if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) {
      return '📙';
    } else if (mimeType.startsWith('text/')) {
      return '📄';
    } else if (mimeType.startsWith('audio/')) {
      return '🎵';
    } else if (mimeType.startsWith('video/')) {
      return '🎬';
    } else {
      return '📁';
    }
  }

  /**
   * 移除文件
   * @private
   * @param {number} index - 文件索引
   */
  _removeFile(index) {
    const file = this.selectedFiles[index];
    this.selectedFiles.splice(index, 1);
    this._updateFileList();
    this.emit('fileRemove', { file, index });
  }

  /**
   * 开始上传
   * @private
   */
  _startUpload() {
    this.selectedFiles.forEach((file, index) => {
      this._uploadFile(file, index);
    });
  }

  /**
   * 上传单个文件
   * @private
   * @param {File} file - 文件对象
   * @param {number} index - 文件索引
   */
  _uploadFile(file, index) {
    this.emit('uploadStart', { file, index });

    // 模拟上传进度（实际项目中应该是真正的上传逻辑）
    const fileItem = this.elements.fileList.querySelector(`[data-index="${index}"]`);
    const progressBar = fileItem?.querySelector('.file-item__progress-bar');
    const progressText = fileItem?.querySelector('.file-item__progress-text');
    const progressContainer = fileItem?.querySelector('.file-item__progress');

    if (progressContainer) {
      progressContainer.style.display = 'block';
    }

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);

        if (progressBar) {
          progressBar.style.width = '100%';
        }
        if (progressText) {
          progressText.textContent = '100%';
        }

        this.emit('uploadSuccess', { file, index });
      } else {
        if (progressBar) {
          progressBar.style.width = `${progress}%`;
        }
        if (progressText) {
          progressText.textContent = `${Math.round(progress)}%`;
        }

        this.emit('uploadProgress', { file, index, progress });
      }
    }, 200);
  }

  /**
   * 设置接受文件类型
   * @param {Array<string>} accept - 文件类型列表
   */
  setAccept(accept) {
    this.options.accept = accept || [];

    // 更新输入框的accept属性
    if (this.elements.fileInput) {
      this.elements.fileInput.accept = this.options.accept.join(',');
    }

    // 更新提示文字
    const uploadHint = this.elements.uploadZone?.querySelector('.upload-hint');
    if (uploadHint) {
      uploadHint.textContent = `${this.options.acceptText}，${this.options.maxSizeText}`;
    }
  }

  /**
   * 设置最大文件大小
   * @param {number} maxSize - 最大文件大小（字节）
   */
  setMaxSize(maxSize) {
    this.options.maxSize = maxSize;

    // 更新提示文字
    const uploadHint = this.elements.uploadZone?.querySelector('.upload-hint');
    if (uploadHint) {
      uploadHint.textContent = `${this.options.acceptText}，${this._formatFileSize(maxSize)}`;
    }
  }

  /**
   * 清空文件列表
   */
  clear() {
    this.selectedFiles = [];
    this._updateFileList();
  }

  /**
   * 获取已选文件
   * @returns {Array<File>}
   */
  getFiles() {
    return [...this.selectedFiles];
  }

  /**
   * 获取文件扩展名
   * @private
   * @param {string} filename - 文件名
   * @returns {string}
   */
  _getFileExtension(filename) {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop() : '';
  }

  /**
   * 格式化文件大小
   * @private
   * @param {number} bytes - 字节数
   * @returns {string}
   */
  _formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * 事件监听
   * @param {string} event - 事件名称
   * @param {Function} handler - 事件处理函数
   */
  on(event, handler) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(handler);
  }

  /**
   * 移除事件监听
   * @param {string} event - 事件名称
   * @param {Function} handler - 事件处理函数
   */
  off(event, handler) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(h => h !== handler);
    }
  }

  /**
   * 触发事件
   * @private
   * @param {string} event - 事件名称
   * @param {*} data - 事件数据
   */
  emit(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(handler => handler(data));
    }
  }

  /**
   * 销毁组件
   */
  destroy() {
    // 移除DOM元素
    if (this.elements.uploadContainer && this.elements.uploadContainer.parentNode) {
      this.elements.uploadContainer.parentNode.removeChild(this.elements.uploadContainer);
    }

    this.eventListeners = {};
    this.elements = {};
    this.selectedFiles = [];
    this.emit('destroy');
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FileUploadComponent;
}
