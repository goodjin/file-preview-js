/**
 * 页面处理工具
 * 提供页面渲染、缩放等辅助功能
 */
class PageUtils {
  /**
   * 计算缩放后的尺寸
   * @param {number} originalWidth - 原始宽度
   * @param {number} originalHeight - 原始高度
   * @param {number} scale - 缩放比例
   * @returns {Object} {width, height}
   */
  static calculateScaledSize(originalWidth, originalHeight, scale) {
    return {
      width: Math.round(originalWidth * scale),
      height: Math.round(originalHeight * scale)
    };
  }
  
  /**
   * 计算适配容器的缩放比例
   * @param {number} pageWidth - 页面宽度
   * @param {number} pageHeight - 页面高度
   * @param {number} containerWidth - 容器宽度
   * @param {number} containerHeight - 容器高度
   * @returns {number} 缩放比例
   */
  static calculateFitScale(pageWidth, pageHeight, containerWidth, containerHeight) {
    const scaleX = containerWidth / pageWidth;
    const scaleY = containerHeight / pageHeight;
    return Math.min(scaleX, scaleY, 1.0);
  }
  
  /**
   * 限制缩放范围
   * @param {number} scale - 缩放比例
   * @param {number} minScale - 最小缩放（默认0.25）
   * @param {number} maxScale - 最大缩放（默认4.0）
   * @returns {number}
   */
  static clampScale(scale, minScale = 0.25, maxScale = 4.0) {
    return Math.max(minScale, Math.min(maxScale, scale));
  }
  
  /**
   * 缩放比例转百分比字符串
   * @param {number} scale - 缩放比例
   * @returns {string}
   */
  static scaleToPercentage(scale) {
    return Math.round(scale * 100) + '%';
  }
  
  /**
   * 百分比字符串转缩放比例
   * @param {string} percentage - 百分比字符串（如"100%"）
   * @returns {number}
   */
  static percentageToScale(percentage) {
    return parseInt(percentage) / 100;
  }
  
  /**
   * 计算页面位置
   * @param {number} pageIndex - 页面索引
   * @param {number} pageHeight - 页面高度
   * @param {number} verticalGap - 垂直间距（默认20px）
   * @returns {number} 顶部偏移量
   */
  static calculatePageOffset(pageIndex, pageHeight, verticalGap = 20) {
    return pageIndex * (pageHeight + verticalGap);
  }
  
  /**
   * 标准化页面索引（确保在有效范围内）
   * @param {number} pageIndex - 页面索引
   * @param {number} totalPages - 总页数
   * @returns {number}
   */
  static normalizePageIndex(pageIndex, totalPages) {
    return Math.max(0, Math.min(pageIndex, totalPages - 1));
  }
}

export default PageUtils;
