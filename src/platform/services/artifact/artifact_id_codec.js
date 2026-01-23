/**
 * 工件ID编解码器
 * 
 * 职责：
 * - 判断工件ID类型（普通工件/工作区工件）
 * - 编码工作区工件ID（工作区ID + 文件路径 -> 编码字符串）
 * - 解码工作区工件ID（编码字符串 -> 工作区ID + 文件路径）
 * - 路径的Base64编码/解码（URL安全）
 * 
 * 工作区工件ID格式: ws:{workspaceId}:{base64Path}
 * 示例: "ws:agent-abc123:c3JjL21haW4uanM"
 * 
 * 设计约束：
 * - 工作区工件ID必须以"ws:"前缀开始
 * - 使用URL安全的Base64编码（替换+为-，/为_，移除=填充）
 * - 普通工件ID不包含"ws:"前缀，按现有逻辑处理
 * - 编码后的ID不包含文件系统特殊字符
 */
class ArtifactIdCodec {
  /**
   * 判断是否为工作区工件ID
   * 
   * @param {string} artifactId - 工件ID
   * @returns {boolean} true表示工作区工件，false表示普通工件
   * 
   * @example
   * ArtifactIdCodec.isWorkspaceArtifact("ws:agent-123:abc") // true
   * ArtifactIdCodec.isWorkspaceArtifact("12345") // false
   */
  static isWorkspaceArtifact(artifactId) {
    if (!artifactId || typeof artifactId !== 'string') {
      return false;
    }
    return artifactId.startsWith('ws:');
  }

  /**
   * 编码工作区工件ID
   * 
   * @param {string} workspaceId - 工作区ID
   * @param {string} relativePath - 文件相对路径
   * @returns {string} 编码后的工件ID，格式: ws:{workspaceId}:{base64Path}
   * @throws {Error} 当workspaceId或relativePath为空时抛出错误
   * 
   * @example
   * ArtifactIdCodec.encode("agent-123", "src/main.js")
   * // 返回: "ws:agent-123:c3JjL21haW4uanM"
   */
  static encode(workspaceId, relativePath) {
    if (!workspaceId || !relativePath) {
      throw new Error('workspaceId and relativePath are required');
    }

    const base64Path = this._encodePathToBase64(relativePath);
    return `ws:${workspaceId}:${base64Path}`;
  }

  /**
   * 解码工作区工件ID
   * 
   * @param {string} artifactId - 工件ID
   * @returns {{workspaceId: string, relativePath: string} | null} 
   *          解码成功返回对象，失败返回null
   * 
   * @example
   * ArtifactIdCodec.decode("ws:agent-123:c3JjL21haW4uanM")
   * // 返回: {workspaceId: "agent-123", relativePath: "src/main.js"}
   * 
   * ArtifactIdCodec.decode("invalid-format")
   * // 返回: null
   */
  static decode(artifactId) {
    if (!artifactId || typeof artifactId !== 'string') {
      return null;
    }

    // 检查前缀
    if (!artifactId.startsWith('ws:')) {
      return null;
    }

    // 分割字符串: ["ws", workspaceId, base64Path]
    const parts = artifactId.split(':');
    if (parts.length < 3) {
      return null;
    }

    const workspaceId = parts[1];
    const base64Path = parts.slice(2).join(':'); // 处理路径中可能包含冒号的情况

    if (!workspaceId || !base64Path) {
      return null;
    }

    try {
      const relativePath = this._decodePathFromBase64(base64Path);
      return { workspaceId, relativePath };
    } catch (err) {
      // Base64解码失败
      return null;
    }
  }

  /**
   * 对路径进行Base64编码（URL安全）
   * 
   * 使用URL安全的Base64编码：
   * - 替换 + 为 -
   * - 替换 / 为 _
   * - 移除 = 填充
   * 
   * @param {string} path - 文件路径
   * @returns {string} Base64编码的路径
   * @private
   */
  static _encodePathToBase64(path) {
    const buffer = Buffer.from(path, 'utf8');
    const base64 = buffer.toString('base64');
    
    // 转换为URL安全的Base64
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * 从Base64解码路径
   * 
   * 解码URL安全的Base64：
   * - 替换 - 为 +
   * - 替换 _ 为 /
   * - 补充 = 填充
   * 
   * @param {string} base64 - Base64编码的路径
   * @returns {string} 解码后的路径
   * @throws {Error} 当Base64格式无效时抛出错误
   * @private
   */
  static _decodePathFromBase64(base64) {
    // 转换回标准Base64
    let standardBase64 = base64
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    // 补充=填充
    const padding = (4 - (standardBase64.length % 4)) % 4;
    standardBase64 += '='.repeat(padding);
    
    const buffer = Buffer.from(standardBase64, 'base64');
    return buffer.toString('utf8');
  }
}

export default ArtifactIdCodec;
