/**
 * docx渲染器
 * 将解析结果渲染为HTML，处理文本、样式、图片、表格等元素
 */
class DocxRenderer {
  constructor() {
    this.container = null;
    this.renderedHTML = '';
    this.zoomLevel = 1.0;
  }

  /**
   * 渲染HTML到容器
   * @param {string} html - 解析后的HTML
   * @param {HTMLElement} container - 渲染容器
   * @param {Object} options - 渲染选项
   */
  render(html, container, options = {}) {
    if (!container) {
      throw new Error('Container is required');
    }

    this.container = container;
    const {
      zoom = 1.0,
      width = '100%',
      maxHeight = 'none',
      showLineNumbers = false
    } = options;

    this.zoomLevel = zoom;

    // 清空容器
    container.innerHTML = '';

    // 创建文档容器
    const docContainer = this._createDocContainer(html, {
      width,
      maxHeight,
      showLineNumbers
    });

    container.appendChild(docContainer);
    this.renderedHTML = html;

    // 应用缩放
    this._applyZoom();
  }

  /**
   * 设置缩放级别
   */
  setZoom(level) {
    if (level < 0.5 || level > 3.0) {
      throw new Error('Zoom level must be between 0.5 and 3.0');
    }
    this.zoomLevel = level;
    this._applyZoom();
  }

  /**
   * 获取当前缩放级别
   */
  getZoom() {
    return this.zoomLevel;
  }

  /**
   * 更新渲染内容
   */
  update(html) {
    if (!this.container || !this.container.firstChild) {
      throw new Error('No rendered content found');
    }
    const docContainer = this._createDocContainer(html, {
      width: this._getStyle(this.container.firstChild, 'width'),
      maxHeight: this._getStyle(this.container.firstChild, 'maxHeight')
    });
    this.container.replaceChild(docContainer, this.container.firstChild);
    this.renderedHTML = html;
    this._applyZoom();
  }

  /**
   * 清空渲染内容
   */
  clear() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.renderedHTML = '';
  }

  /**
   * 获取渲染的HTML
   */
  getRenderedHTML() {
    return this.renderedHTML;
  }

  /**
   * 创建文档容器
   */
  _createDocContainer(html, options) {
    const container = document.createElement('div');
    container.className = 'docx-preview-container';
    container.style.cssText = `
      width: ${options.width};
      max-height: ${options.maxHeight};
      overflow: auto;
      position: relative;
    `;

    const docWrapper = document.createElement('div');
    docWrapper.className = 'docx-wrapper';
    docWrapper.style.cssText = `
      padding: 20px;
      font-family: 'Calibri', 'Arial', sans-serif;
      line-height: 1.6;
      color: #000;
      background: #fff;
      min-height: 100%;
    `;

    // 将HTML字符串转换为DOM元素
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // 处理图片
    this._processImages(tempDiv);

    // 处理表格
    this._processTables(tempDiv);

    // 处理段落
    this._processParagraphs(tempDiv);

    // 移动所有子元素到包装器
    while (tempDiv.firstChild) {
      docWrapper.appendChild(tempDiv.firstChild);
    }

    container.appendChild(docWrapper);

    // 添加行号（如果需要）
    if (options.showLineNumbers) {
      this._addLineNumbers(docWrapper);
    }

    return container;
  }

  /**
   * 处理图片
   */
  _processImages(container) {
    const images = container.querySelectorAll('img');
    images.forEach(img => {
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';
      img.style.margin = '10px auto';
    });
  }

  /**
   * 处理表格
   */
  _processTables(container) {
    const tables = container.querySelectorAll('table');
    tables.forEach(table => {
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.margin = '10px 0';

      const cells = table.querySelectorAll('td, th');
      cells.forEach(cell => {
        cell.style.border = '1px solid #ddd';
        cell.style.padding = '8px';
        cell.style.textAlign = 'left';
      });
    });
  }

  /**
   * 处理段落
   */
  _processParagraphs(container) {
    const paragraphs = container.querySelectorAll('p');
    paragraphs.forEach(p => {
      p.style.margin = '8px 0';
      p.style.lineHeight = '1.6';
    });
  }

  /**
   * 添加行号
   */
  _addLineNumbers(docWrapper) {
    const lines = docWrapper.innerText.split('\n');
    const lineNumbers = document.createElement('div');
    lineNumbers.className = 'line-numbers';
    lineNumbers.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      padding: 20px 8px;
      background: #f5f5f5;
      border-right: 1px solid #ddd;
      font-size: 12px;
      color: #999;
      text-align: right;
      user-select: none;
    `;

    lines.forEach((_, index) => {
      const lineNum = document.createElement('div');
      lineNum.textContent = index + 1;
      lineNumbers.appendChild(lineNum);
    });

    docWrapper.parentElement.insertBefore(lineNumbers, docWrapper);
    docWrapper.style.marginLeft = '50px';
  }

  /**
   * 应用缩放
   */
  _applyZoom() {
    if (this.container && this.container.firstChild) {
      const docWrapper = this.container.querySelector('.docx-wrapper');
      if (docWrapper) {
        docWrapper.style.transform = `scale(${this.zoomLevel})`;
        docWrapper.style.transformOrigin = 'top left';
        docWrapper.style.width = `${100 / this.zoomLevel}%`;
      }
    }
  }

  /**
   * 获取元素样式
   */
  _getStyle(element, property) {
    return element.style[property] || '';
  }
}

export default DocxRenderer;
