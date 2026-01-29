/**
 * 图片工具函数集合
 * @description 提供图片处理相关的工具函数
 */

import {
  FILE_TYPES,
  SUPPORTED_FORMATS,
  FILE_SIZE_WARNING,
  FILE_SIZE_LIMIT,
  ERROR_MESSAGES,
  FILE_SIGNATURES
} from './ImageConstants.js';

/**
 * 验证文件类型
 * @param {File} file - 文件对象
 * @param {string[]} [allowedTypes=SUPPORTED_FORMATS] - 允许的文件类型
 * @returns {{valid: boolean, type: string|null, error: string|null}}
 */
export function validateFileType(file, allowedTypes = SUPPORTED_FORMATS) {
  if (!file || !file.type) {
    return { valid: false, type: null, error: ERROR_MESSAGES.INVALID_FILE };
  }

  const type = FILE_TYPES[file.type];
  if (!type || !allowedTypes.includes(type)) {
    return { valid: false, type: null, error: ERROR_MESSAGES.UNSUPPORTED_FORMAT };
  }

  return { valid: true, type, error: null };
}

/**
 * 验证文件大小
 * @param {File} file - 文件对象
 * @returns {{valid: boolean, warning: boolean, error: string|null}}
 */
export function validateFileSize(file) {
  if (!file) {
    return { valid: false, warning: false, error: ERROR_MESSAGES.INVALID_FILE };
  }

  if (file.size > FILE_SIZE_LIMIT) {
    return { valid: false, warning: false, error: ERROR_MESSAGES.FILE_TOO_LARGE };
  }

  const warning = file.size > FILE_SIZE_WARNING;
  return { valid: true, warning, error: null };
}

/**
 * 加载图片
 * @param {File|Blob|string} source - 文件、Blob或DataURL
 * @param {function(number): void} [onProgress] - 加载进度回调
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImage(source, onProgress) {
  return new Promise((resolve, reject) => {
    if (!source) {
      reject(new Error(ERROR_MESSAGES.INVALID_FILE));
      return;
    }

    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(ERROR_MESSAGES.LOAD_FAILED));

    // 如果是File或Blob，使用FileReader读取
    if (source instanceof File || source instanceof Blob) {
      const reader = new FileReader();

      reader.onprogress = (event) => {
        if (onProgress && event.lengthComputable) {
          const progress = event.loaded / event.total;
          onProgress(progress);
        }
      };

      reader.onload = (event) => {
        img.src = event.target.result;
      };

      reader.onerror = () => {
        reject(new Error(ERROR_MESSAGES.FILE_CORRUPTED));
      };

      reader.readAsDataURL(source);
    } else {
      // 直接是DataURL
      img.src = source;
    }
  });
}

/**
 * 读取文件为ArrayBuffer
 * @param {File} file - 文件对象
 * @param {function(number): void} [onProgress] - 加载进度回调
 * @returns {Promise<ArrayBuffer>}
 */
export function readFileAsArrayBuffer(file, onProgress) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error(ERROR_MESSAGES.INVALID_FILE));
      return;
    }

    const reader = new FileReader();

    reader.onprogress = (event) => {
      if (onProgress && event.lengthComputable) {
        const progress = event.loaded / event.total;
        onProgress(progress);
      }
    };

    reader.onload = (event) => {
      resolve(event.target.result);
    };

    reader.onerror = () => {
      reject(new Error(ERROR_MESSAGES.FILE_CORRUPTED));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * 通过文件签名检测文件格式
 * @param {File} file - 文件对象
 * @returns {Promise<string|null>}
 */
export function detectFormatBySignature(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error(ERROR_MESSAGES.INVALID_FILE));
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target.result;
        const uint8Array = new Uint8Array(arrayBuffer);

        // 读取最多前12字节用于格式检测
        const headerBytes = uint8Array.slice(0, 12);

        // 遍历所有文件签名进行匹配
        for (const [format, signature] of Object.entries(FILE_SIGNATURES)) {
          if (matchSignature(headerBytes, signature)) {
            resolve(format);
            return;
          }
        }

        resolve(null);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error(ERROR_MESSAGES.FILE_CORRUPTED));
    };

    // 只读取前12字节
    reader.readAsArrayBuffer(file.slice(0, 12));
  });
}

/**
 * 检查文件签名是否匹配
 * @private
 * @param {Uint8Array} header - 文件头字节
 * @param {Array<number>} signature - 签名字节数组
 * @returns {boolean}
 */
function matchSignature(header, signature) {
  if (signature.length > header.length) {
    return false;
  }

  for (let i = 0; i < signature.length; i++) {
    if (header[i] !== signature[i]) {
      return false;
    }
  }

  return true;
}

/**
 * 获取图片尺寸
 * @param {HTMLImageElement} img - 图片元素
 * @returns {{width: number, height: number}}
 */
export function getImageDimensions(img) {
  if (!img) {
    return { width: 0, height: 0 };
  }
  return {
    width: img.naturalWidth,
    height: img.naturalHeight
  };
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的文件大小
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, unitIndex);
  const formattedSize = size.toFixed(unitIndex === 0 ? 0 : 2);

  return `${formattedSize} ${units[unitIndex]}`;
}

/**
 * 创建Canvas元素
 * @param {number} width - 宽度
 * @param {number} height - 高度
 * @param {Object} [options={}] - 选项
 * @returns {HTMLCanvasElement}
 */
export function createCanvas(width, height, options = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  if (options.className) {
    canvas.className = options.className;
  }

  return canvas;
}

/**
 * 绘制图片到Canvas
 * @param {HTMLCanvasElement} canvas - Canvas元素
 * @param {HTMLImageElement} img - 图片元素
 * @param {Object} [options={}] - 绘制选项
 */
export function drawImageToCanvas(canvas, img, options = {}) {
  const ctx = canvas.getContext('2d');

  const {
    scale = 1,
    rotation = 0,
    offsetX = 0,
    offsetY = 0,
    quality = 'high'
  } = options;

  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 设置图像质量
  if (quality === 'high') {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }

  ctx.save();

  // 移动到中心点
  const centerX = canvas.width / 2 + offsetX;
  const centerY = canvas.height / 2 + offsetY;
  ctx.translate(centerX, centerY);

  // 旋转
  if (rotation !== 0) {
    ctx.rotate((rotation * Math.PI) / 180);
  }

  // 缩放
  ctx.scale(scale, scale);

  // 绘制图片（以中心为原点）
  ctx.drawImage(
    img,
    -img.naturalWidth / 2,
    -img.naturalHeight / 2
  );

  ctx.restore();
}

/**
 * 限制数值在指定范围内
 * @param {number} value - 数值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {number} 限制后的数值
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * 计算适合容器的缩放比例
 * @param {number} imgWidth - 图片宽度
 * @param {number} imgHeight - 图片高度
 * @param {number} containerWidth - 容器宽度
 * @param {number} containerHeight - 容器高度
 * @param {Object} [options={}] - 选项
 * @returns {number} 缩放比例
 */
export function calculateFitScale(
  imgWidth,
  imgHeight,
  containerWidth,
  containerHeight,
  options = {}
) {
  const {
    padding = 0,
    contain = true,
    maxScale = 1
  } = options;

  const availableWidth = containerWidth - padding * 2;
  const availableHeight = containerHeight - padding * 2;

  if (imgWidth === 0 || imgHeight === 0) {
    return 1;
  }

  let scale;

  if (contain) {
    // 完整显示（contain模式）
    const scaleX = availableWidth / imgWidth;
    const scaleY = availableHeight / imgHeight;
    scale = Math.min(scaleX, scaleY);
  } else {
    // 填充（cover模式）
    const scaleX = availableWidth / imgWidth;
    const scaleY = availableHeight / imgHeight;
    scale = Math.max(scaleX, scaleY);
  }

  // 限制最大缩放比例
  scale = Math.min(scale, maxScale);

  return Math.max(scale, 0.01); // 最小0.01，避免为0或负数
}

/**
 * 获取最近的缩放级别
 * @param {number} currentScale - 当前缩放比例
 * @param {number[]} levels - 缩放级别数组
 * @returns {number} 最接近的缩放级别
 */
export function getNearestScaleLevel(currentScale, levels) {
  if (!levels || levels.length === 0) {
    return currentScale;
  }

  // 找到最接近的级别
  let nearest = levels[0];
  let minDiff = Math.abs(currentScale - nearest);

  for (let i = 1; i < levels.length; i++) {
    const diff = Math.abs(currentScale - levels[i]);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = levels[i];
    }
  }

  return nearest;
}

/**
 * 计算两点之间的距离
 * @param {number} x1 - 点1的X坐标
 * @param {number} y1 - 点1的Y坐标
 * @param {number} x2 - 点2的X坐标
 * @param {number} y2 - 点2的Y坐标
 * @returns {number} 距离
 */
export function calculateDistance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 计算中心点
 * @param {number[]} points - 坐标数组 [x1, y1, x2, y2, ...]
 * @returns {{x: number, y: number}} 中心点坐标
 */
export function calculateCenter(...points) {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }

  if (points.length % 2 !== 0) {
    points = points.slice(0, points.length - 1);
  }

  let sumX = 0;
  let sumY = 0;
  const count = points.length / 2;

  for (let i = 0; i < points.length; i += 2) {
    sumX += points[i];
    sumY += points[i + 1];
  }

  return {
    x: sumX / count,
    y: sumY / count
  };
}

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 节流函数
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 时间限制（毫秒）
 * @returns {Function} 节流后的函数
 */
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * 检查是否为GIF图片
 * @param {File} file - 文件对象
 * @returns {Promise<boolean>}
 */
export async function isGifFile(file) {
  if (!file || !file.type) {
    return false;
  }

  if (file.type !== 'image/gif') {
    return false;
  }

  // 读取文件头部检查GIF签名
  try {
    const header = await readFileHeader(file, 6);
    const gifSignature = String.fromCharCode(...header.slice(0, 3));
    return gifSignature === 'GIF';
  } catch (error) {
    return false;
  }
}

/**
 * 读取文件头部
 * @param {File} file - 文件对象
 * @param {number} bytes - 读取字节数
 * @returns {Promise<Uint8Array>}
 */
function readFileHeader(file, bytes) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const arrayBuffer = event.target.result;
      const uint8Array = new Uint8Array(arrayBuffer);
      resolve(uint8Array.slice(0, bytes));
    };
    reader.onerror = () => reject(new Error(ERROR_MESSAGES.FILE_CORRUPTED));
    reader.readAsArrayBuffer(file.slice(0, bytes));
  });
}
