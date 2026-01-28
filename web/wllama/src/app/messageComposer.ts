import type { ChatMessage } from './state';

export type SendMessagePlan = {
  messagesForModel: ChatMessage[];
  messagesForUi: ChatMessage[];
  assistantIndex: number;
};

export function planSendMessage(existing: ChatMessage[], userText: string, systemPrompt: string): SendMessagePlan {
  const systemText = systemPrompt.trim();
  const messages: ChatMessage[] = existing.filter((m) => m.role !== 'system');
  if (systemText) {
    messages.unshift({ role: 'system', content: systemText });
  }
  messages.push({ role: 'user', content: userText });
  const assistantIndex = messages.length;
  return {
    messagesForModel: messages,
    messagesForUi: [...messages, { role: 'assistant', content: '' }],
    assistantIndex,
  };
}
