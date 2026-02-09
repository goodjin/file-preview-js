/**
 * 音视频解析器
 * 支持 mp3, wav, mp4, flv, avi, mkv, webm 格式
 */
import { BaseParser } from '../BaseParser.js';
import { BinaryUtils } from '../../utils/BinaryUtils.js';

export class MediaParser extends BaseParser {
  /**
   * 文件格式Magic Number
   */
  static MAGIC_NUMBERS = {
    mp3: [0xFF, 0xFB], // 或 0xFF, 0xFA, 0xFF, 0xE3 等
    mp4: [0x00, 0x00, 0x00], // ftyp box
    wav: [0x52, 0x49, 0x46, 0x46], // RIFF
    flv: [0x46, 0x4C, 0x56, 0x01], // FLV\x01
    avi: [0x52, 0x49, 0x46, 0x46], // RIFF (需要进一步判断)
    mkv: [0x1A, 0x45, 0xDF, 0xA3], // EBML
    webm: [0x1A, 0x45, 0xDF, 0xA3]  // EBML (需要进一步判断)
  };

  /**
   * 解析音视频文件
   * @param {ArrayBuffer} fileData - 文件二进制数据
   * @returns {Promise<Object>} 解析结果
   */
  async parse(fileData) {
    const fileType = this.detectFileType(fileData);
    const metadata = this.getMetadata(fileData);
    
    return {
      type: 'media',
      format: fileType,
      metadata: metadata,
      canPlay: this.canPlayInBrowser(fileType),
      fileData: fileData
    };
  }

  /**
   * 检测文件类型
   * @param {ArrayBuffer} fileData - 文件二进制数据
   * @returns {string} 文件类型
   */
  detectFileType(fileData) {
    const header = new Uint8Array(fileData.slice(0, 12));
    
    // 检查MP3
    if (this.matchMagicNumber(header, MediaParser.MAGIC_NUMBERS.mp3) ||
        (header[0] === 0xFF && (header[1] & 0xE0) === 0xE0)) {
      return 'mp3';
    }
    
    // 检查WAV/AVI (RIFF)
    if (this.matchMagicNumber(header, MediaParser.MAGIC_NUMBERS.wav)) {
      const format = BinaryUtils.readString(fileData, 8, 4);
      if (format === 'WAVE') return 'wav';
      if (format === 'AVI ') return 'avi';
    }
    
    // 检查MP4
    if (header.length >= 8) {
      const ftyp = BinaryUtils.readString(fileData, 4, 4);
      if (ftyp === 'ftyp') return 'mp4';
    }
    
    // 检查FLV
    if (this.matchMagicNumber(header, MediaParser.MAGIC_NUMBERS.flv)) {
      return 'flv';
    }
    
    // 检查MKV/WEBM (EBML)
    if (this.matchMagicNumber(header, MediaParser.MAGIC_NUMBERS.mkv)) {
      // 需要进一步判断是MKV还是WEBM
      const docType = this.getEBMLDocType(fileData);
      if (docType === 'webm') return 'webm';
      return 'mkv';
    }
    
    return 'unknown';
  }

  /**
   * 匹配Magic Number
   * @param {Uint8Array} header - 文件头
   * @param {Array<number>} magicNumber - Magic Number
   * @returns {boolean} 是否匹配
   */
  matchMagicNumber(header, magicNumber) {
    for (let i = 0; i < magicNumber.length; i++) {
      if (header[i] !== magicNumber[i]) {
        return false;
      }
    }
    return true;
  }

  /**
   * 获取EBML文档类型
   * @param {ArrayBuffer} fileData - 文件二进制数据
   * @returns {string} 文档类型
   */
  getEBMLDocType(fileData) {
    // 简化的EBML解析，查找DocType
    const text = new TextDecoder('ascii').decode(fileData.slice(0, 100));
    if (text.includes('webm')) return 'webm';
    if (text.includes('matroska')) return 'mkv';
    return 'unknown';
  }

  /**
   * 检查是否可以在浏览器中播放
   * @param {string} format - 格式
   * @returns {boolean} 是否可以播放
   */
  canPlayInBrowser(format) {
    const video = document.createElement('video');
    const audio = document.createElement('audio');
    
    const videoFormats = {
      mp4: video.canPlayType('video/mp4'),
      webm: video.canPlayType('video/webm'),
      flv: video.canPlayType('video/x-flv')
    };
    
    const audioFormats = {
      mp3: audio.canPlayType('audio/mpeg'),
      wav: audio.canPlayType('audio/wav')
    };
    
    if (videoFormats[format] !== '' || audioFormats[format] !== '') {
      return true;
    }
    
    // avi, mkv 可能不被原生支持
    return false;
  }

  /**
   * 获取MP3元数据
   * @param {ArrayBuffer} fileData - 文件二进制数据
   * @returns {Object} 元数据
   */
  getMP3Metadata(fileData) {
    const metadata = {
      version: 'Unknown',
      layer: 'Unknown',
      bitrate: 0,
      sampleRate: 0,
      duration: 0,
      hasID3v1: false,
      hasID3v2: false
    };
    
    try {
      // 检查ID3v2标签
      const id3v2Header = new TextDecoder('ascii').decode(fileData.slice(0, 3));
      if (id3v2Header === 'ID3') {
        metadata.hasID3v2 = true;
        
        try {
          const id3Size = BinaryUtils.readInt32(fileData, 6);
          const id3Bytes = new Uint8Array(fileData.slice(10, 10 + id3Size));
          
          // 简化的ID3v2解析，提取基本信息
          metadata.title = this.extractID3Text(id3Bytes, 'TIT2');
          metadata.artist = this.extractID3Text(id3Bytes, 'TPE1');
          metadata.album = this.extractID3Text(id3Bytes, 'TALB');
        } catch (e) {
          // ID3解析失败，忽略
        }
      }
      
      // 检查ID3v1标签
      const fileSize = fileData.byteLength;
      if (fileSize >= 128) {
        const id3v1Header = new TextDecoder('ascii').decode(fileData.slice(fileSize - 128, fileSize - 125));
        if (id3v1Header === 'TAG') {
          metadata.hasID3v1 = true;
          metadata.title = new TextDecoder('ascii').decode(fileData.slice(fileSize - 125, fileSize - 95)).trim();
          metadata.artist = new TextDecoder('ascii').decode(fileData.slice(fileSize - 95, fileSize - 65)).trim();
          metadata.album = new TextDecoder('ascii').decode(fileData.slice(fileSize - 65, fileSize - 35)).trim();
        }
      }
      
      // 解析MP3帧头
      const mp3Start = metadata.hasID3v2 ? 10 + BinaryUtils.readInt32(fileData, 6) : 0;
      if (mp3Start < fileSize - 4) {
        const frameHeader = BinaryUtils.readUint32(fileData, mp3Start);
        
        // 解析版本
        const versionBits = (frameHeader >> 19) & 0x3;
        metadata.version = versionBits === 3 ? 'Version 1' : versionBits === 2 ? 'Version 2' : 'Reserved';
        
        // 解析层
        const layerBits = (frameHeader >> 17) & 0x3;
        metadata.layer = layerBits === 1 ? 'III' : layerBits === 2 ? 'II' : layerBits === 3 ? 'I' : 'Reserved';
        
        // 解析采样率
        const sampleRateBits = (frameHeader >> 10) & 0x3;
        const sampleRates = [44100, 48000, 32000];
        const sampleRateIndex = versionBits === 3 ? sampleRateBits : (sampleRateBits % 3);
        metadata.sampleRate = sampleRates[sampleRateIndex] || 44100;
        
        // 估算比特率
        const bitrateIndex = (frameHeader >> 12) & 0xF;
        const bitrates = versionBits === 3 ? 
          [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0] :
          [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];
        metadata.bitrate = bitrates[bitrateIndex] || 128;
        
        // 估算时长
        if (metadata.bitrate > 0) {
          const audioSize = fileSize - mp3Start;
          metadata.duration = (audioSize * 8) / (metadata.bitrate * 1000);
        }
      }
    } catch (e) {
      // 解析失败，返回默认值
    }
    
    return metadata;
  }

  /**
   * 从ID3v2标签中提取文本
   * @param {Uint8Array} id3Bytes - ID3字节
   * @param {string} frameId - 帧ID
   * @returns {string} 文本
   */
  extractID3Text(id3Bytes, frameId) {
    // 简化的ID3v2文本提取
    let pos = 0;
    while (pos < id3Bytes.length - 10) {
      const currentFrameId = new TextDecoder('ascii').decode(id3Bytes.slice(pos, pos + 4));
      const frameSize = BinaryUtils.readInt32(id3Bytes.buffer, pos + 4, false) & 0x7FFFFFFF;
      
      if (currentFrameId === frameId && frameSize > 0) {
        const encoding = id3Bytes[pos + 10];
        let textStart = pos + 11;
        
        if (encoding === 0 || encoding === 3) {
          // ISO-8859-1 or UTF-8
          return new TextDecoder(encoding === 0 ? 'iso-8859-1' : 'utf-8').decode(id3Bytes.slice(textStart, textStart + frameSize - 1));
        } else if (encoding === 1 || encoding === 2) {
          // UTF-16
          return new TextDecoder('utf-16').decode(id3Bytes.slice(textStart, textStart + frameSize - 1));
        }
      }
      
      pos += 10 + frameSize;
    }
    return '';
  }

  /**
   * 获取WAV元数据
   * @param {ArrayBuffer} fileData - 文件二进制数据
   * @returns {Object} 元数据
   */
  getWAVMetadata(fileData) {
    const metadata = {
      sampleRate: 0,
      channels: 0,
      bitsPerSample: 0,
      duration: 0,
      format: 'Unknown'
    };
    
    try {
      // RIFF文件头已在验证时检查
      const fmtOffset = 12;
      const fmtSize = BinaryUtils.readInt32(fileData, 16, true);
      const formatTag = BinaryUtils.readUint16(fileData, fmtOffset + 8, true);
      metadata.format = formatTag === 1 ? 'PCM' : formatTag === 3 ? 'IEEE Float' : 'Compressed';
      
      metadata.channels = BinaryUtils.readUint16(fileData, fmtOffset + 10, true);
      metadata.sampleRate = BinaryUtils.readInt32(fileData, fmtOffset + 12, true);
      metadata.bitsPerSample = BinaryUtils.readUint16(fileData, fmtOffset + 22, true);
      
      const dataSize = BinaryUtils.readInt32(fileData, 40, true);
      if (metadata.sampleRate > 0) {
        const byteRate = metadata.sampleRate * metadata.channels * (metadata.bitsPerSample / 8);
        metadata.duration = dataSize / byteRate;
      }
    } catch (e) {
      // 解析失败，返回默认值
    }
    
    return metadata;
  }

  /**
   * 获取MP4元数据
   * @param {ArrayBuffer} fileData - 文件二进制数据
   * @returns {Object} 元数据
   */
  getMP4Metadata(fileData) {
    const metadata = {
      width: 0,
      height: 0,
      duration: 0,
      hasVideo: false,
      hasAudio: false,
      codec: 'Unknown'
    };
    
    try {
      // 简化的MP4解析
      let offset = 0;
      while (offset < fileData.byteLength - 8) {
        const boxSize = BinaryUtils.readUint32(fileData, offset, false);
        const boxType = BinaryUtils.readString(fileData, offset + 4, 4);
        
        if (boxSize < 8) break;
        
        if (boxType === 'trak') {
          // 解析track
          metadata.hasVideo = true;
        }
        
        if (boxType === 'mvhd' && boxSize > 20) {
          // 解析时长 (timescale 和 duration)
          const timescale = BinaryUtils.readUint32(fileData, offset + 20, false);
          const duration = BinaryUtils.readUint32(fileData, offset + 24, false);
          if (timescale > 0) {
            metadata.duration = duration / timescale;
          }
        }
        
        if (boxType === 'tkhd') {
          // 解析宽高
          const fixedWidth = BinaryUtils.readInt32(fileData, offset + 44, false);
          const fixedHeight = BinaryUtils.readInt32(fileData, offset + 48, false);
          metadata.width = fixedWidth >> 16;
          metadata.height = fixedHeight >> 16;
        }
        
        offset += boxSize;
      }
    } catch (e) {
      // 解析失败，返回默认值
    }
    
    return metadata;
  }

  /**
   * 验证音视频文件
   * @param {ArrayBuffer} fileData - 文件二进制数据
   * @returns {boolean} 是否有效
   */
  validate(fileData) {
    const fileType = this.detectFileType(fileData);
    return fileType !== 'unknown';
  }

  /**
   * 获取音视频文件元数据
   * @param {ArrayBuffer} fileData - 文件二进制数据
   * @returns {Object} 元数据
   */
  getMetadata(fileData) {
    const fileType = this.detectFileType(fileData);
    
    const baseMetadata = {
      type: 'media',
      format: fileType,
      size: fileData.byteLength,
      canPlay: this.canPlayInBrowser(fileType)
    };
    
    let formatMetadata = {};
    
    switch (fileType) {
      case 'mp3':
        formatMetadata = this.getMP3Metadata(fileData);
        break;
      case 'wav':
        formatMetadata = this.getWAVMetadata(fileData);
        break;
      case 'mp4':
        formatMetadata = this.getMP4Metadata(fileData);
        break;
      default:
        formatMetadata = { format: fileType };
    }
    
    return { ...baseMetadata, ...formatMetadata };
  }
}
