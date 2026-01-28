import type { ChatMessage } from './state';

export type SendMessagePlan = {
  messagesForModel: ChatMessage[];
  messagesForUi: ChatMessage[];
  assistantIndex: number;
};

export function planSendMessage(existing: ChatMessage[], userText: string): SendMessagePlan {
  const messages: ChatMessage[] = [...existing];
  if (!messages.some((m) => m.role === 'system')) {
    messages.unshift({ role: 'system', content: '你是一个有帮助的助手。' });
  }
  messages.push({ role: 'user', content: userText });
  const assistantIndex = messages.length;
  return {
    messagesForModel: messages,
    messagesForUi: [...messages, { role: 'assistant', content: '' }],
    assistantIndex,
  };
}

