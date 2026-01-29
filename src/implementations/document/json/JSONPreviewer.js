/**
 * JSON文件预览器
 * 支持JSON格式化显示、语法高亮、折叠/展开节点
 */
class JSONPreviewer extends DocumentPreviewer {
  constructor(options) {
    super(options);
    this.jsonData = null;
    this.nodeId = 0;
  }

  /**
   * 加载JSON文件
   * @param {ArrayBuffer|File} file - 文件数据
   */
  async load(file) {
    if (this.destroyed) return;

    try {
      this._triggerProgress(10);

      let content;
      if (file instanceof ArrayBuffer) {
        const decoder = new TextDecoder('utf-8');
        content = decoder.decode(file);
      } else if (file instanceof File) {
        content = await file.text();
      } else {
        throw new Error('不支持的文件类型');
      }

      this._triggerProgress(50);

      try {
        this.jsonData = JSON.parse(content);
        this._triggerProgress(100);
        this._triggerLoad();
      } catch (parseError) {
        const errorMessage = `JSON格式错误: ${parseError.message}`;
        const errorDetails = parseError.message.match(/position (\d+)/);
        if (errorDetails) {
          const position = parseInt(errorDetails[1]);
          const before = content.substring(Math.max(0, position - 20), position);
          const after = content.substring(position, Math.min(content.length, position + 20));
          throw new Error(`${errorMessage}\n  位置: ${position}\n  上下文: ...${before}[这里]${after}...`);
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      this._triggerError(error);
      throw error;
    }
  }

  /**
   * 渲染JSON内容
   * @param {number} pageIndex - 页面索引（JSON不分页，忽略此参数）
   */
  async renderPage(pageIndex) {
    if (this.destroyed || !this.jsonData) return;

    this.container.innerHTML = '';
    this.nodeId = 0;

    const wrapper = document.createElement('div');
    wrapper.className = 'json-viewer';
    wrapper.style.cssText = `
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.5;
      padding: 20px;
      overflow: auto;
      max-height: 100vh;
      background-color: #f5f5f5;
      color: #24292e;
    `;

    const jsonHtml = this._formatJson(this.jsonData, 0);
    wrapper.innerHTML = jsonHtml;

    this._addEventListeners(wrapper);
    this.container.appendChild(wrapper);
  }

  /**
   * 格式化JSON数据为HTML
   * @param {any} data - JSON数据
   * @param {number} indent - 缩进层级
   * @returns {string} HTML字符串
   */
  _formatJson(data, indent) {
    const indentStr = '  '.repeat(indent);

    if (data === null) {
      return `<span style="color: #6a737d">null</span>`;
    }

    if (typeof data === 'boolean') {
      return `<span style="color: #005cc5">${data}</span>`;
    }

    if (typeof data === 'number') {
      return `<span style="color: #005cc5">${data}</span>`;
    }

    if (typeof data === 'string') {
      return `<span style="color: #22863a">"${this._escapeHtml(data)}"</span>`;
    }

    if (Array.isArray(data)) {
      return this._formatArray(data, indent);
    }

    if (typeof data === 'object') {
      return this._formatObject(data, indent);
    }

    return String(data);
  }

  /**
   * 格式化数组
   */
  _formatArray(arr, indent) {
    if (arr.length === 0) {
      return '[]';
    }

    const id = `node-${this.nodeId++}`;
    const indentStr = '  '.repeat(indent);
    const nextIndentStr = '  '.repeat(indent + 1);
    const children = arr.map(item => this._formatJson(item, indent + 1)).join(',\n' + nextIndentStr);

    return `<div class="json-node" data-id="${id}">
<span class="json-toggle">▼</span><span class="json-bracket">[</span>
<div class="json-content">
${nextIndentStr}${children}
</div>
${indentStr}<span class="json-bracket">]</span>
</div>`;
  }

  /**
   * 格式化对象
   */
  _formatObject(obj, indent) {
    const keys = Object.keys(obj);
    if (keys.length === 0) {
      return '{}';
    }

    const id = `node-${this.nodeId++}`;
    const indentStr = '  '.repeat(indent);
    const nextIndentStr = '  '.repeat(indent + 1);
    const entries = keys.map(key => {
      const keyHtml = `<span style="color: #d73a49">"${this._escapeHtml(key)}"</span>`;
      const valueHtml = this._formatJson(obj[key], indent + 1);
      return `${keyHtml}: ${valueHtml}`;
    }).join(',\n' + nextIndentStr);

    return `<div class="json-node" data-id="${id}">
<span class="json-toggle">▼</span><span class="json-bracket">{</span>
<div class="json-content">
${nextIndentStr}${entries}
</div>
${indentStr}<span class="json-bracket">}</span>
</div>`;
  }

  /**
   * 转义HTML特殊字符
   */
  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * 添加折叠/展开事件监听和样式
   */
  _addEventListeners(wrapper) {
    const style = document.createElement('style');
    style.textContent = `
      .json-node {
        position: relative;
        margin-left: 20px;
      }
      .json-toggle {
        position: absolute;
        left: -20px;
        cursor: pointer;
        user-select: none;
        color: #005cc5;
        font-family: monospace;
        font-size: 12px;
        display: inline-block;
        width: 20px;
      }
      .json-node.collapsed > .json-content {
        display: none !important;
      }
      .json-node.collapsed > .json-bracket:last-of-type {
        display: inline;
      }
      .json-node.collapsed > .json-toggle::after {
        content: ' ...';
        color: #6a737d;
      }
      .json-node:not(.collapsed) > .json-toggle::after {
        content: '';
      }
      .json-content {
        display: block;
      }
    `;
    wrapper.appendChild(style);

    wrapper.querySelectorAll('.json-toggle').forEach(toggle => {
      const node = toggle.closest('.json-node');
      if (node) {
        toggle.addEventListener('click', (e) => {
          e.stopPropagation();
          node.classList.toggle('collapsed');
          toggle.textContent = node.classList.contains('collapsed') ? '▶' : '▼';
        });
      }
    });
  }

  /**
   * 获取JSON数据
   */
  getJsonData() {
    return this.jsonData;
  }
}

export default JSONPreviewer;
