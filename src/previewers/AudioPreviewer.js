/**
 * 音频预览器（使用MediaAdapter）
 * 支持mp3、wav、ogg、flac等音频格式
 * 
 * @description 使用HTML5 Audio元素播放音频
 * @module AudioPreviewer
 * @version 1.0.0
 */

/**
 * 音频预览器类
 * @class AudioPreviewer
 */
export class AudioPreviewer {
  /**
   * 创建音频预览器实例
   * @param {Object} options - 预览器选项
   * @param {EventBus} options.eventBus - 事件总线实例
   * @param {StateManager} options.stateManager - 状态管理器实例
   */
  constructor(options = {}) {
    this.eventBus = options.eventBus;
    this.stateManager = options.stateManager;
    this.audioUrl = null;
    this.audioElement = null;
  }

  /**
   * 加载音频文件
   * @param {File} file - 文件对象
   * @returns {Promise<Object>} 加载结果
   */
  async load(file) {
    try {
      this.emitProgress(10);

      // 创建音频URL
      this.audioUrl = URL.createObjectURL(file);

      this.emitProgress(30);

      // 创建Audio元素并加载元数据
      await this.loadAudioMetadata();

      this.emitProgress(100);

      return {
        type: 'audio',
        ext: file.name.split('.').pop(),
        url: this.audioUrl,
        name: file.name,
        size: file.size,
        duration: this.duration
      };
    } catch (error) {
      this.emitError(error, 'Failed to load audio file');
      throw error;
    }
  }

  /**
   * 加载音频元数据
   * @returns {Promise<void>}
   */
  async loadAudioMetadata() {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.src = this.audioUrl;

      audio.addEventListener('loadedmetadata', () => {
        this.audioElement = audio;
        this.duration = audio.duration;
        resolve();
      });

      audio.addEventListener('error', (e) => {
        reject(new Error(`Failed to load audio: ${e.message}`));
      });

      setTimeout(() => {
        reject(new Error('Audio loading timeout'));
      }, 10000);
    });
  }

  /**
   * 渲染音频预览
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
      wrapper.className = 'audio-preview';

      const playerContainer = this.createPlayer(data);
      wrapper.appendChild(playerContainer);

      const info = this.createInfo(data);
      wrapper.appendChild(info);

      container.appendChild(wrapper);

      this.emitLoaded();
    } catch (error) {
      this.emitError(error, 'Failed to render audio file');
      throw error;
    }
  }

  /**
   * 创建音频播放器
   * @param {Object} data - 音频数据
   * @returns {HTMLElement} 播放器元素
   */
  createPlayer(data) {
    const player = document.createElement('div');
    player.className = 'audio-player';

    const audio = document.createElement('audio');
    audio.className = 'audio-element';
    audio.controls = true;
    audio.preload = 'metadata';
    audio.src = data.url;
    this.audioElement = audio;

    player.appendChild(audio);
    return player;
  }

  /**
   * 创建音频信息
   * @param {Object} data - 音频数据
   * @returns {HTMLElement} 信息元素
   */
  createInfo(data) {
    const info = document.createElement('div');
    info.className = 'audio-info';

    const name = document.createElement('div');
    name.className = 'audio-info__name';
    name.textContent = data.name;
    info.appendChild(name);

    const details = document.createElement('div');
    details.className = 'audio-info__details';

    const duration = document.createElement('div');
    duration.className = 'audio-info__detail';
    duration.textContent = `时长: ${this.formatTime(data.duration)}`;
    details.appendChild(duration);

    const size = document.createElement('div');
    size.className = 'audio-info__detail';
    size.textContent = `大小: ${this.formatFileSize(data.size)}`;
    details.appendChild(size);

    info.appendChild(details);
    return info;
  }

  /**
   * 格式化时间
   * @param {number} seconds - 秒数
   * @returns {string} 格式化后的时间
   */
  formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    } else {
      return `${m}:${s.toString().padStart(2, '0')}`;
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
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i))).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 获取总页数
   * @returns {number} 总页数（音频为1）
   */
  getTotalPages() {
    return 1;
  }

  /**
   * 获取当前页码
   * @returns {number} 当前页码（音频为1）
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
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement = null;
    }

    if (this.audioUrl && this.audioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.audioUrl);
      this.audioUrl = null;
    }
  }
}