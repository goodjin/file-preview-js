/**
 * XlsxRenderer - xlsx渲染器
 * 将解析结果渲染为HTML表格
 */

export class XlsxRenderer {
  constructor() {
    this.container = null;
    this.parseResult = null;
    this.currentSheetIndex = 0;
  }

  /**
   * 初始化渲染器
   * @param {Object} parseResult - 解析器返回的结果
   */
  init(parseResult) {
    this.parseResult = parseResult;
    this.currentSheetIndex = parseResult.currentSheetIndex;
  }

  /**
   * 渲染到指定容器
   * @param {HTMLElement} container - DOM容器
   */
  render(container) {
    this.container = container;
    container.innerHTML = '';
    container.className = 'xlsx-preview-container';

    // 创建工作表标签容器
    const tabsContainer = this._createSheetTabs();
    container.appendChild(tabsContainer);

    // 创建表格容器
    const tableContainer = this._createTableContainer();
    container.appendChild(tableContainer);

    // 渲染当前工作表
    this._renderCurrentSheet();
  }

  /**
   * 创建工作表标签
   */
  _createSheetTabs() {
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'xlsx-sheet-tabs';

    this.parseResult.sheets.forEach((sheet, index) => {
      const tab = document.createElement('button');
      tab.className = `sheet-tab ${index === this.currentSheetIndex ? 'active' : ''}`;
      tab.textContent = sheet.name;
      tab.onclick = () => this.switchSheet(index);
      tabsContainer.appendChild(tab);
    });

    return tabsContainer;
  }

  /**
   * 创建表格容器
   */
  _createTableContainer() {
    const tableContainer = document.createElement('div');
    tableContainer.className = 'xlsx-table-container';
    return tableContainer;
  }

  /**
   * 渲染当前工作表
   */
  _renderCurrentSheet() {
    const tableContainer = this.container.querySelector('.xlsx-table-container');
    tableContainer.innerHTML = '';

    const sheet = this.parseResult.sheets[this.currentSheetIndex];
    const table = this._createTable(sheet);
    tableContainer.appendChild(table);
  }

  /**
   * 创建HTML表格
   */
  _createTable(sheet) {
    const table = document.createElement('table');
    table.className = 'xlsx-table';

    sheet.data.forEach((row, rowIndex) => {
      const tr = document.createElement('tr');
      row.forEach((cell, colIndex) => {
        const td = this._createCell(cell, rowIndex, colIndex, sheet);
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });

    return table;
  }

  /**
   * 创建单元格
   */
  _createCell(cell, rowIndex, colIndex, sheet) {
    const isMerged = this._checkMergedCell(rowIndex, colIndex, sheet.mergedCells);
    
    let cellEl;
    if (isMerged) {
      cellEl = this._createMergedCell(cell, rowIndex, colIndex, sheet.mergedCells);
    } else {
      cellEl = document.createElement('td');
      cellEl.textContent = cell.value;
      
      if (rowIndex === 0) {
        cellEl.className = 'header-cell';
      }
    }

    // 应用样式
    if (cell.style) {
      this._applyCellStyle(cellEl, cell.style);
    }

    return cellEl;
  }

  /**
   * 检查是否是合并单元格
   */
  _checkMergedCell(row, col, mergedCells) {
    return mergedCells.some(m => 
      row >= m.startRow && row <= m.endRow &&
      col >= m.startCol && col <= m.endCol
    );
  }

  /**
   * 创建合并单元格
   */
  _createMergedCell(cell, row, col, mergedCells) {
    const merge = mergedCells.find(m => 
      row >= m.startRow && row <= m.endRow &&
      col >= m.startCol && col <= m.endCol
    );

    const cellEl = document.createElement('td');
    cellEl.textContent = cell.value;
    
    if (row === merge.startRow && col === merge.startCol) {
      cellEl.rowSpan = merge.endRow - merge.startRow + 1;
      cellEl.colSpan = merge.endCol - merge.startCol + 1;
    } else {
      cellEl.style.display = 'none';
    }

    return cellEl;
  }

  /**
   * 应用单元格样式
   */
  _applyCellStyle(cellEl, style) {
    if (style.font) {
      cellEl.style.fontFamily = style.font.name;
      cellEl.style.fontSize = `${style.font.size}pt`;
      cellEl.style.fontWeight = style.font.bold ? 'bold' : 'normal';
      cellEl.style.fontStyle = style.font.italic ? 'italic' : 'normal';
      if (style.font.color) {
        cellEl.style.color = `#${style.font.color}`;
      }
    }

    if (style.fill && style.fill.color) {
      cellEl.style.backgroundColor = `#${style.fill.color}`;
    }

    if (style.alignment) {
      cellEl.style.textAlign = style.alignment.horizontal || 'left';
      cellEl.style.verticalAlign = style.alignment.vertical || 'middle';
      cellEl.style.whiteSpace = style.alignment.wrapText ? 'pre-wrap' : 'nowrap';
    }
  }

  /**
   * 切换工作表
   * @param {number} sheetIndex - 工作表索引
   */
  switchSheet(sheetIndex) {
    if (sheetIndex < 0 || sheetIndex >= this.parseResult.sheets.length) {
      return;
    }

    this.currentSheetIndex = sheetIndex;

    // 更新标签样式
    const tabs = this.container.querySelectorAll('.sheet-tab');
    tabs.forEach((tab, index) => {
      tab.className = `sheet-tab ${index === sheetIndex ? 'active' : ''}`;
    });

    // 重新渲染表格
    this._renderCurrentSheet();
  }

  /**
   * 获取当前工作表索引
   */
  getCurrentSheetIndex() {
    return this.currentSheetIndex;
  }

  /**
   * 获取工作表数量
   */
  getSheetCount() {
    return this.parseResult.sheets.length;
  }

  /**
   * 销毁渲染器
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
      this.container = null;
    }
    this.parseResult = null;
  }
}
