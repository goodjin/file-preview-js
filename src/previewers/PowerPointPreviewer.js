/**
 * PowerPoint预览器
 * 支持ppt, pptx格式预览
 * 
 * @description 解析PowerPoint文档并渲染为幻灯片
 * @module PowerPointPreviewer
 * @version 1.0.0
 */

/**
 * PowerPoint预览器类
 * @class PowerPointPreviewer
 */
export class PowerPointPreviewer {
  /**
   * 创建PowerPoint预览器实例
   * @param {Object} options - 预览器选项
   * @param {EventBus} options.eventBus - 事件总线实例
   * @param {StateManager} options.stateManager - 状态管理器实例
   */
  constructor(options = {}) {
    this.eventBus = options.eventBus;
    this.stateManager = options.stateManager;
    this.slides = [];
    this.currentSlide = 1;
  }

  /**
   * 加载PowerPoint文档
   * @param {File} file - 文件对象
   * @returns {Promise<Object>} 加载结果
   */
  async load(file) {
    try {
      this.emitProgress(10);

      // TODO: 解析PowerPoint文档
      // 注意：pptxgenjs主要用于生成PPT，解析可能需要其他库
      // 如：pptx-parser-geo 或专门的PPT解析库

      this.emitProgress(50);

      // 模拟PowerPoint内容（临时实现）
      const mockSlides = [
        {
          number: 1,
          title: 'Introduction',
          content: 'This is the first slide',
          layout: 'title-slide'
        },
        {
          number: 2,
          title: 'Key Features',
          content: 'Feature 1: File Type Detection\nFeature 2: Fast Loading\nFeature 3: Responsive Design',
          layout: 'content-slide'
        },
        {
          number: 3,
          title: 'Technical Details',
          content: 'Built with JavaScript\nPure Frontend Solution\nSupports 45+ File Formats',
          layout: 'content-slide'
        },
        {
          number: 4,
          title: 'Thank You',
          content: 'Questions?',
          layout: 'end-slide'
        }
      ];

      this.slides = mockSlides;

      this.emitProgress(100);

      return {
        type: 'powerpoint',
        ext: file.name.split('.').pop(),
        slides: this.slides,
        numSlides: this.slides.length
      };
    } catch (error) {
      this.emitError(error, 'Failed to load PowerPoint document');
      throw error;
    }
  }

  /**
   * 渲染PowerPoint预览
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
      wrapper.className = 'powerpoint-preview';

      // 创建幻灯片容器
      const slideContainer = document.createElement('div');
      slideContainer.className = 'powerpoint-slides';

      // 渲染所有幻灯片
      data.slides.forEach((slide, index) => {
        const slideElement = this.createSlideElement(slide, index);
        slideContainer.appendChild(slideElement);
      });

      wrapper.appendChild(slideContainer);
      container.appendChild(wrapper);

      // 显示第一张幻灯片
      this.showSlide(1);

      this.emitLoaded();
    } catch (error) {
      this.emitError(error, 'Failed to render PowerPoint document');
      throw error;
    }
  }

  /**
   * 创建幻灯片元素
   * @param {Object} slide - 幻灯片数据
   * @param {number} index - 幻灯片索引
   * @returns {HTMLElement} 幻灯片元素
   */
  createSlideElement(slide, index) {
    const slideDiv = document.createElement('div');
    slideDiv.className = 'powerpoint-slide';
    slideDiv.dataset.slideIndex = index + 1;

    const innerSlide = document.createElement('div');
    innerSlide.className = 'powerpoint-slide-inner';

    // 根据布局创建内容
    switch (slide.layout) {
      case 'title-slide':
        innerSlide.innerHTML = `
          <div class="ppt-title-slide">
            <h1 class="ppt-title">${slide.title}</h1>
            <p class="ppt-subtitle">${slide.content}</p>
          </div>
        `;
        break;
      case 'end-slide':
        innerSlide.innerHTML = `
          <div class="ppt-end-slide">
            <h1 class="ppt-title">${slide.title}</h1>
            <p class="ppt-content">${slide.content}</p>
          </div>
        `;
        break;
      default:
        innerSlide.innerHTML = `
          <div class="ppt-content-slide">
            <h2 class="ppt-slide-title">${slide.title}</h2>
            <div class="ppt-slide-content">${slide.content.replace(/\n/g, '<br>')}</div>
          </div>
        `;
    }

    slideDiv.appendChild(innerSlide);

    // 幻灯片编号
    const slideNumber = document.createElement('div');
    slideNumber.className = 'ppt-slide-number';
    slideNumber.textContent = `${slide.number}`;
    slideDiv.appendChild(slideNumber);

    return slideDiv;
  }

  /**
   * 显示指定幻灯片
   * @param {number} slideNum - 幻灯片编号
   */
  showSlide(slideNum) {
    if (slideNum < 1 || slideNum > this.slides.length) {
      return;
    }

    this.currentSlide = slideNum;

    // 隐藏所有幻灯片
    const allSlides = document.querySelectorAll('.powerpoint-slide');
    allSlides.forEach(slide => {
      slide.style.display = 'none';
    });

    // 显示当前幻灯片
    const currentSlideElement = document.querySelector(`[data-slide-index="${slideNum}"]`);
    if (currentSlideElement) {
      currentSlideElement.style.display = 'flex';
    }

    this.updateCurrentPage();
  }

  /**
   * 下一张幻灯片
   */
  nextSlide() {
    if (this.currentSlide < this.slides.length) {
      this.showSlide(this.currentSlide + 1);
    }
  }

  /**
   * 上一张幻灯片
   */
  previousSlide() {
    if (this.currentSlide > 1) {
      this.showSlide(this.currentSlide - 1);
    }
  }

  /**
   * 获取总页数
   * @returns {number} 总页数
   */
  getTotalPages() {
    return this.slides.length;
  }

  /**
   * 获取当前页码
   * @returns {number} 当前页码
   */
  getCurrentPage() {
    return this.currentSlide;
  }

  /**
   * 更新当前页
   */
  updateCurrentPage() {
    if (this.stateManager) {
      this.stateManager.setState('currentPage', this.currentSlide);
      this.stateManager.setState('totalPages', this.slides.length);
    }

    if (this.eventBus) {
      this.eventBus.emit('page:changed', {
        currentPage: this.currentSlide,
        totalPages: this.slides.length
      });
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
    this.slides = [];
    this.currentSlide = 1;
  }
}