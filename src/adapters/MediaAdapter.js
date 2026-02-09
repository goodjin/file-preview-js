/**
 * 音视频适配器
 * 支持：mp3, wav, mp4, flv, avi, mkv, webm等音视频格式
 * 
 * @description 统一音视频文件的预览接口
 * @module MediaAdapter
 * @version 1.0.0
 */

import { BaseAdapter } from './BaseAdapter.js';
import { FileTypeDetector } from '../core/FileTypeDetector.js';

/**
 * 音视频适配器类
 * @class MediaAdapter
 * @extends BaseAdapter
 */
export class MediaAdapter extends BaseAdapter {
  /**
   * 支持的音频格式列表
   * @type {Array<string>}
   */
  static audioFormats = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'mid'];

  /**
   * 支持的视频格式列表
   * @type {Array<string>}
   */
  static videoFormats = ['mp4', 'webm', 'ogg', 'flv', 'avi', 'mkv', 'mov', 'wmv', 'm4v', '3gp'];

  /**
   * 检查是否支持该文件类型
   * @param {string} fileType - 文件类型
   * @returns {boolean} 是否支持
   */
  static supports(fileType) {
    return this.audioFormats.includes(fileType) || this.videoFormats.includes(fileType);
  }

  /**
   * 加载文件
   * @param {File} file - 文件对象
   * @returns {Promise<Object>} 加载结果
   */
  async load(file) {
    try {
      this.emitProgress(10);

      const ext = FileTypeDetector.getExtension(file.name);

      if (this.audioFormats.includes(ext)) {
        return await this.loadAudio(file, ext);
      } else if (this.videoFormats.includes(ext)) {
        return await this.loadVideo(file, ext);
      } else {
        throw new Error(`Unsupported media type: ${ext}`);
      }
    } catch (error) {
      this.emitError(error, 'Failed to load media file');
      throw error;
    }
  }

  /**
   * 加载音频文件
   * @param {File} file - 文件对象
   * @param {string} ext - 文件扩展名
   * @returns {Promise<Object>} 加载结果
   */
  async loadAudio(file, ext) {
    this.emitProgress(30);

    // 创建音频URL
    const audioUrl = URL.createObjectURL(file);

    this.emitProgress(50);

    // 创建Audio元素并加载元数据
    const metadata = await this.loadAudioMetadata(audioUrl);

    this.emitProgress(100);

    return {
      type: 'audio',
      ext,
      url: audioUrl,
      name: file.name,
      size: file.size,
      duration: metadata.duration,
      format: this.detectAudioFormat(ext)
    };
  }

  /**
   * 加载音频元数据
   * @param {string} audioUrl - 音频URL
   * @returns {Promise<Object>} 元数据
   */
  async loadAudioMetadata(audioUrl) {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.src = audioUrl;

      audio.addEventListener('loadedmetadata', () => {
        resolve({
          duration: audio.duration
        });
      });

      audio.addEventListener('error', () => {
        reject(new Error('Failed to load audio metadata'));
      });

      // 超时处理
      setTimeout(() => {
        reject(new Error('Audio loading timeout'));
      }, 10000);
    });
  }

  /**
   * 检测音频格式
   * @param {string} ext - 文件扩展名
   * @returns {string} 音频格式
   */
  detectAudioFormat(ext) {
    const formatMap = {
      'mp3': 'MPEG-3 Audio',
      'wav': 'WAV Audio',
      'ogg': 'Ogg Audio',
      'flac': 'FLAC Audio',
      'aac': 'AAC Audio',
      'm4a': 'M4A Audio',
      'wma': 'WMA Audio',
      'mid': 'MIDI'
    };

    return formatMap[ext] || 'Unknown';
  }

  /**
   * 加载视频文件
   * @param {File} file - 文件对象
   * @param {string} ext - 文件扩展名
   * @returns {Promise<Object>} 加载结果
   */
  async loadVideo(file, ext) {
    this.emitProgress(30);

    // 创建视频URL
    const videoUrl = URL.createObjectURL(file);

    this.emitProgress(50);

    // 创建Video元素并加载元数据
    const metadata = await this.loadVideoMetadata(videoUrl);

    this.emitProgress(100);

    return {
      type: 'video',
      ext,
      url: videoUrl,
      name: file.name,
      size: file.size,
      duration: metadata.duration,
      format: this.detectVideoFormat(ext),
      width: metadata.width,
      height: metadata.height
    };
  }

  /**
   * 加载视频元数据
   * @param {string} videoUrl - 视频URL
   * @returns {Promise<Object>} 元数据
   */
  async loadVideoMetadata(videoUrl) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = videoUrl;

      // 静音加载
      video.muted = true;

      video.addEventListener('loadedmetadata', () => {
        resolve({
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight
        });
      });

      video.addEventListener('error', () => {
        reject(new Error('Failed to load video metadata'));
      });

      // 超时处理
      setTimeout(() => {
        reject(new Error('Video loading timeout'));
      }, 10000);
    });
  }

  /**
   * 检测视频格式
   * @param {string} ext - 文件扩展名
   * @returns {string} 视频格式
   */
  detectVideoFormat(ext) {
    const formatMap = {
      'mp4': 'MP4 Video',
      'webm': 'WebM Video',
      'ogg': 'Ogg Video',
      'flv': 'Flash Video',
      'avi': 'AVI Video',
      'mkv': 'Matroska Video',
      'mov': 'QuickTime Video',
      'wmv': 'Windows Media Video',
      'm4v': 'M4V Video',
      '3gp': '3GP Video'
    };

    return formatMap[ext] || 'Unknown';
  }

  /**
   * 渲染预览
   * @param {HTMLElement} container - 容器元素
   * @param {Object} data - 加载的数据
   * @returns {Promise<void>}
   */
  async render(container, data) {
    if (!container) {
      throw new Error('Container is required');
    }

    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'media-preview';

    if (data.type === 'audio') {
      await this.renderAudio(container, data);
    } else if (data.type === 'video') {
      await this.renderVideo(container, data);
    }

    this.emitLoaded();
  }

  /**
   * 渲染音频预览
   * @param {HTMLElement} container - 容器元素
   * @param {Object} data - 音频数据
   */
  async renderAudio(container, data) {
    const wrapper = container.querySelector('.media-preview');

    // 音频播放器
    const player = document.createElement('div');
    player.className = 'media-player audio-player';

    // Audio元素
    const audio = document.createElement('audio');
    audio.className = 'audio-element';
    audio.controls = true;
    audio.preload = 'metadata';
    audio.src = data.url;

    // 音频信息
    const info = document.createElement('div');
    info.className = 'media-info audio-info';
    info.innerHTML = `
      <div class="media-info__name">${data.name}</div>
      <div class="media-info__details">
        <span class="media-info__detail">时长: ${this.formatTime(data.duration)}</span>
        <span class="media-info__detail">大小: ${this.formatFileSize(data.size)}</span>
        <span class="media-info__detail">格式: ${data.format}</span>
      </div>
    `;

    player.appendChild(audio);
    player.appendChild(info);
    wrapper.appendChild(player);
  }

  /**
   * 渲染视频预览
   * @param {HTMLElement} container - 容器元素
   * @param {Object} data - 视频数据
   */
  async renderVideo(container, data) {
    const wrapper = container.querySelector('.media-preview');

    // 视频播放器
    const player = document.createElement('div');
    player.className = 'media-player video-player';

    // Video元素
    const video = document.createElement('video');
    video.className = 'video-element';
    video.controls = true;
    video.preload = 'metadata';
    video.src = data.url;
    video.style.maxWidth = '100%';
    video.style.maxHeight = '100%';

    // 视频信息
    const info = document.createElement('div');
    info.className = 'media-info video-info';
    info.innerHTML = `
      <div class="media-info__name">${data.name}</div>
      <div class="media-info__details">
        <span class="media-info__detail">时长: ${this.formatTime(data.duration)}</span>
        <span class="media-info__detail">大小: ${this.formatFileSize(data.size)}</span>
        <span class="media-info__detail">格式: ${data.format}</span>
        <span class="media-info__detail">分辨率: ${data.width}x${data.height}</span>
      </div>
    `;

    player.appendChild(video);
    player.appendChild(info);
    wrapper.appendChild(player);
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
   * 销毁预览器
   */
  destroy() {
    // 清理音频/视频元素
    const audio = document.querySelector('.audio-element');
    const video = document.querySelector('.video-element');

    if (audio && audio.src && audio.src.startsWith('blob:')) {
      URL.revokeObjectURL(audio.src);
    }

    if (video && video.src && video.src.startsWith('blob:')) {
      URL.revokeObjectURL(video.src);
    }

    // 清理容器
    const wrapper = document.querySelector('.media-preview');
    if (wrapper) {
      wrapper.innerHTML = '';
    }
  }
}