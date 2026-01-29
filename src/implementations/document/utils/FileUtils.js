/**
 * 文件读取工具
 * 提供文件读取、格式验证等功能
 */
class FileUtils {
  /**
   * 读取文件为ArrayBuffer
   * @param {File} file - 文件对象
   * @param {Function} onProgress - 进度回调
   * @returns {Promise<ArrayBuffer>}
   */
  static readFileAsArrayBuffer(file, onProgress) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => {
        reject(new Error(`文件读取失败: ${e.target.error?.message || '未知错误'}`));
      };
      
      reader.onprogress = (e) => {
        if (onProgress && e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
      
      reader.readAsArrayBuffer(file);
    });
  }
  
  /**
   * 读取文件为DataURL
   * @param {File} file - 文件对象
   * @returns {Promise<string>}
   */
  static readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => {
        reject(new Error(`文件读取失败: ${e.target.error?.message || '未知错误'}`));
      };
      reader.readAsDataURL(file);
    });
  }
  
  /**
   * 验证文件格式
   * @param {File} file - 文件对象
   * @param {string} expectedType - 期望的文件类型
   * @returns {boolean}
   */
  static validateFileType(file, expectedType) {
    const fileType = file.type.toLowerCase();
    return fileType === expectedType.toLowerCase() || 
           fileType.startsWith(expectedType.toLowerCase());
  }
  
  /**
   * 验证文件内容（通过读取文件头）
   * @param {File} file - 文件对象
   * @param {string} expectedSignature - 期望的文件头签名
   * @returns {Promise<boolean>}
   */
  static async validateFileContent(file, expectedSignature) {
    try {
      // 读取文件前几个字节
      const arrayBuffer = await this.readFileAsArrayBuffer(file);
      const signatureLength = expectedSignature.length;
      
      if (arrayBuffer.byteLength < signatureLength) {
        return false;
      }
      
      // 将字节数组转换为字符串
      const uint8Array = new Uint8Array(arrayBuffer);
      let fileSignature = '';
      for (let i = 0; i < signatureLength; i++) {
        fileSignature += String.fromCharCode(uint8Array[i]);
      }
      
      return fileSignature === expectedSignature;
    } catch (error) {
      console.error('文件内容验证失败:', error);
      return false;
    }
  }
  
  /**
   * 获取文件扩展名
   * @param {File} file - 文件对象
   * @returns {string}
   */
  static getFileExtension(file) {
    return file.name.split('.').pop().toLowerCase();
  }
  
  /**
   * 检查文件是否为PDF（包括文件头验证）
   * @param {File} file - 文件对象
   * @returns {Promise<boolean>}
   */
  static async isPDF(file) {
    // 先检查扩展名和MIME类型
    const extCheck = this.getFileExtension(file) === 'pdf';
    const typeCheck = this.validateFileType(file, 'application/pdf');
    
    if (!extCheck && !typeCheck) {
      return false;
    }
    
    // 进行文件头验证（PDF文件头以%PDF-开头）
    const isContentValid = await this.validateFileContent(file, '%PDF-');
    
    return isContentValid;
  }
  
  /**
   * 格式化文件大小
   * @param {number} bytes - 字节数
   * @returns {string}
   */
  static formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }
}

export default FileUtils;
