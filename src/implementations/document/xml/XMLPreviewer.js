/**
 * XML文件预览器
 * 支持格式化显示、语法高亮、折叠/展开、错误提示
 */
import DocumentPreviewer from '../DocumentPreviewer.js';

class XMLPreviewer extends DocumentPreviewer {
  constructor(options) {
    super(options);
    this.xmlDoc = null;
    this.formattedHTML = '';
    this.lineCount = 0;
  }

  async load(file) {
    try {
      this._triggerProgress(20);

      let content = '';
      if (file instanceof ArrayBuffer) {
        content = new TextDecoder().decode(file);
      } else if (file instanceof File) {
        content = await file.text();
      } else {
        throw new Error('不支持的文件类型');
      }

      this._triggerProgress(40);

      // 解析XML
      const parser = new DOMParser();
      this.xmlDoc = parser.parseFromString(content, 'text/xml');

      // 检查解析错误
      const parserError = this.xmlDoc.querySelector('parsererror');
      if (parserError) {
        const errorMsg = parserError.textContent || 'XML格式错误';
        throw new Error(`XML解析失败: ${errorMsg}`);
      }

      this._triggerProgress(60);

      // 格式化XML并添加语法高亮
      this.formattedHTML = this._formatXML(this.xmlDoc.documentElement);
      this.lineCount = this.formattedHTML.split('\n').length;

      this._triggerProgress(100);

      // 渲染到容器
      this._render();

      this._triggerLoad();
    } catch (error) {
      this._renderError(error.message);
      this._triggerError(error);
      throw error;
    }
  }

  async renderPage(pageIndex) {
    // XML预览不需要分页，整个文件作为一个页面
    if (pageIndex === 0) {
      this._render();
      return;
    }
    throw new Error('XML预览只支持单页');
  }

  _formatXML(node, level = 0) {
    const indent = '  '.repeat(level);
    const childIndent = '  '.repeat(level + 1);

    if (node.nodeType === Node.ELEMENT_NODE) {
      // 处理元素节点
      const tagName = this._escapeHTML(node.tagName);
      const attrs = this._formatAttributes(node);
      const children = Array.from(node.childNodes);
      const textNodes = children.filter(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
      const elementChildren = children.filter(n => n.nodeType === Node.ELEMENT_NODE);

      let result = '';

      if (elementChildren.length === 0 && textNodes.length === 0) {
        // 空标签
        result = `<span class="xml-tag">&lt;${tagName}${attrs} /&gt;</span>\n`;
      } else if (elementChildren.length === 0 && textNodes.length === 1) {
        // 只有文本内容
        const text = this._escapeHTML(textNodes[0].textContent.trim());
        result = `<span class="xml-tag">&lt;${tagName}${attrs}&gt;</span><span class="xml-text">${text}</span><span class="xml-tag">&lt;/${tagName}&gt;</span>\n`;
      } else {
        // 有子元素
        result = `<span class="xml-tag">&lt;${tagName}${attrs}&gt;</span>\n`;
        result += `<span class="xml-collapsible" data-level="${level + 1}">`;
        
        for (const child of children) {
          if (child.nodeType === Node.ELEMENT_NODE) {
            result += childIndent + this._formatXML(child, level + 1);
          } else if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) {
            const text = this._escapeHTML(child.textContent.trim());
            result += childIndent + `<span class="xml-text">${text}</span>\n`;
          } else if (child.nodeType === Node.COMMENT_NODE) {
            const comment = this._escapeHTML(child.textContent);
            result += childIndent + `<span class="xml-comment">&lt;!-- ${comment} --&gt;</span>\n`;
          }
        }
        
        result += `</span>`;
        result += indent + `<span class="xml-tag">&lt;/${tagName}&gt;</span>\n`;
      }

      return result;
    } else if (node.nodeType === Node.DOCUMENT_NODE) {
      // 处理文档节点
      let result = '';
      for (const child of node.childNodes) {
        if (child.nodeType === Node.ELEMENT_NODE) {
          result += this._formatXML(child, level);
        } else if (child.nodeType === Node.PROCESSING_INSTRUCTION_NODE) {
          const target = child.target;
          const data = this._escapeHTML(child.data);
          result += `<span class="xml-decl">&lt;?${target} ${data} ?&gt;</span>\n`;
        }
      }
      return result;
    }

    return '';
  }

  _formatAttributes(node) {
    const attrs = [];
    for (const attr of Array.from(node.attributes)) {
      const name = this._escapeHTML(attr.name);
      const value = this._escapeHTML(attr.value);
      attrs.push(`<span class="xml-attr-name">${name}</span>=<span class="xml-attr-value">"${value}"</span>`);
    }
    return attrs.length ? ' ' + attrs.join(' ') : '';
  }

  _escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  _render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <style>
        .xml-preview {
          font-family: 'Courier New', 'Consolas', 'Monaco', monospace;
          font-size: 13px;
          line-height: 1.6;
          padding: 20px;
          background-color: #f5f5f5;
          overflow: auto;
          white-space: pre-wrap;
          word-break: break-all;
        }
        .xml-tag {
          color: #0066cc;
        }
        .xml-attr-name {
          color: #ff6600;
        }
        .xml-attr-value {
          color: #009900;
        }
        .xml-text {
          color: #333333;
        }
        .xml-comment {
          color: #999999;
          font-style: italic;
        }
        .xml-decl {
          color: #9933cc;
        }
        .xml-collapsible {
          display: block;
        }
        .xml-collapsible.collapsed {
          display: none;
        }
        .xml-toggle {
          cursor: pointer;
          user-select: none;
          display: inline-block;
          width: 16px;
          text-align: center;
          color: #666;
          margin-right: 4px;
          font-weight: bold;
        }
        .xml-toggle:hover {
          color: #0066cc;
        }
        .xml-error {
          padding: 20px;
          background-color: #ffebee;
          border: 1px solid #ffcdd2;
          border-radius: 4px;
          color: #c62828;
        }
        .xml-error-title {
          font-weight: bold;
          margin-bottom: 10px;
        }
        .xml-line-numbers {
          display: inline-block;
          color: #999;
          text-align: right;
          padding-right: 10px;
          user-select: none;
          border-right: 1px solid #ddd;
          margin-right: 10px;
          min-width: 40px;
        }
        .xml-line-number {
          display: block;
        }
        .xml-line {
          display: flex;
        }
        .xml-line-content {
          flex: 1;
        }
      </style>
      <div class="xml-preview"></div>
    `;

    const previewEl = this.container.querySelector('.xml-preview');
    const lines = this.formattedHTML.split('\n').filter(line => line.trim());
    
    let lineNumbersHTML = '<div class="xml-line-numbers">';
    let contentHTML = '<div class="xml-line-content">';
    
    lines.forEach((line, index) => {
      lineNumbersHTML += `<span class="xml-line-number">${index + 1}</span>`;
      
      // 添加折叠/展开按钮（仅对包含子元素的行）
      if (line.includes('<span class="xml-tag">&lt;') && 
          !line.includes('/&gt;') && 
          !line.includes('&lt;/')) {
        const toggleBtn = `<span class="xml-toggle" data-line="${index}">[-]</span>`;
        contentHTML += `<div class="xml-line">${toggleBtn}${line}</div>`;
      } else {
        contentHTML += `<div class="xml-line"><span class="xml-toggle"> </span>${line}</div>`;
      }
    });
    
    lineNumbersHTML += '</div>';
    contentHTML += '</div>';
    
    previewEl.innerHTML = lineNumbersHTML + contentHTML;

    // 绑定折叠/展开事件
    this._bindToggleEvents();
  }

  _bindToggleEvents() {
    const toggles = this.container.querySelectorAll('.xml-toggle[data-line]');
    toggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        const line = e.target.closest('.xml-line');
        if (!line) return;

        const content = line.querySelector('.xml-line-content');
        if (!content) return;

        // 找到对应的可折叠区域
        const collapsibles = content.querySelectorAll('.xml-collapsible');
        if (collapsibles.length === 0) return;

        const collapsible = collapsibles[0];
        const isCollapsed = collapsible.classList.contains('collapsed');

        if (isCollapsed) {
          collapsible.classList.remove('collapsed');
          e.target.textContent = '[-]';
        } else {
          collapsible.classList.add('collapsed');
          e.target.textContent = '[+]';
        }
      });
    });
  }

  _renderError(message) {
    if (!this.container) return;

    this.container.innerHTML = `
      <style>
        .xml-error {
          padding: 20px;
          background-color: #ffebee;
          border: 1px solid #ffcdd2;
          border-radius: 4px;
          color: #c62828;
        }
        .xml-error-title {
          font-weight: bold;
          font-size: 16px;
          margin-bottom: 10px;
        }
        .xml-error-message {
          line-height: 1.6;
        }
      </style>
      <div class="xml-error">
        <div class="xml-error-title">XML解析错误</div>
        <div class="xml-error-message">${this._escapeHTML(message)}</div>
      </div>
    `;
  }

  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.xmlDoc = null;
    this.formattedHTML = '';
    this.lineCount = 0;
    super.destroy();
  }
}

export default XMLPreviewer;
