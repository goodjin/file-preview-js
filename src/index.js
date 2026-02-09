/**
 * 文件预览系统 - 应用入口
 * 
 * @description 文件预览系统主入口文件
 * @version 1.0.0
 */

// 导入核心模块
import { EventBus } from './core/EventBus.js';
import { StateManager } from './core/StateManager.js';
import { PreviewerFactory } from './core/PreviewerFactory.js';
import { FileTypeDetector } from './core/FileTypeDetector.js';

// 导入UI组件
import { NavBar } from './components/NavBar.js';
import { PreviewContainer } from './components/PreviewContainer.js';
import { Toolbar } from './components/Toolbar.js';
import { FileInfo } from './components/FileInfo.js';
import { LoadingState } from './components/LoadingState.js';
import { Alert } from './components/Alert.js';
import { FileUpload } from './components/FileUpload.js';

// 导入适配器
import { MediaAdapter } from './adapters/MediaAdapter.js';
import { ArchiveAdapter } from './adapters/ArchiveAdapter.js';

// 导入预览器
import { WordPreviewer } from './previewers/WordPreviewer.js';
import { ExcelPreviewer } from './previewers/ExcelPreviewer.js';
import { PowerPointPreviewer } from './previewers/PowerPointPreviewer.js';
import { PDFPreviewer } from './previewers/PDFPreviewer.js';
import { ImagePreviewer } from './previewers/ImagePreviewer.js';
import { TextPreviewer } from './previewers/TextPreviewer.js';
import { MarkdownPreviewer } from './previewers/MarkdownPreviewer.js';
import { CodePreviewer } from './previewers/CodePreviewer.js';
import { AudioPreviewer } from './previewers/AudioPreviewer.js';
import { VideoPreviewer } from './previewers/VideoPreviewer.js';
import { ArchivePreviewer } from './previewers/ArchivePreviewer.js';

// P2格式预览器
import { WpsPreviewer } from './previewers/WpsPreviewer.js';
import { EtPreviewer } from './previewers/EtPreviewer.js';
import { DpsPreviewer } from './previewers/DpsPreviewer.js';
import { OfdPreviewer } from './previewers/OfdPreviewer.js';
import { BmpPreviewer } from './previewers/BmpPreviewer.js';
import { SvgPreviewer } from './previewers/SvgPreviewer.js';
import { WebpPreviewer } from './previewers/WebpPreviewer.js';
import { PsdPreviewer } from './previewers/PsdPreviewer.js';
import { TifPreviewer } from './previewers/TifPreviewer.js';
import { WavePreviewer } from './previewers/WavePreviewer.js';
import { FlvPreviewer } from './previewers/FlvPreviewer.js';
import { AviPreviewer } from './previewers/AviPreviewer.js';
import { MkvPreviewer } from './previewers/MkvPreviewer.js';
import { WebmPreviewer } from './previewers/WebmPreviewer.js';
import { RarPreviewer } from './previewers/RarPreviewer.js';
import { GzipPreviewer } from './previewers/GzipPreviewer.js';
import { JarPreviewer } from './previewers/JarPreviewer.js';

// 导入样式
import './styles/index.css';

// 导入file-saver
import { saveAs } from 'file-saver';

/**
 * 应用主类
 */
class FilePreviewApp {
  constructor() {
    this.eventBus = new EventBus();
    this.stateManager = new StateManager(this.eventBus);
    this.previewer = null;
    this.currentFile = null;

    this.components = {
      navBar: null,
      previewContainer: null,
      toolbar: null,
      fileInfo: null,
      loadingState: null,
      alert: null,
      fileUpload: null
    };

    this.init();
  }

  /**
   * 初始化应用
   */
  init() {
    this.registerPreviewers();
    this.render();
    this.bindEvents();
    console.log('File Preview System initialized');
  }

  /**
   * 注册预览器
   */
  registerPreviewers() {
    // 注册Office格式预览器
    PreviewerFactory.register('doc', WordPreviewer);
    PreviewerFactory.register('docx', WordPreviewer);
    PreviewerFactory.register('xls', ExcelPreviewer);
    PreviewerFactory.register('xlsx', ExcelPreviewer);
    PreviewerFactory.register('ppt', PowerPointPreviewer);
    PreviewerFactory.register('pptx', PowerPointPreviewer);

    // 注册文档格式预览器
    PreviewerFactory.register('pdf', PDFPreviewer);
    PreviewerFactory.register('txt', TextPreviewer);
    PreviewerFactory.register('md', MarkdownPreviewer);
    PreviewerFactory.register('js', CodePreviewer);
    PreviewerFactory.register('ts', CodePreviewer);
    PreviewerFactory.register('py', CodePreviewer);
    PreviewerFactory.register('java', CodePreviewer);
    PreviewerFactory.register('c', CodePreviewer);
    PreviewerFactory.register('cpp', CodePreviewer);
    PreviewerFactory.register('css', CodePreviewer);
    PreviewerFactory.register('html', CodePreviewer);
    PreviewerFactory.register('json', CodePreviewer);
    PreviewerFactory.register('xml', CodePreviewer);

    // 注册图片格式预览器
    PreviewerFactory.register('jpg', ImagePreviewer);
    PreviewerFactory.register('jpeg', ImagePreviewer);
    PreviewerFactory.register('png', ImagePreviewer);
    PreviewerFactory.register('gif', ImagePreviewer);

    // 注册音频格式预览器
    PreviewerFactory.register('mp3', AudioPreviewer);
    PreviewerFactory.register('wav', WavePreviewer);
    PreviewerFactory.register('ogg', AudioPreviewer);
    PreviewerFactory.register('flac', AudioPreviewer);
    PreviewerFactory.register('aac', AudioPreviewer);

    // 注册视频格式预览器
    PreviewerFactory.register('mp4', VideoPreviewer);
    PreviewerFactory.register('webm', WebmPreviewer);
    PreviewerFactory.register('ogg', VideoPreviewer);
    PreviewerFactory.register('flv', FlvPreviewer);
    PreviewerFactory.register('avi', AviPreviewer);
    PreviewerFactory.register('mkv', MkvPreviewer);
    PreviewerFactory.register('mov', VideoPreviewer);
    PreviewerFactory.register('wmv', VideoPreviewer);

    // 注册压缩包格式预览器
    PreviewerFactory.register('zip', ArchivePreviewer);
    PreviewerFactory.register('7z', ArchivePreviewer);
    PreviewerFactory.register('tar', ArchivePreviewer);
    PreviewerFactory.register('rar', RarPreviewer);
    PreviewerFactory.register('gz', ArchivePreviewer);
    PreviewerFactory.register('gzip', GzipPreviewer);
    PreviewerFactory.register('jar', JarPreviewer);

    // 注册P2格式预览器
    // Office文档类：wps, et, dps（3种）
    PreviewerFactory.register('wps', WpsPreviewer);
    PreviewerFactory.register('et', EtPreviewer);
    PreviewerFactory.register('dps', DpsPreviewer);

    // 文档类：ofd（1种）
    PreviewerFactory.register('ofd', OfdPreviewer);

    // 图片类：bmp, svg, webp, psd, tif（5种）
    PreviewerFactory.register('bmp', BmpPreviewer);
    PreviewerFactory.register('svg', SvgPreviewer);
    PreviewerFactory.register('webp', WebpPreviewer);
    PreviewerFactory.register('psd', PsdPreviewer);
    PreviewerFactory.register('tif', TifPreviewer);

    // 音视频类：wav, flv, avi, mkv, webm（5种）
    PreviewerFactory.register('flv', FlvPreviewer);
    PreviewerFactory.register('avi', AviPreviewer);
    PreviewerFactory.register('mkv', MkvPreviewer);

    // 压缩包类：rar, gzip, jar（3种）
    PreviewerFactory.register('rar', RarPreviewer);
    PreviewerFactory.register('gzip', GzipPreviewer);
    PreviewerFactory.register('jar', JarPreviewer);

    console.log('Registered previewers:', PreviewerFactory.getRegisteredTypes());
  }

  /**
   * 渲染UI
   */
  render() {
    const app = document.getElementById('app');

    // 创建文件上传组件
    this.components.fileUpload = new FileUpload({
      accept: '.doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf,.jpg,.jpeg,.png,.gif,.txt,.md,.js,.ts,.py,.java,.c,.cpp,.css,.html,.json,.xml,.mp3,.wav,.mp4,.webm,.zip,.7z,.tar,.rar,.gz,.wps,.et,.dps,.ofd,.bmp,.svg,.webp,.psd,.tif,.flv,.avi,.mkv,.jar',
      maxSize: 100 * 1024 * 1024, // 100MB
      multiple: false,
      dragable: true
    });
    app.appendChild(this.components.fileUpload.element);

    // 创建导航栏
    this.components.navBar = new NavBar();
    app.appendChild(this.components.navBar.element);

    // 创建预览容器
    this.components.previewContainer = new PreviewContainer();
    app.appendChild(this.components.previewContainer.element);

    // 创建工具栏
    this.components.toolbar = new Toolbar();
    app.appendChild(this.components.toolbar.element);

    // 创建文件信息组件
    this.components.fileInfo = new FileInfo();
    app.appendChild(this.components.fileInfo.element);

    // 创建加载状态组件
    this.components.loadingState = new LoadingState();
    app.appendChild(this.components.loadingState.element);

    // 创建提示框组件
    this.components.alert = new Alert();
    app.appendChild(this.components.alert.element);
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 文件上传选择
    this.components.fileUpload.on('select', (files) => {
      if (files && files.length > 0) {
        this.loadFile(files[0]);
      }
    });

    // 文件上传错误
    this.components.fileUpload.on('error', ({ file, message }) => {
      this.components.alert.showError(message);
      console.error('Upload error:', file, message);
    });

    // 文件加载进度
    this.eventBus.on('file:load:progress', ({ progress }) => {
      this.components.loadingState.setProgress(progress);
    });

    // 文件加载完成
    this.eventBus.on('file:loaded', () => {
      this.components.loadingState.hide();
    });

    // 预览错误
    this.eventBus.on('error:occurred', ({ error, message }) => {
      this.components.loadingState.hide();
      this.components.alert.showError(message);
      console.error('Preview error:', error);
    });

    // 预览器页码变化
    this.eventBus.on('page:changed', ({ currentPage, totalPages }) => {
      if (this.components.toolbar) {
        this.components.toolbar.setCurrentPage(currentPage);
        this.components.toolbar.setTotalPages(totalPages);
      }
    });

    // 工具栏事件
    this.components.toolbar.on('zoom:in', () => {
      this.components.previewContainer.zoomIn();
    });

    this.components.toolbar.on('zoom:out', () => {
      this.components.previewContainer.zoomOut();
    });

    this.components.toolbar.on('zoom:reset', () => {
      this.components.previewContainer.resetZoom();
    });

    this.components.toolbar.on('page:prev', () => {
      if (this.previewer && this.previewer.previousPage) {
        this.previewer.previousPage();
      }
    });

    this.components.toolbar.on('page:next', () => {
      if (this.previewer && this.previewer.nextPage) {
        this.previewer.nextPage();
      }
    });

    this.components.toolbar.on('download', () => {
      this.downloadFile();
    });

    this.components.toolbar.on('fullscreen:toggle', (isFullscreen) => {
      this.toggleFullscreen(isFullscreen);
    });

    // 预览容器缩放变化
    this.components.previewContainer.on('zoom:change', (zoom) => {
      if (this.components.toolbar) {
        this.components.toolbar.setZoom(zoom);
      }
    });
  }

  /**
   * 加载并预览文件
   * @param {File} file - 文件对象
   */
  async loadFile(file) {
    try {
      // 显示加载状态
      this.components.loadingState.show();
      this.components.loadingState.setMessage('正在加载文件...');

      // 隐藏上传组件
      this.components.fileUpload.element.style.display = 'none';

      // 显示预览组件
      this.components.navBar.element.style.display = 'flex';
      this.components.previewContainer.element.style.display = 'flex';
      this.components.toolbar.element.style.display = 'flex';
      this.components.fileInfo.element.style.display = 'flex';

      // 更新文件信息
      this.components.fileInfo.setFile(file);
      this.currentFile = file;

      // 更新导航栏
      this.components.navBar.setFileName(file.name);
      this.components.navBar.setFileSize(this.formatFileSize(file.size));

      // 检测文件类型
      const fileType = FileTypeDetector.detect(file);
      console.log('Detected file type:', fileType);

      // 创建预览器
      this.previewer = PreviewerFactory.create(file, {
        eventBus: this.eventBus,
        stateManager: this.stateManager
      });

      // 加载文件
      await this.previewer.load(file);

      // 渲染预览
      await this.previewer.render(this.components.previewContainer.getContentElement());

      // 更新工具栏
      if (this.previewer.getTotalPages) {
        const totalPages = this.previewer.getTotalPages();
        this.components.toolbar.setTotalPages(totalPages);
        this.components.toolbar.showPageNavigation();
      }

    } catch (error) {
      this.components.loadingState.hide();
      this.components.alert.showError('文件加载失败: ' + error.message);
      console.error('Load file error:', error);

      // 显示上传组件
      this.components.fileUpload.element.style.display = 'flex';
    }
  }

  /**
   * 下载文件
   */
  downloadFile() {
    if (!this.currentFile) {
      this.components.alert.showWarning('没有可下载的文件');
      return;
    }

    try {
      // 使用file-saver库下载文件
      saveAs(this.currentFile, this.currentFile.name);
      this.components.alert.showSuccess('文件下载成功');
    } catch (error) {
      this.components.alert.showError('文件下载失败: ' + error.message);
      console.error('Download file error:', error);
    }
  }

  /**
   * 切换全屏
   * @param {boolean} isFullscreen - 是否全屏
   */
  toggleFullscreen(isFullscreen) {
    if (!document.fullscreenElement && isFullscreen) {
      // 进入全屏
      document.documentElement.requestFullscreen().catch(err => {
        console.error('Fullscreen error:', err);
        this.components.alert.showWarning('无法进入全屏模式');
      });
    } else if (document.fullscreenElement && !isFullscreen) {
      // 退出全屏
      document.exitFullscreen();
    }
  }

  /**
   * 格式化文件大小
   * @param {number} bytes - 字节数
   * @returns {string} 格式化后的文件大小
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i))).toFixed(2) + ' ' + sizes[i];
  }

  /**
   * 销毁应用
   */
  destroy() {
    // 销毁所有组件
    Object.values(this.components).forEach(component => {
      if (component && component.destroy) {
        component.destroy();
      }
    });

    // 销毁预览器
    if (this.previewer && this.previewer.destroy) {
      this.previewer.destroy();
    }
  }
}

// 启动应用
const app = new FilePreviewApp();

// 暴露到全局，便于调试
window.FilePreviewApp = app;

export default app;