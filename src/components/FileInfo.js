/**
 * 文件信息展示组件
 * 显示文件名、文件大小、文件类型等信息
 * 
 * @description 显示文件详细信息的组件
 * @module FileInfo
 * @version 1.0.0
 */

/**
 * 文件信息类
 * @class FileInfo
 */
export class FileInfo {
  /**
   * 创建文件信息实例
   * @param {Object} options - 选项
   * @param {boolean} options.showIcon - 是否显示图标
   * @param {boolean} options.compact - 是否紧凑模式
   */
  constructor(options = {}) {
    this.showIcon = options.showIcon !== false;
    this.compact = options.compact || false;
    
    this.fileName = '';
    this.fileSize = '';
    this.fileType = '';
    
    this.element = this.render();
  }

  /**
   * 渲染文件信息
   * @returns {HTMLElement} 文件信息元素
   */
  render() {
    const fileInfo = document.createElement('div');
    fileInfo.className = this.getClassName();
    
    // 图标
    if (this.showIcon) {
      const icon = document.createElement('div');
      icon.className = 'file-info__icon';
      icon.textContent = '📄';
      fileInfo.appendChild(icon);
    }
    
    // 内容
    const content = document.createElement('div');
    content.className = 'file-info__content';
    
    const name = document.createElement('div');
    name.className = 'file-info__name';
    name.textContent = '未选择文件';
    this.nameElement = name;
    
    const meta = document.createElement('div');
    meta.className = 'file-info__meta';
    this.metaElement = meta;
    
    content.appendChild(name);
    content.appendChild(meta);
    fileInfo.appendChild(content);
    
    this.element = fileInfo;
    return fileInfo;
  }

  /**
   * 获取CSS类名
   * @returns {string} CSS类名
   */
  getClassName() {
    const classes = ['file-info'];
    
    if (this.compact) {
      classes.push('file-info--compact');
    }
    
    return classes.join(' ');
  }

  /**
   * 设置文件
   * @param {File} file - 文件对象
   */
  setFile(file) {
    this.fileName = file.name;
    this.fileSize = this.formatFileSize(file.size);
    this.fileType = this.getFileType(file.name);
    
    this.updateDisplay();
  }

  /**
   * 更新显示
   */
  updateDisplay() {
    if (this.nameElement) {
      this.nameElement.textContent = this.fileName;
    }
    
    if (this.metaElement) {
      this.metaElement.innerHTML = `
        <span>${this.fileSize}</span>
        <span>${this.fileType}</span>
      `;
    }
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
   * @param {string} fileName - 文件名
   * @returns {string} 文件类型
   */
  getFileType(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    return ext.toUpperCase();
  }

  /**
   * 清空文件信息
   */
  clear() {
    this.fileName = '';
    this.fileSize = '';
    this.fileType = '';
    
    if (this.nameElement) {
      this.nameElement.textContent = '未选择文件';
    }
    
    if (this.metaElement) {
      this.metaElement.textContent = '';
    }
  }

  /**
   * 销毁文件信息
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}