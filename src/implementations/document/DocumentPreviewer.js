/**
 * 文档预览器基类
 * 定义所有文档预览器的通用接口
 */
class DocumentPreviewer {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {HTMLElement} options.container - 容器元素
   * @param {Object} options.fileInfo - 文件信息
   * @param {Function} options.onLoad - 加载完成回调
   * @param {Function} options.onError - 错误回调
   * @param {Function} options.onProgress - 进度回调
   */
  constructor(options) {
    this.container = options.container;
    this.fileInfo = options.fileInfo;
    this.onLoad = options.onLoad || (() => {});
    this.onError = options.onError || (() => {});
    this.onProgress = options.onProgress || (() => {});
    
    this.loaded = false;
    this.destroyed = false;
  }
  
  /**
   * 加载文件（由子类实现）
   * @param {ArrayBuffer|File} file - 文件数据
   * @throws {Error} 如果子类未实现此方法
   */
  async load(file) {
    throw new Error('load方法必须由子类实现');
  }
  
  /**
   * 渲染页面（由子类实现）
   * @param {number} pageIndex - 页面索引（从0开始）
   * @throws {Error} 如果子类未实现此方法
   */
  async renderPage(pageIndex) {
    throw new Error('renderPage方法必须由子类实现');
  }
  
  /**
   * 销毁实例，释放资源
   */
  destroy() {
    this.loaded = false;
    this.destroyed = true;
    
    // 清空容器
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
  
  /**
   * 检查是否已加载
   * @returns {boolean}
   */
  isLoaded() {
    return this.loaded;
  }
  
  /**
   * 检查是否已销毁
   * @returns {boolean}
   */
  isDestroyed() {
    return this.destroyed;
  }
  
  /**
   * 触发加载完成事件
   */
  _triggerLoad() {
    this.loaded = true;
    this.onLoad();
  }
  
  /**
   * 触发错误事件
   * @param {Error} error - 错误对象
   */
  _triggerError(error) {
    this.onError(error);
  }
  
  /**
   * 触发进度事件
   * @param {number} progress - 进度（0-100）
   */
  _triggerProgress(progress) {
    this.onProgress(progress);
  }
}

export default DocumentPreviewer;
