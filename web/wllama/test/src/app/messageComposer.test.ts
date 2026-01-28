import { describe, expect, test } from 'bun:test';
import { planSendMessage } from '../../../src/app/messageComposer';

describe('planSendMessage', () => {
  test('adds system message once and returns assistant placeholder only for UI', () => {
    const p1 = planSendMessage([], 'hi');
    expect(p1.messagesForModel.length).toBe(2);
    expect(p1.messagesForModel[0]?.role).toBe('system');
    expect(p1.messagesForModel[1]?.role).toBe('user');
    expect(p1.assistantIndex).toBe(2);
    expect(p1.messagesForUi.length).toBe(3);
    expect(p1.messagesForUi[2]?.role).toBe('assistant');
    expect(p1.messagesForUi[2]?.content).toBe('');

    const p2 = planSendMessage(p1.messagesForUi, 'next');
    const roles = p2.messagesForModel.map((m) => m.role);
    const systemCount = roles.filter((r) => r === 'system').length;
    expect(systemCount).toBe(1);
    expect(p2.messagesForUi[p2.messagesForUi.length - 1]?.role).toBe('assistant');
  });
});

