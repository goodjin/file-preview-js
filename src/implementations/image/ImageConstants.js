/**
 * 图片预览模块常量定义
 * @description 定义图片预览模块使用的所有常量
 */

/**
 * 支持的图片格式
 * @constant {Array<string>}
 */
const SUPPORTED_FORMATS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'psd', 'tif'];

/**
 * 文件类型映射表
 * @constant {Object}
 */
const FILE_TYPES = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
  'image/vnd.adobe.photoshop': 'psd',
  'image/tiff': 'tif',
  'image/tif': 'tif'
};

/**
 * MIME类型映射表
 * @constant {Object}
 */
const MIME_TYPES = {
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'bmp': 'image/bmp',
  'svg': 'image/svg+xml',
  'webp': 'image/webp',
  'psd': 'image/vnd.adobe.photoshop',
  'tif': 'image/tiff',
  'tiff': 'image/tiff'
};

/**
 * 文件扩展名映射表
 * @constant {Object}
 */
const FILE_EXTENSIONS = {
  'jpg': 'jpg',
  'jpeg': 'jpg',
  'png': 'png',
  'gif': 'gif',
  'bmp': 'bmp',
  'svg': 'svg',
  'webp': 'webp',
  'psd': 'psd',
  'tif': 'tif',
  'tiff': 'tif'
};

/**
 * 文件签名表
 * @constant {Object}
 */
const FILE_SIGNATURES = {
  jpg: [0xFF, 0xD8, 0xFF],
  png: [0x89, 0x50, 0x4E, 0x47],
  gif: [0x47, 0x49, 0x46],
  bmp: [0x42, 0x4D],
  webp: [0x52, 0x49, 0x46, 0x46],
  psd: [0x38, 0x42, 0x50, 0x53], // '8BPS'
  tif: [0x49, 0x49, 0x2A, 0x00] // Little-endian TIFF
};

/**
 * PSD文件签名
 * @constant {Array<number>}
 */
const PSD_SIGNATURES = [[0x38, 0x42, 0x50, 0x53]]; // '8BPS'

/**
 * TIFF文件签名
 * @constant {Array<Array<number>>}
 */
const TIFF_SIGNATURES = [
  [0x49, 0x49, 0x2A, 0x00], // Little-endian
  [0x4D, 0x4D, 0x00, 0x2A]  // Big-endian
];

/**
 * BMP文件签名
 * @constant {Array<Array<number>>}
 */
const BMP_SIGNATURES = [
  [0x42, 0x4D], // BM
  [0x42, 0x41], // BA
  [0x43, 0x49], // CI
  [0x43, 0x50], // CP
  [0x49, 0x43], // IC
  [0x50, 0x54]  // PT
];

/**
 * 缩放比例选项
 * @constant {Array<number>}
 */
const SCALE_LEVELS = [0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 4.0];

/**
 * 默认缩放比例
 * @constant {number}
 */
const DEFAULT_SCALE = 1.0;

/**
 * 最小缩放比例
 * @constant {number}
 */
const MIN_SCALE = 0.1;

/**
 * 最大缩放比例
 * @constant {number}
 */
const MAX_SCALE = 10.0;

/**
 * 旋转角度步进（度）
 * @constant {number}
 */
const ROTATE_STEP = 90;

/**
 * GIF动画播放间隔（毫秒）
 * @constant {number}
 */
const GIF_PLAY_INTERVAL = 100;

/**
 * 最大文件大小警告阈值（字节）
 * @constant {number}
 */
const FILE_SIZE_WARNING = 10 * 1024 * 1024; // 10MB

/**
 * 最大文件大小限制（字节）
 * @constant {number}
 */
const FILE_SIZE_LIMIT = 100 * 1024 * 1024; // 100MB

/**
 * 错误信息
 * @constant {Object}
 */
const ERROR_MESSAGES = {
  UNSUPPORTED_FORMAT: '不支持的文件格式',
  FILE_TOO_LARGE: '文件过大，请选择小于100MB的文件',
  FILE_CORRUPTED: '文件损坏，无法加载',
  LOAD_FAILED: '图片加载失败',
  INVALID_FILE: '无效的文件',
  NETWORK_ERROR: '网络错误',
  UNKNOWN_ERROR: '未知错误',
  PSD_PARSE_FAILED: 'PSD文件解析失败',
  PSD_UNSUPPORTED: '此PSD文件格式不支持预览',
  TIFF_PARSE_FAILED: 'TIFF文件解析失败',
  TIFF_UNSUPPORTED: '此TIFF文件格式不支持预览'
};

/**
 * 事件类型
 * @constant {Object}
 */
const EVENT_TYPES = {
  LOAD_START: 'loadStart',
  LOAD_PROGRESS: 'loadProgress',
  LOAD_COMPLETE: 'loadComplete',
  LOAD_ERROR: 'loadError',
  SCALE_CHANGE: 'scaleChange',
  ROTATE_CHANGE: 'rotateChange',
  PLAY: 'play',
  PAUSE: 'pause',
  RESET: 'reset'
};

/**
 * 默认配置选项
 * @constant {Object}
 */
const DEFAULT_OPTIONS = {
  scale: DEFAULT_SCALE,
  rotation: 0,
  minScale: MIN_SCALE,
  maxScale: MAX_SCALE,
  enableDrag: true,
  enableZoom: true,
  enableRotate: true,
  enableTouch: true,
  smoothScale: true,
  scaleDuration: 300,
  scaleEasing: 'cubic-bezier(0.4, 0, 0.2, 1)'
};

/**
 * 触摸手势类型
 * @constant {Object}
 */
const GESTURE_TYPES = {
  TAP: 'tap',
  DOUBLE_TAP: 'doubleTap',
  PINCH: 'pinch',
  DRAG: 'drag',
  SWIPE: 'swipe'
};

/**
 * 触摸手势阈值
 * @constant {Object}
 */
const GESTURE_THRESHOLDS = {
  TAP_DURATION: 300,
  DOUBLE_TAP_DURATION: 300,
  DOUBLE_TAP_DELAY: 300,
  PINCH_MIN_SCALE: 0.1,
  DRAG_THRESHOLD: 10,
  SWIPE_THRESHOLD: 50,
  SWIPE_VELOCITY: 0.5
};

/**
 * 鼠标滚轮缩放速度
 * @constant {number}
 */
const WHEEL_ZOOM_SPEED = 0.001;

/**
 * 键盘快捷键
 * @constant {Object}
 */
const KEYBOARD_SHORTCUTS = {
  ZOOM_IN: '+',
  ZOOM_OUT: '-',
  ROTATE_LEFT: 'r',
  ROTATE_RIGHT: 'R',
  RESET: 'Escape',
  PLAY_PAUSE: 'Space'
};

/**
 * 导出所有常量
 */
export {
  SUPPORTED_FORMATS,
  FILE_TYPES,
  MIME_TYPES,
  FILE_EXTENSIONS,
  FILE_SIGNATURES,
  PSD_SIGNATURES,
  TIFF_SIGNATURES,
  BMP_SIGNATURES,
  SCALE_LEVELS,
  DEFAULT_SCALE,
  MIN_SCALE,
  MAX_SCALE,
  ROTATE_STEP,
  GIF_PLAY_INTERVAL,
  FILE_SIZE_WARNING,
  FILE_SIZE_LIMIT,
  ERROR_MESSAGES,
  EVENT_TYPES,
  DEFAULT_OPTIONS,
  GESTURE_TYPES,
  GESTURE_THRESHOLDS,
  WHEEL_ZOOM_SPEED,
  KEYBOARD_SHORTCUTS
};
