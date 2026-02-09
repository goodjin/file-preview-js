/**
 * 文件上传组件
 * 支持文件选择和拖拽上传
 * 
 * @description 文件上传组件，支持拖拽和点击选择
 * @module FileUpload
 * @version 1.0.0
 */

/**
 * 文件上传类
 * @class FileUpload
 */
export class FileUpload {
  /**
   * 创建文件上传实例
   * @param {Object} options - 上传选项
   * @param {string} options.accept - 接受的文件类型
   * @param {number} options.maxSize - 最大文件大小（字节）
   * @param {boolean} options.multiple - 是否支持多文件
   * @param {boolean} options.dragable - 是否支持拖拽
   */
  constructor(options = {}) {
    this.accept = options.accept || '*';
    this.maxSize = options.maxSize || 100 * 1024 * 1024; // 100MB
    this.multiple = options.multiple || false;
    this.dragable = options.dragable !== false;
    
    this.callbacks = {};
    this.fileInput = null;
    this.isDragging = false;
    
    this.element = this.render();
    this.bindEvents();
  }

  /**
   * 渲染文件上传组件
   * @returns {HTMLElement} 上传组件元素
   */
  render() {
    const container = document.createElement('div');
    container.className = this.getClassName();
    
    // 创建隐藏的文件输入框
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.className = 'file-upload__input';
    fileInput.accept = this.accept;
    fileInput.multiple = this.multiple;
    fileInput.style.display = 'none';
    this.fileInput = fileInput;
    
    container.appendChild(fileInput);
    
    // 创建上传区域
    const uploadArea = document.createElement('div');
    uploadArea.className = 'file-upload__area';
    
    // 图标
    const icon = document.createElement('div');
    icon.className = 'file-upload__icon';
    icon.innerHTML = '📤';
    uploadArea.appendChild(icon);
    
    // 提示文字
    const text = document.createElement('div');
    text.className = 'file-upload__text';
    text.textContent = '点击或拖拽文件到此处';
    uploadArea.appendChild(text);
    
    // 提示信息
    const hint = document.createElement('div');
    hint.className = 'file-upload__hint';
    hint.textContent = `支持 ${this.formatFileSize(this.maxSize)} 以内的文件`;
    uploadArea.appendChild(hint);
    
    container.appendChild(uploadArea);
    
    this.element = container;
    return container;
  }

  /**
   * 获取CSS类名
   * @returns {string} CSS类名
   */
  getClassName() {
    const classes = ['file-upload'];
    
    if (this.isDragging) {
      classes.push('file-upload--dragging');
    }
    
    return classes.join(' ');
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
   * 绑定事件
   */
  bindEvents() {
    const uploadArea = this.element.querySelector('.file-upload__area');
    
    // 点击上传
    uploadArea.addEventListener('click', () => {
      this.fileInput.click();
    });
    
    // 文件选择变化
    this.fileInput.addEventListener('change', (e) => {
      this.handleFileSelect(e.target.files);
    });
    
    // 拖拽支持
    if (this.dragable) {
      this.bindDragEvents(uploadArea);
    }
  }

  /**
   * 绑定拖拽事件
   * @param {HTMLElement} element - 上传区域元素
   */
  bindDragEvents(element) {
    // 拖拽进入
    element.addEventListener('dragenter', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.isDragging = true;
      this.updateClasses();
    });
    
    // 拖拽悬停
    element.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.isDragging = true;
      this.updateClasses();
    });
    
    // 拖拽离开
    element.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.isDragging = false;
      this.updateClasses();
    });
    
    // 拖拽释放
    element.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.isDragging = false;
      this.updateClasses();
      
      const files = e.dataTransfer.files;
      this.handleFileSelect(files);
    });
  }

  /**
   * 更新CSS类
   */
  updateClasses() {
    this.element.className = this.getClassName();
  }

  /**
   * 处理文件选择
   * @param {FileList} files - 文件列表
   */
  handleFileSelect(files) {
    if (!files || files.length === 0) {
      return;
    }
    
    // 转换为数组
    const fileList = Array.from(files);
    
    // 验证文件
    const validFiles = this.validateFiles(fileList);
    
    if (validFiles.length > 0) {
      this.triggerCallback('select', validFiles);
    }
  }

  /**
   * 验证文件
   * @param {Array<File>} files - 文件数组
   * @returns {Array<File>} 有效文件数组
   */
  validateFiles(files) {
    const validFiles = [];
    
    files.forEach(file => {
      // 检查文件大小
      if (file.size > this.maxSize) {
        this.triggerCallback('error', {
          file,
          message: `文件大小超过限制（${this.formatFileSize(this.maxSize)}）`
        });
        return;
      }
      
      validFiles.push(file);
    });
    
    return validFiles;
  }

  /**
   * 触发回调
   * @param {string} event - 事件名称
   * @param {*} data - 事件数据
   */
  triggerCallback(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(callback => {
        callback(data);
      });
    }
  }

  /**
   * 注册事件回调
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  on(event, callback) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
  }

  /**
   * 重置上传状态
   */
  reset() {
    this.fileInput.value = '';
    this.isDragging = false;
    this.updateClasses();
  }

  /**
   * 销毁上传组件
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.callbacks = {};
  }
}