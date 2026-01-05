/**
 * 消息格式化器
 * 
 * 负责将消息格式化为智能体可理解的结构化文本。
 * 包含来源标识行、消息内容、回复提示。
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

/**
 * 格式化消息以呈现给智能体
 * @param {Object} message - 原始消息
 * @param {string} message.from - 发送者ID
 * @param {any} message.payload - 消息内容
 * @param {Object} [senderInfo] - 发送者信息
 * @param {string} [senderInfo.role] - 发送者角色名称
 * @returns {string} 格式化后的消息文本
 */
export function formatMessageForAgent(message, senderInfo) {
  const from = message?.from ?? 'unknown';
  const payload = message?.payload;
  const senderRole = senderInfo?.role ?? 'unknown';

  // 生成来源标识行（Requirements 10.3, 10.4）
  let header;
  if (from === 'user') {
    // 用户消息的特殊格式（Requirements 10.4）
    header = '【来自用户的消息】';
  } else {
    // 普通智能体消息格式（Requirements 10.3）
    header = `【来自 ${senderRole}（${from}）的消息】`;
  }

  // 提取消息内容（Requirements 10.2）
  let content;
  if (payload === null || payload === undefined) {
    content = '';
  } else if (typeof payload === 'object') {
    // 优先使用 text 或 content 字段
    content = payload.text ?? payload.content ?? JSON.stringify(payload);
  } else {
    content = String(payload);
  }

  // 生成回复提示（Requirements 10.5）
  // 用户消息不需要回复提示
  const replyHint = from !== 'user'
    ? `\n如需回复，请使用 send_message(to='${from}', ...)`
    : '';

  // 组合最终格式（Requirements 10.1, 10.2）
  return `${header}\n${content}${replyHint}`;
}
