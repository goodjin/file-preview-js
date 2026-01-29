/**
 * TXT文件预览器
 * 支持多种文本编码、行号显示、文本搜索等功能
 */
import DocumentPreviewer from '../DocumentPreviewer.js';

/**
 * 常用文本编码列表
 */
const COMMON_ENCODINGS = [
  'utf-8',
  'gbk',
  'gb18030',
  'gb2312',
  'big5',
  'shift_jis',
  'euc-jp',
  'euc-kr',
  'utf-16le',
  'utf-16be'
];

class TXTPreviewer extends DocumentPreviewer {
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
    super(options);
    
    this.textContent = '';
    this.encoding = 'utf-8';
    this.lineCount = 0;
    this.showLineNumbers = options.showLineNumbers !== false; // 默认显示行号
    this.searchKeyword = '';
    this.searchResults = [];
    this.currentSearchIndex = -1;
  }
  
  /**
   * 加载TXT文件
   * @param {ArrayBuffer|File} file - 文件数据
   */
  async load(file) {
    if (this.destroyed) {
      throw new Error('预览器已销毁');
    }
    
    try {
      // 获取ArrayBuffer
      const buffer = await this._getArrayBuffer(file);
      this._triggerProgress(30);
      
      // 检测文件编码
      this.encoding = this._detectEncoding(buffer);
      this._triggerProgress(50);
      
      // 解码文本内容
      this.textContent = this._decodeText(buffer, this.encoding);
      this._triggerProgress(70);
      
      // 计算行数
      this.lineCount = this.textContent.split('\n').length;
      this._triggerProgress(90);
      
      // 渲染UI
      this._renderUI();
      this._triggerProgress(100);
      
      this._triggerLoad();
    } catch (error) {
      this._triggerError(error);
      throw error;
    }
  }
  
  /**
   * 获取ArrayBuffer
   * @param {ArrayBuffer|File} file 
   * @returns {Promise<ArrayBuffer>}
   */
  async _getArrayBuffer(file) {
    if (file instanceof ArrayBuffer) {
      return file;
    }
    
    if (file instanceof File) {
      return file.arrayBuffer();
    }
    
    throw new Error('不支持的文件类型');
  }
  
  /**
   * 检测文件编码
   * @param {ArrayBuffer} buffer 
   * @returns {string} 编码名称
   */
  _detectEncoding(buffer) {
    const uint8Array = new Uint8Array(buffer);
    
    // 检测BOM标记
    if (uint8Array.length >= 3) {
      // UTF-8 BOM: EF BB BF
      if (uint8Array[0] === 0xEF && uint8Array[1] === 0xBB && uint8Array[2] === 0xBF) {
        return 'utf-8';
      }
      
      // UTF-16LE BOM: FF FE
      if (uint8Array[0] === 0xFF && uint8Array[1] === 0xFE) {
        return 'utf-16le';
      }
      
      // UTF-16BE BOM: FE FF
      if (uint8Array[0] === 0xFE && uint8Array[1] === 0xFF) {
        return 'utf-16be';
      }
    }
    
    // 尝试常见编码解码，选择成功的一个
    for (const encoding of COMMON_ENCODINGS) {
      try {
        const decoder = new TextDecoder(encoding, { fatal: true });
        decoder.decode(buffer.slice(0, Math.min(1024, buffer.length)));
        return encoding;
      } catch (e) {
        // 继续尝试下一个编码
      }
    }
    
    // 默认使用UTF-8（非严格模式）
    return 'utf-8';
  }
  
  /**
   * 解码文本内容
   * @param {ArrayBuffer} buffer 
   * @param {string} encoding 
   * @returns {string}
   */
  _decodeText(buffer, encoding) {
    try {
      const decoder = new TextDecoder(encoding, { fatal: false });
      return decoder.decode(buffer);
    } catch (error) {
      // 如果解码失败，尝试使用默认编码
      try {
        const decoder = new TextDecoder('utf-8');
        return decoder.decode(buffer);
      } catch (e) {
        throw new Error('文本解码失败：' + e.message);
      }
    }
  }
  
  /**
   * 渲染UI
   */
  _renderUI() {
    this.container.innerHTML = `
      <div class="txt-preview-toolbar">
        <div class="txt-info">
          <span class="txt-encoding">编码: ${this.encoding}</span>
          <span class="txt-lines">行数: ${this.lineCount}</span>
        </div>
        <div class="txt-search">
          <input type="text" class="txt-search-input" placeholder="搜索文本...">
          <button class="txt-search-btn">搜索</button>
          <button class="txt-search-prev">上一个</button>
          <button class="txt-search-next">下一个</button>
          <span class="txt-search-count"></span>
        </div>
        <div class="txt-options">
          <label class="txt-line-numbers-toggle">
            <input type="checkbox" ${this.showLineNumbers ? 'checked' : ''}>
            显示行号
          </label>
        </div>
      </div>
      <div class="txt-preview-content">
        ${this.showLineNumbers ? '<div class="txt-line-numbers"></div>' : ''}
        <div class="txt-text-content"></div>
      </div>
    `;
    
    // 显示文本内容
    this._renderText();
    
    // 绑定事件
    this._bindEvents();
  }
  
  /**
   * 渲染文本内容
   */
  _renderText() {
    const textContentEl = this.container.querySelector('.txt-text-content');
    if (!textContentEl) return;
    
    // 处理HTML特殊字符
    const escapedText = this._escapeHtml(this.textContent);
    textContentEl.innerHTML = escapedText;
    
    // 如果需要显示行号
    if (this.showLineNumbers) {
      this._renderLineNumbers();
    }
    
    // 如果有搜索结果，高亮显示
    if (this.searchKeyword) {
      this._highlightSearchResults();
    }
  }
  
  /**
   * 渲染行号
   */
  _renderLineNumbers() {
    const lineNumbersEl = this.container.querySelector('.txt-line-numbers');
    if (!lineNumbersEl) return;
    
    const lines = this.textContent.split('\n');
    lineNumbersEl.innerHTML = lines
      .map((_, index) => `<div class="txt-line-number">${index + 1}</div>`)
      .join('');
  }
  
  /**
   * 转义HTML特殊字符
   * @param {string} text 
   * @returns {string}
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * 高亮搜索结果
   */
  _highlightSearchResults() {
    const textContentEl = this.container.querySelector('.txt-text-content');
    if (!textContentEl || !this.searchKeyword) return;
    
    const lines = this.textContent.split('\n');
    this.searchResults = [];
    
    lines.forEach((line, lineIndex) => {
      const regex = new RegExp(this._escapeRegex(this.searchKeyword), 'gi');
      let match;
      let startIndex = 0;
      
      while ((match = regex.exec(line)) !== null) {
        this.searchResults.push({
          lineIndex: lineIndex + 1,
          startIndex: match.index,
          endIndex: match.index + match[0].length
        });
      }
    });
    
    this._updateSearchInfo();
    
    // 高亮显示
    if (this.searchResults.length > 0) {
      const highlightedText = this.textContent.replace(
        new RegExp(this._escapeRegex(this.searchKeyword), 'gi'),
        match => `<span class="txt-search-highlight">${match}</span>`
      );
      textContentEl.innerHTML = highlightedText.split('\n').join('<br>');
    }
  }
  
  /**
   * 转义正则特殊字符
   * @param {string} str 
   * @returns {string}
   */
  _escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  /**
   * 更新搜索信息
   */
  _updateSearchInfo() {
    const searchCountEl = this.container.querySelector('.txt-search-count');
    if (searchCountEl) {
      if (this.searchResults.length === 0) {
        searchCountEl.textContent = '未找到匹配项';
      } else {
        const current = this.currentSearchIndex + 1;
        searchCountEl.textContent = `${current}/${this.searchResults.length}`;
      }
    }
  }
  
  /**
   * 绑定事件
   */
  _bindEvents() {
    // 搜索按钮
    const searchBtn = this.container.querySelector('.txt-search-btn');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => this._performSearch());
    }
    
    // 搜索输入框回车
    const searchInput = this.container.querySelector('.txt-search-input');
    if (searchInput) {
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this._performSearch();
        }
      });
    }
    
    // 上一个搜索结果
    const searchPrev = this.container.querySelector('.txt-search-prev');
    if (searchPrev) {
      searchPrev.addEventListener('click', () => this._navigateSearch(-1));
    }
    
    // 下一个搜索结果
    const searchNext = this.container.querySelector('.txt-search-next');
    if (searchNext) {
      searchNext.addEventListener('click', () => this._navigateSearch(1));
    }
    
    // 行号切换
    const lineNumbersToggle = this.container.querySelector('.txt-line-numbers-toggle input');
    if (lineNumbersToggle) {
      lineNumbersToggle.addEventListener('change', (e) => {
        this.showLineNumbers = e.target.checked;
        this._toggleLineNumbers();
      });
    }
    
    // 滚动同步（如果有行号）
    if (this.showLineNumbers) {
      const textContentEl = this.container.querySelector('.txt-text-content');
      const lineNumbersEl = this.container.querySelector('.txt-line-numbers');
      
      if (textContentEl && lineNumbersEl) {
        textContentEl.addEventListener('scroll', () => {
          lineNumbersEl.scrollTop = textContentEl.scrollTop;
        });
      }
    }
  }
  
  /**
   * 执行搜索
   */
  _performSearch() {
    const searchInput = this.container.querySelector('.txt-search-input');
    if (!searchInput) return;
    
    this.searchKeyword = searchInput.value.trim();
    this.currentSearchIndex = -1;
    
    if (this.searchKeyword) {
      this._renderText();
      
      if (this.searchResults.length > 0) {
        this._navigateSearch(1);
      }
    } else {
      this._renderText();
    }
  }
  
  /**
   * 导航搜索结果
   * @param {number} direction - 方向（1: 下一个, -1: 上一个）
   */
  _navigateSearch(direction) {
    if (this.searchResults.length === 0) return;
    
    this.currentSearchIndex += direction;
    
    // 循环导航
    if (this.currentSearchIndex >= this.searchResults.length) {
      this.currentSearchIndex = 0;
    } else if (this.currentSearchIndex < 0) {
      this.currentSearchIndex = this.searchResults.length - 1;
    }
    
    this._updateSearchInfo();
    this._scrollToSearchResult();
  }
  
  /**
   * 滚动到搜索结果
   */
  _scrollToSearchResult() {
    const result = this.searchResults[this.currentSearchIndex];
    if (!result) return;
    
    const textContentEl = this.container.querySelector('.txt-text-content');
    if (!textContentEl) return;
    
    const lines = textContentEl.querySelectorAll('.txt-line') || textContentEl.children;
    const targetLine = lines[result.lineIndex - 1];
    
    if (targetLine) {
      targetLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetLine.classList.add('txt-current-result');
      
      // 移除其他高亮
      setTimeout(() => {
        targetLine.classList.remove('txt-current-result');
      }, 2000);
    }
  }
  
  /**
   * 切换行号显示
   */
  _toggleLineNumbers() {
    const previewContent = this.container.querySelector('.txt-preview-content');
    
    if (this.showLineNumbers) {
      if (!previewContent.querySelector('.txt-line-numbers')) {
        const lineNumbersDiv = document.createElement('div');
        lineNumbersDiv.className = 'txt-line-numbers';
        previewContent.insertBefore(lineNumbersDiv, previewContent.firstChild);
        this._renderLineNumbers();
      }
    } else {
      const lineNumbersEl = previewContent.querySelector('.txt-line-numbers');
      if (lineNumbersEl) {
        lineNumbersEl.remove();
      }
    }
  }
  
  /**
   * 渲染页面（对于TXT，不需要分页）
   * @param {number} pageIndex - 页面索引（忽略）
   */
  async renderPage(pageIndex) {
    // TXT文件不需要分页，全部内容已在load时渲染
    // 此方法保留以符合基类接口
    return;
  }
  
  /**
   * 获取总行数
   * @returns {number}
   */
  getLineCount() {
    return this.lineCount;
  }
  
  /**
   * 获取文本编码
   * @returns {string}
   */
  getEncoding() {
    return this.encoding;
  }
  
  /**
   * 设置搜索关键词
   * @param {string} keyword 
   */
  setSearchKeyword(keyword) {
    this.searchKeyword = keyword;
    this.currentSearchIndex = -1;
    this._renderText();
  }
  
  /**
   * 设置是否显示行号
   * @param {boolean} show 
   */
  setShowLineNumbers(show) {
    this.showLineNumbers = show;
    this._toggleLineNumbers();
    
    const checkbox = this.container.querySelector('.txt-line-numbers-toggle input');
    if (checkbox) {
      checkbox.checked = show;
    }
  }
  
  /**
   * 销毁实例
   */
  destroy() {
    super.destroy();
    this.textContent = '';
    this.searchResults = [];
  }
}

export default TXTPreviewer;
