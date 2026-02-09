/**
 * Excel预览器
 * 支持xls, xlsx, csv格式预览
 * 
 * @description 使用xlsx库解析Excel文档并渲染为表格
 * @module ExcelPreviewer
 * @version 1.0.0
 */

// 导入xlsx库（将通过npm安装）
// import * as XLSX from 'xlsx';

/**
 * Excel预览器类
 * @class ExcelPreviewer
 */
export class ExcelPreviewer {
  /**
   * 创建Excel预览器实例
   * @param {Object} options - 预览器选项
   * @param {EventBus} options.eventBus - 事件总线实例
   * @param {StateManager} options.stateManager - 状态管理器实例
   */
  constructor(options = {}) {
    this.eventBus = options.eventBus;
    this.stateManager = options.stateManager;
    this.sheets = [];
    this.currentSheet = 0;
    this.currentPage = 1;
  }

  /**
   * 加载Excel文档
   * @param {File} file - 文件对象
   * @returns {Promise<Object>} 加载结果
   */
  async load(file) {
    try {
      this.emitProgress(10);

      const ext = file.name.split('.').pop().toLowerCase();

      // 读取文件为ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      this.emitProgress(30);

      // TODO: 使用xlsx库解析Excel文档
      // const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      // 
      // 获取所有工作表
      // const sheetNames = workbook.SheetNames;
      // 
      // 解析每个工作表
      // this.sheets = sheetNames.map(name => {
      //   const sheet = workbook.Sheets[name];
      //   const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      //   
      //   // 提取表头
      //   const headers = data.length > 0 ? Object.keys(data[0]) : [];
      //   
      //   // 提取数据行
      //   const rows = data.map(row => Object.values(row));
      //   
      //   return {
      //     name,
      //     headers,
      //     rows,
      //     rowCount: rows.length
      //   };
      // });

      this.emitProgress(50);

      // 模拟xlsx解析结果（临时实现）
      const mockSheets = this.mockXlsxParse(file.name, ext);
      this.sheets = mockSheets;
      this.currentSheet = 0;

      this.emitProgress(100);

      return {
        type: 'excel',
        ext,
        sheets: this.sheets,
        numSheets: this.sheets.length,
        currentSheet: this.currentSheet
      };
    } catch (error) {
      this.emitError(error, 'Failed to load Excel document');
      throw error;
    }
  }

  /**
   * 模拟xlsx解析结果（临时实现）
   * @param {string} fileName - 文件名
   * @param {string} ext - 文件扩展名
   * @returns {Array<Object>} 工作表数据
   */
  mockXlsxParse(fileName, ext) {
    // 实际实现中，这里会调用XLSX.read()和XLSX.utils.sheet_to_json()
    return [
      {
        name: 'Sheet1',
        headers: ['Name', 'Age', 'City', 'Occupation', 'Email'],
        rows: [
          ['Alice', 28, 'New York', 'Engineer', 'alice@example.com'],
          ['Bob', 32, 'Los Angeles', 'Designer', 'bob@example.com'],
          ['Charlie', 25, 'Chicago', 'Developer', 'charlie@example.com'],
          ['David', 30, 'Boston', 'Manager', 'david@example.com'],
          ['Eve', 27, 'Seattle', 'Analyst', 'eve@example.com'],
          ['Frank', 35, 'Miami', 'Director', 'frank@example.com'],
          ['Grace', 29, 'Atlanta', 'Consultant', 'grace@example.com'],
          ['Henry', 31, 'Denver', 'Engineer', 'henry@example.com'],
          ['Ivy', 26, 'Phoenix', 'Designer', 'ivy@example.com'],
          ['Jack', 33, 'Dallas', 'Developer', 'jack@example.com']
        ],
        rowCount: 10,
        colCount: 5
      },
      {
        name: 'Sheet2',
        headers: ['Product', 'Price', 'Stock', 'Category'],
        rows: [
          ['Laptop', '999.99', '50', 'Electronics'],
          ['Mouse', '29.99', '200', 'Accessories'],
          ['Keyboard', '79.99', '100', 'Accessories'],
          ['Monitor', '299.99', '75', 'Electronics'],
          ['Headphones', '149.99', '120', 'Accessories'],
          ['Webcam', '89.99', '80', 'Electronics'],
          ['USB Cable', '9.99', '500', 'Accessories'],
          ['Power Adapter', '19.99', '150', 'Accessories'],
          ['External Drive', '79.99', '90', 'Electronics'],
          ['HDMI Cable', '12.99', '300', 'Accessories']
        ],
        rowCount: 10,
        colCount: 4
      }
    ];
  }

  /**
   * 渲染Excel预览
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
      wrapper.className = 'excel-preview';

      // 创建工作表选择器
      if (data.sheets && data.sheets.length > 1) {
        const sheetTabs = this.createSheetTabs(data.sheets, data.currentSheet);
        wrapper.appendChild(sheetTabs);
      }

      // 创建表格
      const tableContainer = document.createElement('div');
      tableContainer.className = 'excel-table-container';

      const table = this.createTable(data.sheets[0]);
      tableContainer.appendChild(table);

      wrapper.appendChild(tableContainer);
      container.appendChild(wrapper);

      this.emitLoaded();
    } catch (error) {
      this.emitError(error, 'Failed to render Excel document');
      throw error;
    }
  }

  /**
   * 创建工作表标签页
   * @param {Array} sheets - 工作表列表
   * @param {number} currentIndex - 当前工作表索引
   * @returns {HTMLElement} 标签页元素
   */
  createSheetTabs(sheets, currentIndex) {
    const tabs = document.createElement('div');
    tabs.className = 'excel-sheet-tabs';

    sheets.forEach((sheet, index) => {
      const tab = document.createElement('div');
      tab.className = `excel-sheet-tab${index === currentIndex ? ' active' : ''}`;
      tab.textContent = sheet.name;
      tab.addEventListener('click', () => {
        this.currentSheet = index;
        this.renderCurrentSheet();
        this.updateSheetTabs(tabs, sheets, index);
      });
      tabs.appendChild(tab);
    });

    return tabs;
  }

  /**
   * 更新工作表标签页
   * @param {HTMLElement} tabs - 标签页元素
   * @param {Array} sheets - 工作表列表
   * @param {number} currentIndex - 当前工作表索引
   */
  updateSheetTabs(tabs, sheets, currentIndex) {
    const tabElements = tabs.querySelectorAll('.excel-sheet-tab');
    tabElements.forEach((tab, index) => {
      tab.classList.toggle('active', index === currentIndex);
    });
  }

  /**
   * 创建表格
   * @param {Object} sheet - 工作表数据
   * @returns {HTMLElement} 表格元素
   */
  createTable(sheet) {
    const table = document.createElement('table');
    table.className = 'excel-table';

    // 创建表头
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.className = 'excel-table-header';

    sheet.headers.forEach(header => {
      const th = document.createElement('th');
      th.textContent = header;
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // 创建表体
    const tbody = document.createElement('tbody');
    tbody.className = 'excel-table-body';

    sheet.rows.forEach((row, rowIndex) => {
      const tr = document.createElement('tr');
      tr.className = `excel-table-row${rowIndex % 2 === 0 ? ' even' : ' odd'}`;

      row.forEach((cell, cellIndex) => {
        const td = document.createElement('td');
        td.textContent = cell || '';
        td.className = 'excel-table-cell';
        
        // 为不同的单元格类型添加样式
        if (sheet.headers[cellIndex] === 'Price') {
          td.className += ' excel-cell-number';
        } else if (sheet.headers[cellIndex] === 'Stock') {
          td.className += ' excel-cell-number';
        }

        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);

    return table;
  }

  /**
   * 渲染当前工作表
   */
  renderCurrentSheet() {
    const tableContainer = document.querySelector('.excel-table-container');
    if (tableContainer && this.sheets[this.currentSheet]) {
      const table = this.createTable(this.sheets[this.currentSheet]);
      tableContainer.innerHTML = '';
      tableContainer.appendChild(table);
    }
  }

  /**
   * 获取总页数
   * @returns {number} 总页数
   */
  getTotalPages() {
    return this.sheets.length;
  }

  /**
   * 获取当前页码
   * @returns {number} 当前页码
   */
  getCurrentPage() {
    return this.currentSheet + 1;
  }

  /**
   * 转到指定工作表
   * @param {number} sheetIndex - 工作表索引
   */
  goToSheet(sheetIndex) {
    if (sheetIndex >= 0 && sheetIndex < this.sheets.length) {
      this.currentSheet = sheetIndex;
      this.renderCurrentSheet();
      this.updateCurrentPage();
    }
  }

  /**
   * 更新当前页
   */
  updateCurrentPage() {
    if (this.stateManager) {
      this.stateManager.setState('currentPage', this.getCurrentPage());
      this.stateManager.setState('totalPages', this.sheets.length);
    }

    if (this.eventBus) {
      this.eventBus.emit('page:changed', {
        currentPage: this.getCurrentPage(),
        totalPages: this.sheets.length
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
    this.sheets = [];
    this.currentSheet = 0;
  }
}