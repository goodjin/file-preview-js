import DocumentPreviewer from '../DocumentPreviewer.js';
import PDFRenderer from './PDFRenderer.js';
import PDFControls from './PDFControls.js';
import FileUtils from '../utils/FileUtils.js';
import PageUtils from '../utils/PageUtils.js';

/**
 * PDF预览器
 * 实现PDF文件的加载、渲染和控制
 */
class PDFPreviewer extends DocumentPreviewer {
  constructor(options) {
    super(options);
    
    this.renderer = new PDFRenderer();
    this.controls = null;
    this.controlsContainer = null;
    
    this.scale = 1.0;
    this.currentPage = 0;
    this.totalPages = 0;
    this.canvas = null;
    
    this.minScale = 0.25;
    this.maxScale = 4.0;
  }
  
  /**
   * 加载PDF文件
   * @param {File} file - 文件对象
   */
  async load(file) {
    try {
      // 验证文件格式
      if (!FileUtils.isPDF(file)) {
        throw new Error('不支持的文件格式，请上传PDF文件');
      }
      
      // 读取文件
      this._triggerProgress(0);
      const arrayBuffer = await FileUtils.readFileAsArrayBuffer(file, (progress) => {
        this._triggerProgress(progress);
      });
      
      // 加载PDF文档
      this.pdfDoc = await this.renderer.loadDocument(arrayBuffer, (progress) => {
        this._triggerProgress(Math.round(progress / 2 + 50));
      });
      
      this.totalPages = this.pdfDoc.numPages;
      
      // 创建UI结构
      this._createUI();
      
      // 渲染第一页
      await this.renderPage(0);
      
      this._triggerLoad();
    } catch (error) {
      this._triggerError(error);
      throw error;
    }
  }
  
  /**
   * 创建UI结构
   */
  _createUI() {
    this.container.innerHTML = `
      <div class="pdf-preview-container">
        <div class="pdf-canvas-wrapper">
          <canvas id="pdf-canvas"></canvas>
        </div>
        <div class="pdf-controls-wrapper"></div>
      </div>
    `;
    
    this.canvas = this.container.querySelector('#pdf-canvas');
    this.controlsContainer = this.container.querySelector('.pdf-controls-wrapper');
    
    // 创建控制组件
    this.controls = new PDFControls({
      container: this.controlsContainer,
      onPrevPage: () => this.previousPage(),
      onNextPage: () => this.nextPage(),
      onZoomIn: () => this.zoomIn(),
      onZoomOut: () => this.zoomOut(),
      onGoToPage: (pageIndex) => this.goToPage(pageIndex)
    });
    
    this._updateControlsState();
  }
  
  /**
   * 渲染指定页面
   * @param {number} pageIndex - 页面索引（0-based）
   */
  async renderPage(pageIndex) {
    if (!this.pdfDoc) {
      throw new Error('PDF文档未加载');
    }
    
    pageIndex = PageUtils.normalizePageIndex(pageIndex, this.totalPages);
    this.currentPage = pageIndex;
    
    try {
      await this.renderer.renderPage(pageIndex, this.canvas, this.scale);
      this._updateControlsState();
    } catch (error) {
      this._triggerError(error);
      throw error;
    }
  }
  
  /**
   * 设置缩放级别
   * @param {number} scale - 缩放比例
   */
  async setScale(scale) {
    scale = PageUtils.clampScale(scale, this.minScale, this.maxScale);
    this.scale = scale;
    
    if (this.controls) {
      this.controls.updateZoomLevel(scale);
    }
    
    await this.renderPage(this.currentPage);
  }
  
  /**
   * 放大
   */
  async zoomIn() {
    const newScale = Math.min(this.scale + 0.25, this.maxScale);
    await this.setScale(newScale);
  }
  
  /**
   * 缩小
   */
  async zoomOut() {
    const newScale = Math.max(this.scale - 0.25, this.minScale);
    await this.setScale(newScale);
  }
  
  /**
   * 跳转到指定页
   * @param {number} pageIndex - 页面索引（0-based）
   */
  async goToPage(pageIndex) {
    await this.renderPage(pageIndex);
  }
  
  /**
   * 上一页
   */
  async previousPage() {
    if (this.currentPage > 0) {
      await this.renderPage(this.currentPage - 1);
    }
  }
  
  /**
   * 下一页
   */
  async nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      await this.renderPage(this.currentPage + 1);
    }
  }
  
  /**
   * 获取总页数
   * @returns {number}
   */
  getTotalPages() {
    return this.totalPages;
  }
  
  /**
   * 获取当前页码
   * @returns {number}
   */
  getCurrentPage() {
    return this.currentPage;
  }
  
  /**
   * 获取当前缩放比例
   * @returns {number}
   */
  getScale() {
    return this.scale;
  }
  
  /**
   * 更新控制栏状态
   */
  _updateControlsState() {
    if (!this.controls) return;
    
    this.controls.updatePageInfo(this.currentPage, this.totalPages);
    this.controls.updateZoomLevel(this.scale);
    
    this.controls.setPrevPageEnabled(this.currentPage > 0);
    this.controls.setNextPageEnabled(this.currentPage < this.totalPages - 1);
    this.controls.setZoomInEnabled(this.scale < this.maxScale);
    this.controls.setZoomOutEnabled(this.scale > this.minScale);
  }
  
  /**
   * 销毁预览器
   */
  destroy() {
    if (this.controls) {
      this.controls.destroy();
      this.controls = null;
    }
    
    if (this.renderer) {
      this.renderer.destroy();
      this.renderer = null;
    }
    
    this.canvas = null;
    this.pdfDoc = null;
    
    super.destroy();
  }
}

export default PDFPreviewer;
