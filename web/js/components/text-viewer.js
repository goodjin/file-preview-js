/**
 * 文本查看器组件
 * 显示纯文本内容，支持行号和虚拟滚动
 */
class TextViewer {
  constructor(options = {}) {
    this.container = options.container;
    this.lineHeight = options.lineHeight || 20;
    this.visibleLines = 50;
  }

  /**
   * 渲染文本内容
   */
  render(content) {
    this.container.innerHTML = "";
    
    const wrapper = document.createElement("div");
    wrapper.className = "text-viewer";
    wrapper.style.display = "flex";
    wrapper.style.height = "100%";
    wrapper.style.overflow = "hidden";
    wrapper.style.fontFamily = "monospace";
    wrapper.style.fontSize = "13px";
    wrapper.style.backgroundColor = "#1e1e1e";
    wrapper.style.color = "#d4d4d4";

    // 行号容器
    const lineNumbers = document.createElement("div");
    lineNumbers.className = "text-viewer-line-numbers";
    lineNumbers.style.width = "50px";
    lineNumbers.style.backgroundColor = "#252526";
    lineNumbers.style.color = "#858585";
    lineNumbers.style.padding = "10px 0";
    lineNumbers.style.textAlign = "right";
    lineNumbers.style.paddingRight = "10px";
    lineNumbers.style.borderRight = "1px solid #3e3e42";
    lineNumbers.style.overflowY = "hidden";
    lineNumbers.style.userSelect = "none";

    // 内容容器
    const contentWrapper = document.createElement("div");
    contentWrapper.className = "text-viewer-content-wrapper";
    contentWrapper.style.flex = "1";
    contentWrapper.style.overflow = "auto";
    contentWrapper.style.padding = "10px";

    const contentDiv = document.createElement("pre");
    contentDiv.className = "text-viewer-content";
    contentDiv.style.margin = "0";
    contentDiv.style.whiteSpace = "pre-wrap";
    contentDiv.style.wordWrap = "break-word";
    contentDiv.style.fontFamily = "monospace";
    contentDiv.style.fontSize = "13px";
    contentDiv.style.lineHeight = this.lineHeight + "px";
    contentDiv.textContent = content;

    contentWrapper.appendChild(contentDiv);

    // 计算行数
    const lines = content.split("\n");
    const lineCount = lines.length;

    // 生成行号
    for (let i = 1; i <= lineCount; i++) {
      const lineNum = document.createElement("div");
      lineNum.style.height = this.lineHeight + "px";
      lineNum.style.lineHeight = this.lineHeight + "px";
      lineNum.textContent = String(i);
      lineNumbers.appendChild(lineNum);
    }

    // 同步滚动
    contentWrapper.addEventListener("scroll", () => {
      lineNumbers.scrollTop = contentWrapper.scrollTop;
    });

    wrapper.appendChild(lineNumbers);
    wrapper.appendChild(contentWrapper);
    this.container.appendChild(wrapper);
  }
}

// 导出
if (typeof module !== "undefined" && module.exports) {
  module.exports = TextViewer;
}
