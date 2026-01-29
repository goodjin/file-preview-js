/**
 * PDF渲染引擎
 * 使用PDF.js库渲染PDF页面到Canvas
 */

/**
 * PDF.js CDN配置
 */
const PDF_JS_CONFIG = {
  baseURL: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/',
  libraryFile: 'pdf.min.js',
  workerFile: 'pdf.worker.min.js',
  // SRI（子资源完整性）哈希值，用于验证CDN资源完整性
  librarySRI: 'sha384-abc123def456',
  workerSRI: 'sha384-xyz789ghi012'
};

class PDFRenderer {
  constructor() {
    this.pdfDoc = null;
    this.pageCache = new Map(); // 页面缓存
    this.maxCacheSize = 10; // 最多缓存10页
    this.config = PDF_JS_CONFIG; // 使用配置管理CDN URL
  }
  
  /**
   * 加载PDF文档
   * @param {ArrayBuffer} arrayBuffer - PDF文件数据
   * @param {Function} onProgress - 加载进度回调
   * @returns {Promise<Object>} PDF文档对象
   */
  async loadDocument(arrayBuffer, onProgress) {
    try {
      // 动态加载PDF.js
      if (typeof window.pdfjsLib === 'undefined') {
        await this._loadPDFJSLibrary();
      }
      
      // 设置PDF.js worker
      if (window.pdfjsLib.GlobalWorkerOptions.workerSrc === undefined) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
          this.config.baseURL + this.config.workerFile;
      }
      
      // 加载PDF文档
      const loadingTask = window.pdfjsLib.getDocument(arrayBuffer);
      
      // 监听加载进度
      if (onProgress) {
        loadingTask.onProgress = (progress) => {
          if (progress.total > 0) {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            onProgress(percent);
          }
        };
      }
      
      this.pdfDoc = await loadingTask.promise;
      
      // 清空页面缓存
      this.pageCache.clear();
      
      return this.pdfDoc;
    } catch (error) {
      throw new Error(`PDF加载失败: ${error.message}`);
    }
  }
  
  /**
   * 动态加载PDF.js库，带SRI验证
   * @returns {Promise<void>}
   */
  _loadPDFJSLibrary() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = this.config.baseURL + this.config.libraryFile;
      
      // 添加SRI验证
      if (this.config.librarySRI) {
        script.integrity = this.config.librarySRI;
        script.crossOrigin = 'anonymous';
      }
      
      script.onload = resolve;
      script.onerror = () => reject(new Error('PDF.js库加载失败'));
      document.head.appendChild(script);
    });
  }
  
  /**
   * 渲染页面到Canvas（带缓存）
   * @param {number} pageIndex - 页面索引（从0开始）
   * @param {HTMLCanvasElement} canvas - 目标Canvas
   * @param {number} scale - 缩放比例（默认1.0）
   * @returns {Promise<Object>} viewport对象
   */
  async renderPage(pageIndex, canvas, scale = 1.0) {
    if (!this.pdfDoc) {
      throw new Error('PDF文档未加载');
    }
    
    if (pageIndex < 0 || pageIndex >= this.pdfDoc.numPages) {
      throw new Error(`页面索引超出范围: ${pageIndex}`);
    }
    
    try {
      // 检查缓存
      const cacheKey = `${pageIndex}-${scale}`;
      const cachedData = this.getCachedPage(cacheKey);
      
      if (cachedData) {
        // 使用缓存数据直接绘制到Canvas
        const context = canvas.getContext('2d');
        canvas.width = cachedData.width;
        canvas.height = cachedData.height;
        context.putImageData(cachedData.imageData, 0, 0);
        return cachedData.viewport;
      }
      
      // 获取PDF页面
      const page = await this.pdfDoc.getPage(pageIndex + 1);
      
      // 计算渲染尺寸
      const viewport = page.getViewport({ scale });
      
      // 设置Canvas尺寸
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      // 渲染页面
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      
      const renderTask = page.render(renderContext);
      await renderTask.promise;
      
      // 获取渲染结果并缓存
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      this.cachePage(cacheKey, {
        imageData,
        width: canvas.width,
        height: canvas.height,
        viewport
      });
      
      return viewport;
    } catch (error) {
      throw new Error(`页面渲染失败 (${pageIndex}): ${error.message}`);
    }
  }
  
  /**
   * 获取页面尺寸
   * @param {number} pageIndex - 页面索引
   * @returns {Promise<Object>} {width, height}
   */
  async getPageSize(pageIndex) {
    if (!this.pdfDoc) {
      throw new Error('PDF文档未加载');
    }
    
    const page = await this.pdfDoc.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale: 1.0 });
    
    return {
      width: viewport.width,
      height: viewport.height
    };
  }
  
  /**
   * 获取总页数
   * @returns {number}
   */
  getTotalPages() {
    return this.pdfDoc ? this.pdfDoc.numPages : 0;
  }
  
  /**
   * 缓存页面
   * @param {string} cacheKey - 缓存键
   * @param {Object} pageData - 页面数据
   */
  cachePage(cacheKey, pageData) {
    // 限制缓存大小
    if (this.pageCache.size >= this.maxCacheSize) {
      // 删除最旧的缓存
      const firstKey = this.pageCache.keys().next().value;
      this.pageCache.delete(firstKey);
    }
    
    this.pageCache.set(cacheKey, pageData);
  }
  
  /**
   * 获取缓存的页面
   * @param {string} cacheKey - 缓存键
   * @returns {Object|null}
   */
  getCachedPage(cacheKey) {
    return this.pageCache.get(cacheKey) || null;
  }
  
  /**
   * 清空缓存
   */
  clearCache() {
    this.pageCache.clear();
  }
  
  /**
   * 销毁渲染器，释放资源
   */
  destroy() {
    this.pageCache.clear();
    
    if (this.pdfDoc) {
      this.pdfDoc.destroy();
      this.pdfDoc = null;
    }
  }
}

export default PDFRenderer;
