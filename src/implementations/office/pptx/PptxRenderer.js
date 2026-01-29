/**
 * PptxRenderer - PPTX渲染器
 * 将解析后的幻灯片数据渲染为HTML
 * 支持幻灯片切换和缩放功能
 */

class PptxRenderer {
  constructor() {
    this.container = null;
    this.slidesData = [];
    this.currentSlideIndex = 0;
    this.zoomLevel = 1;
    this.slidesElements = [];
    this.onPageChange = null;
    this.onZoomChange = null;
  }

  /**
   * 初始化渲染器
   * @param {Object} slidesData - 解析后的幻灯片数据
   * @param {Object} options - 渲染选项
   */
  init(slidesData, options = {}) {
    this.slidesData = slidesData.slides || [];
    this.currentSlideIndex = options.initialSlide || 0;
    this.zoomLevel = options.zoom || 1;
    this.onPageChange = options.onPageChange || null;
    this.onZoomChange = options.onZoomChange || null;
  }

  /**
   * 渲染到指定容器
   * @param {HTMLElement} container - 目标容器
   */
  render(container) {
    if (!container) {
      throw new Error('渲染容器不能为空');
    }

    this.container = container;
    this._clearContainer();
    this._createContainerStructure();
    
    // 渲染所有幻灯片（懒加载后续幻灯片）
    this._renderSlides();
    
    // 显示当前幻灯片
    this._showSlide(this.currentSlideIndex);
  }

  /**
   * 清空容器
   */
  _clearContainer() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.slidesElements = [];
  }

  /**
   * 创建容器结构
   */
  _createContainerStructure() {
    // 创建预览容器
    const previewContainer = document.createElement('div');
    previewContainer.className = 'pptx-preview-container';
    previewContainer.style.cssText = `
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #f5f5f5;
    `;

    // 创建幻灯片容器
    const slidesWrapper = document.createElement('div');
    slidesWrapper.className = 'pptx-slides-wrapper';
    slidesWrapper.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      transition: transform 0.3s ease;
    `;

    // 创建导航控制
    const navContainer = this._createNavigation();

    // 创建缩放控制
    const zoomContainer = this._createZoomControl();

    // 创建页码显示
    const pageInfo = this._createPageInfo();

    previewContainer.appendChild(slidesWrapper);
    previewContainer.appendChild(navContainer);
    previewContainer.appendChild(zoomContainer);
    previewContainer.appendChild(pageInfo);
    this.container.appendChild(previewContainer);

    // 保存引用
    this.slidesWrapper = slidesWrapper;
    this.navContainer = navContainer;
    this.zoomContainer = zoomContainer;
    this.pageInfo = pageInfo;
  }

  /**
   * 渲染幻灯片
   */
  _renderSlides() {
    this.slidesData.forEach((slideData, index) => {
      const slideElement = this._createSlideElement(slideData, index);
      this.slidesElements.push(slideElement);
      this.slidesWrapper.appendChild(slideElement);
    });
  }

  /**
   * 创建幻灯片元素
   */
  _createSlideElement(slideData, index) {
    const slide = document.createElement('div');
    slide.className = 'pptx-slide';
    slide.dataset.index = index;
    
    // 幻灯片尺寸（16:9，960x540像素）
    const slideWidth = 960;
    const slideHeight = 540;

    slide.style.cssText = `
      position: absolute;
      width: ${slideWidth}px;
      height: ${slideHeight}px;
      background: white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: none;
      overflow: hidden;
    `;

    // 渲染幻灯片元素
    slideData.elements.forEach(element => {
      const elementNode = this._createElement(element, slideWidth, slideHeight);
      if (elementNode) {
        slide.appendChild(elementNode);
      }
    });

    return slide;
  }

  /**
   * 创建幻灯片中的元素
   */
  _createElement(element, slideWidth, slideHeight) {
    const node = document.createElement('div');
    
    // 转换EMU坐标为像素
    const x = (element.x / 9144000) * slideWidth;
    const y = (element.y / 6858000) * slideHeight;
    const width = (element.width / 9144000) * slideWidth;
    const height = (element.height / 6858000) * slideHeight;

    switch (element.type) {
      case 'textbox':
        return this._createTextBox(element, x, y, width, height);
      case 'image':
        return this._createImage(element, x, y, width, height);
      case 'shape':
        return this._createShape(element, x, y, width, height);
      default:
        return null;
    }
  }

  /**
   * 创建文本框
   */
  _createTextBox(element, x, y, width, height) {
    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
      padding: 8px;
      box-sizing: border-box;
      word-wrap: break-word;
    `;

    element.textRuns.forEach(run => {
      const span = document.createElement('span');
      span.textContent = run.text;
      span.style.cssText = `
        font-size: ${run.fontSize}px;
        font-weight: ${run.bold ? 'bold' : 'normal'};
        font-style: ${run.italic ? 'italic' : 'normal'};
        color: #${run.color};
      `;
      container.appendChild(span);
    });

    return container;
  }

  /**
   * 创建图片
   */
  _createImage(element, x, y, width, height) {
    const img = document.createElement('img');
    img.src = element.url;
    img.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: ${width}px;
      height: ${height}px;
      object-fit: contain;
    `;
    img.draggable = false;
    return img;
  }

  /**
   * 创建形状
   */
  _createShape(element, x, y, width, height) {
    const shape = document.createElement('div');
    shape.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: ${width}px;
      height: ${height}px;
      background: #${element.fill};
      border: 1px solid #ccc;
    `;
    return shape;
  }

  /**
   * 创建导航控制
   */
  _createNavigation() {
    const nav = document.createElement('div');
    nav.className = 'pptx-navigation';
    nav.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 10px;
      z-index: 10;
    `;

    const prevBtn = this._createNavButton('上一页', () => this.prevPage());
    const nextBtn = this._createNavButton('下一页', () => this.nextPage());

    nav.appendChild(prevBtn);
    nav.appendChild(nextBtn);

    return nav;
  }

  /**
   * 创建导航按钮
   */
  _createNavButton(text, onClick) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
      padding: 8px 16px;
      background: rgba(0,0,0,0.7);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    `;
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(0,0,0,0.9)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'rgba(0,0,0,0.7)';
    });
    btn.addEventListener('click', onClick);
    return btn;
  }

  /**
   * 创建缩放控制
   */
  _createZoomControl() {
    const zoom = document.createElement('div');
    zoom.className = 'pptx-zoom-control';
    zoom.style.cssText = `
      position: absolute;
      bottom: 20px;
      right: 20px;
      display: flex;
      gap: 10px;
      align-items: center;
      z-index: 10;
    `;

    const zoomOut = this._createZoomButton('-', () => this._zoomOut());
    const zoomIn = this._createZoomButton('+', () => this._zoomIn());
    const zoomLabel = document.createElement('span');
    zoomLabel.textContent = `${Math.round(this.zoomLevel * 100)}%`;
    zoomLabel.style.cssText = `
      color: white;
      font-size: 14px;
      background: rgba(0,0,0,0.7);
      padding: 8px 12px;
      border-radius: 4px;
    `;
    this.zoomLabel = zoomLabel;

    zoom.appendChild(zoomOut);
    zoom.appendChild(zoomLabel);
    zoom.appendChild(zoomIn);

    return zoom;
  }

  /**
   * 创建缩放按钮
   */
  _createZoomButton(text, onClick) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
      width: 36px;
      height: 36px;
      background: rgba(0,0,0,0.7);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
    `;
    btn.addEventListener('click', onClick);
    return btn;
  }

  /**
   * 创建页码显示
   */
  _createPageInfo() {
    const info = document.createElement('div');
    info.className = 'pptx-page-info';
    info.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 20px;
      color: white;
      font-size: 14px;
      background: rgba(0,0,0,0.7);
      padding: 8px 12px;
      border-radius: 4px;
      z-index: 10;
    `;
    info.textContent = `${this.currentSlideIndex + 1} / ${this.slidesData.length}`;
    this.pageInfoElement = info;
    return info;
  }

  /**
   * 显示指定幻灯片
   */
  _showSlide(index) {
    if (index < 0 || index >= this.slidesElements.length) {
      return;
    }

    // 隐藏所有幻灯片
    this.slidesElements.forEach(slide => {
      slide.style.display = 'none';
    });

    // 显示当前幻灯片
    const currentSlide = this.slidesElements[index];
    currentSlide.style.display = 'block';

    // 应用切换效果
    this._applyTransition(currentSlide);

    // 更新页码
    this._updatePageInfo();

    // 更新导航按钮状态
    this._updateNavigation();
  }

  /**
   * 应用切换效果
   */
  _applyTransition(slideElement) {
    const slideData = this.slidesData[this.currentSlideIndex];
    if (!slideData || !slideData.transition) return;

    const { type, duration } = slideData.transition;
    slideElement.style.transition = `opacity ${duration}ms ease`;

    switch (type) {
      case 'fade':
        slideElement.style.opacity = '0';
        requestAnimationFrame(() => {
          slideElement.style.opacity = '1';
        });
        break;
      case 'dissolve':
        // 简化的溶解效果
        slideElement.style.opacity = '0';
        requestAnimationFrame(() => {
          slideElement.style.opacity = '1';
        });
        break;
    }
  }

  /**
   * 更新页码显示
   */
  _updatePageInfo() {
    if (this.pageInfoElement) {
      this.pageInfoElement.textContent = 
        `${this.currentSlideIndex + 1} / ${this.slidesData.length}`;
    }
  }

  /**
   * 更新导航按钮状态
   */
  _updateNavigation() {
    const prevBtn = this.navContainer.querySelector('button:first-child');
    const nextBtn = this.navContainer.querySelector('button:last-child');

    if (prevBtn) {
      prevBtn.disabled = this.currentSlideIndex === 0;
      prevBtn.style.opacity = this.currentSlideIndex === 0 ? '0.3' : '1';
    }
    if (nextBtn) {
      nextBtn.disabled = this.currentSlideIndex === this.slidesElements.length - 1;
      nextBtn.style.opacity = this.currentSlideIndex === this.slidesElements.length - 1 ? '0.3' : '1';
    }
  }

  /**
   * 应用缩放
   */
  _applyZoom() {
    if (!this.slidesWrapper) return;
    this.slidesWrapper.style.transform = 
      `translate(-50%, -50%) scale(${this.zoomLevel})`;
    
    if (this.zoomLabel) {
      this.zoomLabel.textContent = `${Math.round(this.zoomLevel * 100)}%`;
    }

    if (this.onZoomChange) {
      this.onZoomChange(this.zoomLevel);
    }
  }

  /**
   * 放大
   */
  _zoomIn() {
    this.setZoom(this.zoomLevel + 0.1);
  }

  /**
   * 缩小
   */
  _zoomOut() {
    if (this.zoomLevel > 0.2) {
      this.setZoom(this.zoomLevel - 0.1);
    }
  }

  /**
   * 跳转到指定页面
   */
  goToPage(pageNum) {
    const index = pageNum - 1;
    if (index >= 0 && index < this.slidesElements.length) {
      this.currentSlideIndex = index;
      this._showSlide(index);
      
      if (this.onPageChange) {
        this.onPageChange(pageNum);
      }
    }
  }

  /**
   * 下一页
   */
  nextPage() {
    if (this.currentSlideIndex < this.slidesElements.length - 1) {
      this.goToPage(this.currentSlideIndex + 2);
    }
  }

  /**
   * 上一页
   */
  prevPage() {
    if (this.currentSlideIndex > 0) {
      this.goToPage(this.currentSlideIndex);
    }
  }

  /**
   * 设置缩放级别
   */
  setZoom(level) {
    this.zoomLevel = Math.max(0.1, Math.min(3, level));
    this._applyZoom();
  }

  /**
   * 获取当前缩放级别
   */
  getZoom() {
    return this.zoomLevel;
  }

  /**
   * 获取当前页码
   */
  getCurrentPage() {
    return this.currentSlideIndex + 1;
  }

  /**
   * 获取总页数
   */
  getTotalPages() {
    return this.slidesElements.length;
  }

  /**
   * 销毁渲染器
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.slidesElements = [];
    this.slidesWrapper = null;
    this.navContainer = null;
    this.zoomContainer = null;
    this.pageInfoElement = null;
  }
}

// 导出
export default PptxRenderer;
