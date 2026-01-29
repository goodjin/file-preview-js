/**
 * Markdown预览器
 * 支持标准Markdown语法渲染和代码高亮
 */
import DocumentPreviewer from '../DocumentPreviewer.js';

class MDPreviewer extends DocumentPreviewer {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   */
  constructor(options) {
    super(options);
    
    this.markdownContent = '';
    this.renderer = null;
    this.codeHighlighter = null;
    this.scale = 1.0;
    
    // 初始化marked.js和highlight.js
    this._initLibraries();
  }

  /**
   * 初始化外部库
   * @private
   */
  _initLibraries() {
    // 检查marked.js是否已加载
    if (typeof marked === 'undefined') {
      console.warn('marked.js未加载，请通过CDN引入');
    } else {
      this.renderer = marked;
      // 配置marked选项
      marked.setOptions({
        gfm: true,           // 启用GitHub风格Markdown
        breaks: true,        // 启用换行符转换
        headerIds: true,     // 启用标题ID
        mangle: false        // 不转义HTML标签
      });
    }
    
    // 检查highlight.js是否已加载
    if (typeof hljs !== 'undefined') {
      this.codeHighlighter = hljs;
    }
  }

  /**
   * 加载Markdown文件
   * @param {ArrayBuffer|File|string} file - 文件数据
   */
  async load(file) {
    try {
      let content = '';
      
      if (file instanceof ArrayBuffer) {
        // ArrayBuffer转文本
        const decoder = new TextDecoder('utf-8');
        content = decoder.decode(file);
      } else if (file instanceof File) {
        // File对象读取
        content = await this._readFile(file);
      } else if (typeof file === 'string') {
        // 直接文本内容
        content = file;
      } else {
        throw new Error('不支持的文件类型');
      }
      
      this.markdownContent = content;
      this._triggerLoad();
      
    } catch (error) {
      this._triggerError(error);
      throw error;
    }
  }

  /**
   * 读取文件内容
   * @param {File} file - 文件对象
   * @returns {Promise<string>}
   * @private
   */
  _readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        resolve(e.target.result);
      };
      
      reader.onerror = (e) => {
        reject(new Error('文件读取失败'));
      };
      
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          this._triggerProgress(progress);
        }
      };
      
      reader.readAsText(file, 'utf-8');
    });
  }

  /**
   * 渲染Markdown内容（Markdown为单页文档，pageIndex忽略）
   * @param {number} pageIndex - 页面索引（忽略）
   */
  async renderPage(pageIndex) {
    if (this.isDestroyed()) {
      throw new Error('预览器已销毁');
    }
    
    if (!this.isLoaded()) {
      throw new Error('文档未加载');
    }
    
    try {
      // 转换Markdown为HTML
      const html = this._markdownToHTML(this.markdownContent);
      
      // 使用DOMPurify净化HTML，防止XSS攻击
      const sanitizedHtml = this._sanitizeHtml(html);
      
      // 清空容器
      this.container.innerHTML = '';
      
      // 创建包装器
      const wrapper = document.createElement('div');
      wrapper.className = 'md-preview-wrapper';
      wrapper.style.cssText = `
        width: 100%;
        height: 100%;
        overflow: auto;
        padding: 40px;
        background: #fff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #333;
      `;
      
      // 创建内容容器
      const contentDiv = document.createElement('div');
      contentDiv.className = 'md-preview-content';
      contentDiv.innerHTML = sanitizedHtml;
      contentDiv.style.cssText = `
        max-width: 900px;
        margin: 0 auto;
        transform: scale(${this.scale});
        transform-origin: top left;
      `;
      
      wrapper.appendChild(contentDiv);
      this.container.appendChild(wrapper);
      
      // 应用代码高亮
      this._applyCodeHighlight();
      
    } catch (error) {
      this._triggerError(error);
      throw error;
    }
  }

  /**
   * 净化HTML，防止XSS攻击
   * @param {string} html - 待净化的HTML
   * @returns {string} 净化后的HTML
   * @private
   */
  _sanitizeHtml(html) {
    if (typeof DOMPurify !== 'undefined') {
      return DOMPurify.sanitize(html, {
        // 允许必要的标签用于Markdown渲染
        ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'strong', 'em', 'a', 'code', 'pre', 'ul', 'ol', 'li', 'blockquote', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'div', 'span'],
        // 允许必要的属性
        ALLOWED_ATTR: ['href', 'title', 'src', 'alt', 'class', 'id', 'style'],
        // 允许data协议用于图片
        ALLOW_DATA_ATTR: false,
        // 禁止使用javascript:协议
        FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
      });
    }
    
    console.warn('DOMPurify未加载，HTML未被净化，存在XSS风险');
    return html;
  }

  /**
   * Markdown转HTML
   * @param {string} markdown - Markdown文本
   * @returns {string} HTML字符串
   * @private
   */
  _markdownToHTML(markdown) {
    if (this.renderer) {
      return this.renderer.parse(markdown);
    }
    
    // 如果marked.js未加载，使用简单转换
    return this._simpleMarkdownToHTML(markdown);
  }

  /**
   * 简单的Markdown转HTML（备选方案）
   * @param {string} markdown - Markdown文本
   * @returns {string} HTML字符串
   * @private
   */
  _simpleMarkdownToHTML(markdown) {
    let html = markdown;
    
    // 标题
    html = html.replace(/^###### (.*$)/gim, '<h6>$1</h6>');
    html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
    html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // 粗体和斜体
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // 链接
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    
    // 代码块
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
    
    // 行内代码
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // 段落
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    
    return html;
  }

  /**
   * 应用代码高亮
   * @private
   */
  _applyCodeHighlight() {
    if (!this.codeHighlighter) return;
    
    const codeBlocks = this.container.querySelectorAll('pre code');
    codeBlocks.forEach((block) => {
      this.codeHighlighter.highlightElement(block);
    });
  }

  /**
   * 设置缩放级别
   * @param {number} scale - 缩放级别（0.5 - 2.0）
   */
  setScale(scale) {
    this.scale = Math.max(0.5, Math.min(2.0, scale));
    
    const contentDiv = this.container.querySelector('.md-preview-content');
    if (contentDiv) {
      contentDiv.style.transform = `scale(${this.scale})`;
    }
  }

  /**
   * 获取总页数（Markdown为单页文档）
   * @returns {number} 总是返回1
   */
  getTotalPages() {
    return 1;
  }

  /**
   * 跳转到指定页（Markdown为单页文档，总是跳转到第0页）
   * @param {number} pageIndex - 页面索引
   */
  goToPage(pageIndex) {
    if (pageIndex !== 0) {
      console.warn('Markdown文档只有一页');
    }
  }

  /**
   * 上一页（Markdown为单页文档，无操作）
   */
  previousPage() {
    console.warn('Markdown文档只有一页');
  }

  /**
   * 下一页（Markdown为单页文档，无操作）
   */
  nextPage() {
    console.warn('Markdown文档只有一页');
  }

  /**
   * 销毁实例
   */
  destroy() {
    super.destroy();
    
    this.markdownContent = '';
    this.renderer = null;
    this.codeHighlighter = null;
  }
}

export default MDPreviewer;
