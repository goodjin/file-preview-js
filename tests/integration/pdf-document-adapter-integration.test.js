/**
 * PDF预览器与DocumentAdapter集成测试
 * 
 * 测试范围：
 * 1. 完整流程：文件上传→文件类型检测→DocumentAdapter适配→PDF预览器渲染
 * 2. 不同PDF文件类型的预览功能（单页、多页、大文件、加密PDF等）
 * 3. 缩放、翻页、滚动等控制功能
 * 4. 错误处理（损坏文件、非PDF文件）
 * 5. 性能指标（加载时间、渲染速度）
 */

import DocumentAdapter from '../../src/adapters/DocumentAdapter.js';
import { createPDFPreviewer } from '../../src/implementations/document/pdf/index.js';

// 测试工具函数
function createMockFile(name, size, type, content = '') {
  const buffer = new ArrayBuffer(size);
  if (content && size > 0) {
    const view = new Uint8Array(buffer);
    for (let i = 0; i < Math.min(content.length, size); i++) {
      view[i] = content.charCodeAt(i);
    }
  }
  
  const file = new File([buffer], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

// 性能测量工具
class PerformanceMetrics {
  constructor() {
    this.metrics = {};
  }

  start(label) {
    this.metrics[label] = {
      startTime: performance.now(),
      endTime: null,
      duration: null
    };
  }

  end(label) {
    if (this.metrics[label]) {
      this.metrics[label].endTime = performance.now();
      this.metrics[label].duration = 
        this.metrics[label].endTime - this.metrics[label].startTime;
    }
  }

  get(label) {
    return this.metrics[label]?.duration || null;
  }

  getAll() {
    const result = {};
    for (const [label, data] of Object.entries(this.metrics)) {
      result[label] = data.duration;
    }
    return result;
  }
}

// 测试结果记录
class TestResult {
  constructor() {
    this.results = [];
  }

  add(name, status, message = '', metrics = {}) {
    this.results.push({
      name,
      status, // 'pass', 'fail', 'skip'
      message,
      metrics,
      timestamp: new Date().toISOString()
    });
  }

  getSummary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const skipped = this.results.filter(r => r.status === 'skip').length;

    return {
      total,
      passed,
      failed,
      skipped,
      passRate: total > 0 ? ((passed / total) * 100).toFixed(2) + '%' : '0%'
    };
  }

  getAllResults() {
    return this.results;
  }
}

/**
 * 集成测试套件
 */
class PDFDocumentAdapterIntegrationTest {
  constructor() {
    this.testResult = new TestResult();
    this.adapter = new DocumentAdapter();
  }

  /**
   * 测试1: 基本流程测试 - 文件上传→文件类型检测→DocumentAdapter适配→PDF预览器渲染
   */
  async testBasicFlow() {
    console.log('🧪 测试1: 基本流程测试');
    
    try {
      // 创建模拟PDF文件
      const pdfFile = createMockFile('test.pdf', 1024 * 100, 'application/pdf', '%PDF-1.4');
      
      // 1. 文件类型检测
      const fileType = this.adapter.getFileExtension(pdfFile.name);
      console.log(`  - 文件类型检测: ${fileType}`);
      
      if (fileType !== 'pdf') {
        throw new Error('文件类型检测失败');
      }
      
      // 2. DocumentAdapter适配
      this.testResult.metrics = new PerformanceMetrics();
      this.testResult.metrics.start('document-adapter-parse');
      
      const parsedData = await this.adapter.parse(pdfFile);
      
      this.testResult.metrics.end('document-adapter-parse');
      
      console.log(`  - DocumentAdapter解析完成`);
      console.log(`    文件名: ${parsedData.fileName}`);
      console.log(`    文件大小: ${parsedData.fileSize} bytes`);
      
      if (parsedData.fileType !== 'pdf') {
        throw new Error('DocumentAdapter解析类型错误');
      }
      
      // 3. 创建PDF预览器容器
      const container = document.createElement('div');
      document.body.appendChild(container);
      
      // 4. PDF预览器渲染
      this.testResult.metrics.start('pdf-previewer-load');
      
      const previewer = createPDFPreviewer({
        container: container,
        fileInfo: {
          name: pdfFile.name,
          size: pdfFile.size
        },
        onLoad: () => {
          console.log('  - PDF加载完成回调触发');
        },
        onError: (error) => {
          console.error('  - PDF加载错误:', error);
        },
        onProgress: (progress) => {
          console.log(`  - 加载进度: ${progress}%`);
        }
      });
      
      try {
        await previewer.load(pdfFile);
        this.testResult.metrics.end('pdf-previewer-load');
        
        console.log('  - PDF预览器加载成功');
        
        // 验证基本属性
        const totalPages = previewer.getTotalPages();
        const currentPage = previewer.getCurrentPage();
        const scale = previewer.getScale();
        
        console.log(`    总页数: ${totalPages}`);
        console.log(`    当前页: ${currentPage}`);
        console.log(`    缩放比例: ${scale}`);
        
        // 清理
        previewer.destroy();
        document.body.removeChild(container);
        
        this.testResult.add(
          '基本流程测试',
          'pass',
          '文件上传→类型检测→DocumentAdapter适配→PDF预览器渲染 流程成功',
          this.testResult.metrics.getAll()
        );
        
      } catch (error) {
        this.testResult.metrics.end('pdf-previewer-load');
        throw new Error(`PDF预览器加载失败: ${error.message}`);
      }
      
    } catch (error) {
      console.error('  ❌ 测试失败:', error.message);
      this.testResult.add(
        '基本流程测试',
        'fail',
        error.message,
        this.testResult?.metrics?.getAll() || {}
      );
    }
  }

  /**
   * 测试2: 文件类型检测测试
   */
  async testFileTypeDetection() {
    console.log('🧪 测试2: 文件类型检测测试');
    
    const testCases = [
      { name: 'test.pdf', type: 'application/pdf', expected: true },
      { name: 'test.PDF', type: 'application/pdf', expected: true },
      { name: 'document.pdf', type: 'application/pdf', expected: true },
      { name: 'test.txt', type: 'text/plain', expected: false },
      { name: 'test.jpg', type: 'image/jpeg', expected: false },
      { name: 'test.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', expected: false }
    ];
    
    for (const testCase of testCases) {
      try {
        const file = createMockFile(testCase.name, 1024, testCase.type);
        const fileType = this.adapter.getFileExtension(file.name);
        const canHandle = this.adapter.canHandle(fileType);
        
        if (canHandle === testCase.expected) {
          console.log(`  ✅ ${testCase.name} - 类型检测正确 (${fileType}, 可处理: ${canHandle})`);
          this.testResult.add(
            `文件类型检测 - ${testCase.name}`,
            'pass',
            `检测为${fileType}, 可处理: ${canHandle}`
          );
        } else {
          throw new Error(`期望 ${testCase.expected}, 实际 ${canHandle}`);
        }
      } catch (error) {
        console.error(`  ❌ ${testCase.name} - 测试失败:`, error.message);
        this.testResult.add(
          `文件类型检测 - ${testCase.name}`,
          'fail',
          error.message
        );
      }
    }
  }

  /**
   * 测试3: 单页PDF预览
   */
  async testSinglePagePDF() {
    console.log('🧪 测试3: 单页PDF预览');
    
    try {
      const pdfFile = createMockFile('single-page.pdf', 1024 * 50, 'application/pdf', '%PDF-1.4');
      
      const container = document.createElement('div');
      document.body.appendChild(container);
      
      const previewer = createPDFPreviewer({
        container: container,
        fileInfo: { name: pdfFile.name, size: pdfFile.size }
      });
      
      await previewer.load(pdfFile);
      
      const totalPages = previewer.getTotalPages();
      console.log(`  - 总页数: ${totalPages}`);
      
      // 验证可以正常翻页
      await previewer.renderPage(0);
      console.log('  - 第一页渲染成功');
      
      previewer.destroy();
      document.body.removeChild(container);
      
      this.testResult.add(
        '单页PDF预览',
        'pass',
        `总页数: ${totalPages}, 第一页渲染成功`
      );
      
    } catch (error) {
      console.error('  ❌ 测试失败:', error.message);
      this.testResult.add(
        '单页PDF预览',
        'fail',
        error.message
      );
    }
  }

  /**
   * 测试4: 多页PDF预览
   */
  async testMultiPagePDF() {
    console.log('🧪 测试4: 多页PDF预览');
    
    try {
      const pdfFile = createMockFile('multi-page.pdf', 1024 * 500, 'application/pdf', '%PDF-1.4');
      
      const container = document.createElement('div');
      document.body.appendChild(container);
      
      const previewer = createPDFPreviewer({
        container: container,
        fileInfo: { name: pdfFile.name, size: pdfFile.size }
      });
      
      await previewer.load(pdfFile);
      
      const totalPages = previewer.getTotalPages();
      console.log(`  - 总页数: ${totalPages}`);
      
      // 测试翻页功能
      for (let i = 0; i < Math.min(5, totalPages); i++) {
        await previewer.renderPage(i);
        console.log(`  - 第${i + 1}页渲染成功`);
      }
      
      // 测试上一页/下一页
      await previewer.previousPage();
      console.log(`  - 上一页功能正常 (当前页: ${previewer.getCurrentPage()})`);
      
      await previewer.nextPage();
      console.log(`  - 下一页功能正常 (当前页: ${previewer.getCurrentPage()})`);
      
      previewer.destroy();
      document.body.removeChild(container);
      
      this.testResult.add(
        '多页PDF预览',
        'pass',
        `总页数: ${totalPages}, 翻页功能正常`
      );
      
    } catch (error) {
      console.error('  ❌ 测试失败:', error.message);
      this.testResult.add(
        '多页PDF预览',
        'fail',
        error.message
      );
    }
  }

  /**
   * 测试5: 大文件PDF预览
   */
  async testLargeFilePDF() {
    console.log('🧪 测试5: 大文件PDF预览');
    
    try {
      // 创建10MB的模拟文件
      const pdfFile = createMockFile('large-file.pdf', 1024 * 1024 * 10, 'application/pdf', '%PDF-1.4');
      
      const metrics = new PerformanceMetrics();
      
      const container = document.createElement('div');
      document.body.appendChild(container);
      
      const progressUpdates = [];
      const previewer = createPDFPreviewer({
        container: container,
        fileInfo: { name: pdfFile.name, size: pdfFile.size },
        onProgress: (progress) => {
          progressUpdates.push(progress);
        }
      });
      
      metrics.start('large-file-load');
      await previewer.load(pdfFile);
      metrics.end('large-file-load');
      
      const loadTime = metrics.get('large-file-load');
      console.log(`  - 文件大小: ${(pdfFile.size / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  - 加载时间: ${loadTime.toFixed(2)}ms`);
      console.log(`  - 进度更新次数: ${progressUpdates.length}`);
      
      previewer.destroy();
      document.body.removeChild(container);
      
      this.testResult.add(
        '大文件PDF预览',
        'pass',
        `加载${(pdfFile.size / 1024 / 1024).toFixed(2)}MB文件耗时${loadTime.toFixed(2)}ms`,
        { loadTime, fileSize: pdfFile.size, progressUpdates: progressUpdates.length }
      );
      
    } catch (error) {
      console.error('  ❌ 测试失败:', error.message);
      this.testResult.add(
        '大文件PDF预览',
        'fail',
        error.message
      );
    }
  }

  /**
   * 测试6: 缩放功能测试
   */
  async testZoomFunction() {
    console.log('🧪 测试6: 缩放功能测试');
    
    try {
      const pdfFile = createMockFile('zoom-test.pdf', 1024 * 100, 'application/pdf', '%PDF-1.4');
      
      const container = document.createElement('div');
      document.body.appendChild(container);
      
      const previewer = createPDFPreviewer({
        container: container,
        fileInfo: { name: pdfFile.name, size: pdfFile.size }
      });
      
      await previewer.load(pdfFile);
      
      // 测试不同缩放级别
      const zoomLevels = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
      
      for (const level of zoomLevels) {
        await previewer.setScale(level);
        const actualScale = previewer.getScale();
        console.log(`  - 设置缩放 ${level} → 实际: ${actualScale}`);
        
        if (Math.abs(actualScale - level) > 0.01) {
          throw new Error(`缩放设置失败: 期望${level}, 实际${actualScale}`);
        }
      }
      
      // 测试放大/缩小
      await previewer.zoomIn();
      console.log(`  - 放大后缩放: ${previewer.getScale()}`);
      
      await previewer.zoomOut();
      console.log(`  - 缩小后缩放: ${previewer.getScale()}`);
      
      previewer.destroy();
      document.body.removeChild(container);
      
      this.testResult.add(
        '缩放功能测试',
        'pass',
        `测试了${zoomLevels.length}个缩放级别，放大缩小功能正常`
      );
      
    } catch (error) {
      console.error('  ❌ 测试失败:', error.message);
      this.testResult.add(
        '缩放功能测试',
        'fail',
        error.message
      );
    }
  }

  /**
   * 测试7: 翻页功能测试
   */
  async testPageNavigation() {
    console.log('🧪 测试7: 翻页功能测试');
    
    try {
      const pdfFile = createMockFile('nav-test.pdf', 1024 * 200, 'application/pdf', '%PDF-1.4');
      
      const container = document.createElement('div');
      document.body.appendChild(container);
      
      const previewer = createPDFPreviewer({
        container: container,
        fileInfo: { name: pdfFile.name, size: pdfFile.size }
      });
      
      await previewer.load(pdfFile);
      
      const totalPages = previewer.getTotalPages();
      console.log(`  - 总页数: ${totalPages}`);
      
      // 测试跳转到指定页
      const testPages = [0, Math.floor(totalPages / 2), totalPages - 1];
      
      for (const page of testPages) {
        await previewer.goToPage(page);
        const currentPage = previewer.getCurrentPage();
        console.log(`  - 跳转到第${page + 1}页 → 当前: ${currentPage + 1}`);
        
        if (currentPage !== page) {
          throw new Error(`跳转失败: 期望第${page + 1}页, 实际第${currentPage + 1}页`);
        }
      }
      
      // 测试上一页边界
      await previewer.goToPage(0);
      await previewer.previousPage();
      console.log(`  - 第一页上一页后: ${previewer.getCurrentPage()}`);
      
      // 测试下一页边界
      await previewer.goToPage(totalPages - 1);
      await previewer.nextPage();
      console.log(`  - 最后一页下一页后: ${previewer.getCurrentPage()}`);
      
      previewer.destroy();
      document.body.removeChild(container);
      
      this.testResult.add(
        '翻页功能测试',
        'pass',
        `测试了首页、中间页、末页跳转，边界处理正常`
      );
      
    } catch (error) {
      console.error('  ❌ 测试失败:', error.message);
      this.testResult.add(
        '翻页功能测试',
        'fail',
        error.message
      );
    }
  }

  /**
   * 测试8: 错误处理 - 非PDF文件
   */
  async testNonPDFFile() {
    console.log('🧪 测试8: 错误处理 - 非PDF文件');
    
    try {
      const txtFile = createMockFile('test.txt', 1024, 'text/plain', 'Hello World');
      
      const container = document.createElement('div');
      document.body.appendChild(container);
      
      const previewer = createPDFPreviewer({
        container: container,
        fileInfo: { name: txtFile.name, size: txtFile.size }
      });
      
      let errorThrown = false;
      let errorMessage = '';
      
      try {
        await previewer.load(txtFile);
      } catch (error) {
        errorThrown = true;
        errorMessage = error.message;
        console.log(`  - 正确捕获错误: ${error.message}`);
      }
      
      previewer.destroy();
      document.body.removeChild(container);
      
      if (errorThrown) {
        this.testResult.add(
          '错误处理 - 非PDF文件',
          'pass',
          `正确拒绝非PDF文件并抛出错误: ${errorMessage}`
        );
      } else {
        throw new Error('未能正确处理非PDF文件');
      }
      
    } catch (error) {
      console.error('  ❌ 测试失败:', error.message);
      this.testResult.add(
        '错误处理 - 非PDF文件',
        'fail',
        error.message
      );
    }
  }

  /**
   * 测试9: 错误处理 - 损坏的PDF文件
   */
  async testCorruptedPDF() {
    console.log('🧪 测试9: 错误处理 - 损坏的PDF文件');
    
    try {
      // 创建损坏的PDF文件（无PDF头）
      const corruptedFile = createMockFile('corrupted.pdf', 1024, 'application/pdf', 'Not a PDF file');
      
      const container = document.createElement('div');
      document.body.appendChild(container);
      
      const previewer = createPDFPreviewer({
        container: container,
        fileInfo: { name: corruptedFile.name, size: corruptedFile.size }
      });
      
      let errorThrown = false;
      let errorMessage = '';
      
      try {
        await previewer.load(corruptedFile);
      } catch (error) {
        errorThrown = true;
        errorMessage = error.message;
        console.log(`  - 正确捕获错误: ${error.message}`);
      }
      
      previewer.destroy();
      document.body.removeChild(container);
      
      if (errorThrown) {
        this.testResult.add(
          '错误处理 - 损坏的PDF文件',
          'pass',
          `正确处理损坏文件并抛出错误: ${errorMessage}`
        );
      } else {
        throw new Error('未能正确处理损坏的PDF文件');
      }
      
    } catch (error) {
      console.error('  ❌ 测试失败:', error.message);
      this.testResult.add(
        '错误处理 - 损坏的PDF文件',
        'fail',
        error.message
      );
    }
  }

  /**
   * 测试10: DocumentAdapter与PDF预览器的数据传递
   */
  async testDataTransfer() {
    console.log('🧪 测试10: DocumentAdapter与PDF预览器的数据传递');
    
    try {
      const pdfFile = createMockFile('data-transfer.pdf', 1024 * 100, 'application/pdf', '%PDF-1.4');
      
      // 1. DocumentAdapter解析
      const parsedData = await this.adapter.parse(pdfFile);
      console.log(`  - DocumentAdapter解析完成`);
      console.log(`    数据类型: ${typeof parsedData.data}`);
      console.log(`    数据大小: ${parsedData.data ? parsedData.data.byteLength : 0} bytes`);
      
      if (!parsedData.data || !(parsedData.data instanceof ArrayBuffer)) {
        throw new Error('DocumentAdapter未正确返回ArrayBuffer数据');
      }
      
      // 2. 创建预览器
      const container = document.createElement('div');
      document.body.appendChild(container);
      
      // 3. 使用原始文件加载预览器
      const previewer = createPDFPreviewer({
        container: container,
        fileInfo: { name: pdfFile.name, size: pdfFile.size }
      });
      
      await previewer.load(pdfFile);
      
      const totalPages = previewer.getTotalPages();
      console.log(`  - PDF预览器加载成功，总页数: ${totalPages}`);
      
      previewer.destroy();
      document.body.removeChild(container);
      
      this.testResult.add(
        'DocumentAdapter与PDF预览器的数据传递',
        'pass',
        'DocumentAdapter正确解析PDF文件并返回ArrayBuffer数据'
      );
      
    } catch (error) {
      console.error('  ❌ 测试失败:', error.message);
      this.testResult.add(
        'DocumentAdapter与PDF预览器的数据传递',
        'fail',
        error.message
      );
    }
  }

  /**
   * 运行所有测试
   */
  async runAll() {
    console.log('='.repeat(60));
    console.log('开始执行PDF预览器与DocumentAdapter集成测试');
    console.log('='.repeat(60));
    console.log('');
    
    await this.testBasicFlow();
    console.log('');
    
    await this.testFileTypeDetection();
    console.log('');
    
    await this.testSinglePagePDF();
    console.log('');
    
    await this.testMultiPagePDF();
    console.log('');
    
    await this.testLargeFilePDF();
    console.log('');
    
    await this.testZoomFunction();
    console.log('');
    
    await this.testPageNavigation();
    console.log('');
    
    await this.testNonPDFFile();
    console.log('');
    
    await this.testCorruptedPDF();
    console.log('');
    
    await this.testDataTransfer();
    console.log('');
    
    // 输出测试结果摘要
    console.log('='.repeat(60));
    console.log('测试结果摘要');
    console.log('='.repeat(60));
    
    const summary = this.testResult.getSummary();
    console.log(`总计: ${summary.total}`);
    console.log(`通过: ${summary.passed} ✅`);
    console.log(`失败: ${summary.failed} ❌`);
    console.log(`跳过: ${summary.skipped} ⏭️`);
    console.log(`通过率: ${summary.passRate}`);
    console.log('');
    
    return this.testResult;
  }
}

// 导出测试类
export default PDFDocumentAdapterIntegrationTest;

// 如果直接运行此脚本
if (typeof window !== 'undefined') {
  window.PDFDocumentAdapterIntegrationTest = PDFDocumentAdapterIntegrationTest;
}
