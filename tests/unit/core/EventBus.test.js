/**
 * EventBus 单元测试
 * 
 * @description 测试事件总线的功能
 * @version 1.0.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventBus, Events } from '../../../src/core/EventBus.js';

describe('EventBus', () => {
  let eventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  afterEach(() => {
    eventBus.clear();
  });

  describe('基础功能', () => {
    it('应该能够创建事件总线实例', () => {
      expect(eventBus).toBeInstanceOf(EventBus);
      expect(eventBus.events).toBeInstanceOf(Map);
    });

    it('应该能够订阅事件', () => {
      const callback = vi.fn();
      const unsubscribe = eventBus.on('test:event', callback);

      expect(callback).toHaveBeenCalled();
      expect(unsubscribe).toBeInstanceOf(Function);
    });

    it('应该能够触发事件', () => {
      const callback = vi.fn();
      eventBus.on('test:event', callback);

      eventBus.emit('test:event', { data: 'test' });

      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });

    it('应该能够取消订阅', () => {
      const callback = vi.fn();
      eventBus.on('test:event', callback);
      eventBus.off('test:event', callback);

      eventBus.emit('test:event', { data: 'test' });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('一次订阅', () => {
    it('应该只触发一次', () => {
      const callback = vi.fn();
      eventBus.once('test:event', callback);

      eventBus.emit('test:event', { data: 'test1' });
      eventBus.emit('test:event', { data: 'test2' });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ data: 'test1' });
    });
  });

  describe('多个订阅者', () => {
    it('应该支持多个订阅者', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      eventBus.on('test:event', callback1);
      eventBus.on('test:event', callback2);
      eventBus.on('test:event', callback3);

      eventBus.emit('test:event', { data: 'test' });

      expect(callback1).toHaveBeenCalledWith({ data: 'test' });
      expect(callback2).toHaveBeenCalledWith({ data: 'test' });
      expect(callback3).toHaveBeenCalledWith({ data: 'test' });
    });
  });

  describe('清除事件', () => {
    it('应该能够清除所有事件', () => {
      eventBus.on('test:event1', vi.fn());
      eventBus.on('test:event2', vi.fn());

      eventBus.clear();

      expect(eventBus.events.size).toBe(0);
    });
  });

  describe('监听器数量', () => {
    it('应该返回正确的监听器数量', () => {
      eventBus.on('test:event', vi.fn());
      eventBus.on('test:event', vi.fn());
      eventBus.on('test:event', vi.fn());

      expect(eventBus.listenerCount('test:event')).toBe(3);
    });

    it('应该为不存在的事件返回0', () => {
      expect(eventBus.listenerCount('non-existent')).toBe(0);
    });
  });

  describe('事件类型常量', () => {
    it('应该定义所有事件类型常量', () => {
      expect(Events.FILE_LOADED).toBe('file:loaded');
      expect(Events.FILE_LOAD_PROGRESS).toBe('file:load:progress');
      expect(Events.FILE_LOAD_ERROR).toBe('file:load:error');
      expect(Events.PREVIEW_READY).toBe('preview:ready');
      expect(Events.PREVIEW_ERROR).toBe('preview:error');
      expect(Events.ZOOM_CHANGED).toBe('zoom:changed');
      expect(Events.PAGE_CHANGED).toBe('page:changed');
      expect(Events.FULLSCREEN_TOGGLE).toBe('fullscreen:toggle');
      expect(Events.APP_READY).toBe('app:ready');
      expect(Events.APP_ERROR).toBe('app:error');
    });
  });

  describe('错误处理', () => {
    it('应该捕获回调中的错误', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const callback = () => {
        throw new Error('Test error');
      };

      eventBus.on('error:event', callback);
      eventBus.emit('error:event', {});

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.any(Error),
        'Error in event handler for error:event'
      );

      consoleErrorSpy.mockRestore();
    });
  });
});