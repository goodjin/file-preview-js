/**
 * PDF控制组件
 * 提供缩放、翻页等控制功能
 */
class PDFControls {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {HTMLElement} options.container - 控制栏容器
   * @param {Function} options.onPrevPage - 上一页回调
   * @param {Function} options.onNextPage - 下一页回调
   * @param {Function} options.onZoomIn - 放大回调
   * @param {Function} options.onZoomOut - 缩小回调
   * @param {Function} options.onGoToPage - 跳转页面回调
   */
  constructor(options) {
    this.container = options.container;
    this.onPrevPage = options.onPrevPage || (() => {});
    this.onNextPage = options.onNextPage || (() => {});
    this.onZoomIn = options.onZoomIn || (() => {});
    this.onZoomOut = options.onZoomOut || (() => {});
    this.onGoToPage = options.onGoToPage || (() => {});
    
    this.currentScale = 1.0;
    this.currentPage = 1;
    this.totalPages = 1;
    
    this.render();
  }
  
  /**
   * 渲染控制栏
   */
  render() {
    this.container.innerHTML = `
      <div class="pdf-controls">
        <div class="pdf-controls-left">
          <button class="pdf-btn prev-page" title="上一页">◀</button>
          <span class="page-info">
            <input type="number" class="current-page-input" value="1" min="1" max="1" />
            <span class="page-separator">/</span>
            <span class="total-pages">1</span>
          </span>
          <button class="pdf-btn next-page" title="下一页">▶</button>
        </div>
        <div class="pdf-controls-right">
          <button class="pdf-btn zoom-out" title="缩小">-</button>
          <span class="zoom-level">100%</span>
          <button class="pdf-btn zoom-in" title="放大">+</button>
        </div>
      </div>
    `;
    
    this._bindEvents();
  }
  
  /**
   * 绑定事件
   */
  _bindEvents() {
    // 上一页
    this.container.querySelector('.prev-page').addEventListener('click', () => {
      this.onPrevPage();
    });
    
    // 下一页
    this.container.querySelector('.next-page').addEventListener('click', () => {
      this.onNextPage();
    });
    
    // 放大
    this.container.querySelector('.zoom-in').addEventListener('click', () => {
      this.onZoomIn();
    });
    
    // 缩小
    this.container.querySelector('.zoom-out').addEventListener('click', () => {
      this.onZoomOut();
    });
    
    // 跳转页面
    const pageInput = this.container.querySelector('.current-page-input');
    pageInput.addEventListener('change', (e) => {
      const page = parseInt(e.target.value);
      if (!isNaN(page)) {
        this.onGoToPage(page - 1); // 转换为0-based索引
      }
    });
    
    pageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.target.blur();
      }
    });
  }
  
  /**
   * 更新页码显示
   * @param {number} current - 当前页（0-based）
   * @param {number} total - 总页数
   */
  updatePageInfo(current, total) {
    this.currentPage = current + 1;
    this.totalPages = total;
    
    const pageInput = this.container.querySelector('.current-page-input');
    const totalPagesSpan = this.container.querySelector('.total-pages');
    
    pageInput.value = this.currentPage;
    pageInput.max = total;
    totalPagesSpan.textContent = total;
  }
  
  /**
   * 更新缩放级别显示
   * @param {number} scale - 缩放比例
   */
  updateZoomLevel(scale) {
    this.currentScale = scale;
    const zoomLevelSpan = this.container.querySelector('.zoom-level');
    zoomLevelSpan.textContent = Math.round(scale * 100) + '%';
  }
  
  /**
   * 启用/禁用上一页按钮
   * @param {boolean} enabled
   */
  setPrevPageEnabled(enabled) {
    const btn = this.container.querySelector('.prev-page');
    btn.disabled = !enabled;
  }
  
  /**
   * 启用/禁用下一页按钮
   * @param {boolean} enabled
   */
  setNextPageEnabled(enabled) {
    const btn = this.container.querySelector('.next-page');
    btn.disabled = !enabled;
  }
  
  /**
   * 启用/禁用放大按钮
   * @param {boolean} enabled
   */
  setZoomInEnabled(enabled) {
    const btn = this.container.querySelector('.zoom-in');
    btn.disabled = !enabled;
  }
  
  /**
   * 启用/禁用缩小按钮
   * @param {boolean} enabled
   */
  setZoomOutEnabled(enabled) {
    const btn = this.container.querySelector('.zoom-out');
    btn.disabled = !enabled;
  }
  
  /**
   * 销毁控制组件
   */
  destroy() {
    this.container.innerHTML = '';
  }
}

export default PDFControls;
