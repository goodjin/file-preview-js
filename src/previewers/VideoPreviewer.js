/**
 * 视频预览器（使用MediaAdapter）
 * 支持mp4、webm、ogg、flv、avi、mkv等视频格式
 * 
 * @description 使用HTML5 Video元素播放视频
 * @module VideoPreviewer
 * @version 1.0.0
 */

/**
 * 视频预览器类
 * @class VideoPreviewer
 */
export class VideoPreviewer {
  /**
   * 创建视频预览器实例
   * @param {Object} options - 预览器选项
   * @param {EventBus} options.eventBus - 事件总线实例
   * @param {StateManager} options.stateManager - 状态管理器实例
   */
  constructor(options = {}) {
    this.eventBus = options.eventBus;
    this.stateManager = options.stateManager;
    this.videoUrl = null;
    this.videoElement = null;
  }

  /**
   * 加载视频文件
   * @param {File} file - 文件对象
   * @returns {Promise<Object>} 加载结果
   */
  async load(file) {
    try {
      this.emitProgress(10);

      // 创建视频URL
      this.videoUrl = URL.createObjectURL(file);

      this.emitProgress(30);

      // 创建Video元素并加载元数据
      await this.loadVideoMetadata();

      this.emitProgress(100);

      return {
        type: 'video',
        ext: file.name.split('.').pop(),
        url: this.videoUrl,
        name: file.name,
        size: file.size,
        duration: this.duration,
        width: this.videoElement.videoWidth,
        height: this.videoElement.videoHeight
      };
    } catch (error) {
      this.emitError(error, 'Failed to load video file');
      throw error;
    }
  }

  /**
   * 加载视频元数据
   * @returns {Promise<void>}
   */
  async loadVideoMetadata() {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = this.videoUrl;

      video.addEventListener('loadedmetadata', () => {
        this.videoElement = video;
        this.duration = video.duration;
        resolve();
      });

      video.addEventListener('error', (e) => {
        reject(new Error(`Failed to load video: ${e.message}`));
      });

      setTimeout(() => {
        reject(new Error('Video loading timeout'));
      }, 10000);
    });
  }

  /**
   * 渲染视频预览
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
      wrapper.className = 'video-preview';

      const videoContainer = document.createElement('div');
      videoContainer.className = 'video-container';

      const video = document.createElement('video');
      video.className = 'video-element';
      video.src = data.url;
      video.controls = true;
      video.preload = 'metadata';
      video.style.maxWidth = '100%';
      video.style.maxHeight = '100%';
      this.videoElement = video;

      videoContainer.appendChild(video);
      wrapper.appendChild(videoContainer);
      container.appendChild(wrapper);

      this.emitLoaded();
    } catch (error) {
      this.emitError(error, 'Failed to render video file');
      throw error;
    }
  }

  /**
   * 获取总页数
   * @returns {number} 总页数（视频为1）
   */
  getTotalPages() {
    return 1;
  }

  /**
   * 获取当前页码
   * @returns {number} 当前页码（视频为1）
   */
  getCurrentPage() {
    return 1;
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
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.src = '';
      this.videoElement = null;
    }

    if (this.videoUrl && this.videoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.videoUrl);
      this.videoUrl = null;
    }
  }
}