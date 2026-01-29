/**
 * EventBus 单元测试
 */

import EventBus, { SystemEvents, PreviewerEvents, UIEvents } from './EventBus.js';

describe('EventBus', () => {
  let eventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  afterEach(() => {
    eventBus.clear();
  });

  describe('on', () => {
    test('应该成功订阅事件', () => {
      const callback = jest.fn();
      const id = eventBus.on('test:event', callback);
      
      expect(typeof id).toBe('number');
      expect(eventBus.listenerCount('test:event')).toBe(1);
    });

    test('应该支持多个订阅者', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      eventBus.on('test:event', callback1);
      eventBus.on('test:event', callback2);
      
      expect(eventBus.listenerCount('test:event')).toBe(2);
    });

    test('非函数回调应该抛出错误', () => {
      expect(() => eventBus.on('test:event', null)).toThrow(TypeError);
      expect(() => eventBus.on('test:event', 'string')).toThrow(TypeError);
    });

    test('应该支持优先级', () => {
      const order = [];
      
      const callback1 = jest.fn(() => order.push(1));
      const callback2 = jest.fn(() => order.push(2));
      const callback3 = jest.fn(() => order.push(3));
      
      eventBus.on('test:event', callback1, { priority: 1 });
      eventBus.on('test:event', callback2, { priority: 3 }); // 高优先级
      eventBus.on('test:event', callback3, { priority: 2 });
      
      eventBus.emit('test:event');
      
      expect(order).toEqual([2, 3, 1]);
    });

    test('应该支持context', () => {
      const context = { value: 'test' };
      const callback = jest.fn(function() {
        expect(this).toBe(context);
      });
      
      eventBus.on('test:event', callback, { context });
      eventBus.emit('test:event');
      
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('once', () => {
    test('应该只执行一次', () => {
      const callback = jest.fn();
      
      eventBus.once('test:event', callback);
      
      eventBus.emit('test:event');
      eventBus.emit('test:event');
      
      expect(callback).toHaveBeenCalledTimes(1);
    });

    test('应该返回订阅ID', () => {
      const callback = jest.fn();
      const id = eventBus.once('test:event', callback);
      
      expect(typeof id).toBe('number');
    });

    test('应该支持优先级', () => {
      const order = [];
      
      const callback1 = jest.fn(() => order.push(1));
      const callback2 = jest.fn(() => order.push(2));
      
      eventBus.once('test:event', callback1, { priority: 1 });
      eventBus.once('test:event', callback2, { priority: 2 });
      
      eventBus.emit('test:event');
      
      expect(order).toEqual([2, 1]);
    });
  });

  describe('off', () => {
    test('应该通过回调取消订阅', () => {
      const callback = jest.fn();
      eventBus.on('test:event', callback);
      
      eventBus.off('test:event', callback);
      eventBus.emit('test:event');
      
      expect(callback).not.toHaveBeenCalled();
    });

    test('取消不存在的订阅不应该报错', () => {
      const callback = jest.fn();
      expect(() => eventBus.off('test:event', callback)).not.toThrow();
    });
  });

  describe('offById', () => {
    test('应该通过ID取消订阅', () => {
      const callback = jest.fn();
      const id = eventBus.on('test:event', callback);
      
      const removed = eventBus.offById('test:event', id);
      
      expect(removed).toBe(true);
      eventBus.emit('test:event');
      expect(callback).not.toHaveBeenCalled();
    });

    test('应该移除一次性订阅', () => {
      const callback = jest.fn();
      const id = eventBus.once('test:event', callback);
      
      eventBus.emit('test:event');
      expect(callback).toHaveBeenCalledTimes(1);
      
      // 此时订阅应该已经被移除
      eventBus.emit('test:event');
      expect(callback).toHaveBeenCalledTimes(1);
    });

    test('不存在的ID应该返回false', () => {
      expect(eventBus.offById('test:event', 99999)).toBe(false);
    });
  });

  describe('emit', () => {
    test('应该触发所有订阅者', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();
      
      eventBus.on('test:event', callback1);
      eventBus.on('test:event', callback2);
      eventBus.on('test:event', callback3);
      
      eventBus.emit('test:event', { data: 'test' });
      
      expect(callback1).toHaveBeenCalledWith({ data: 'test' }, 'test:event');
      expect(callback2).toHaveBeenCalledWith({ data: 'test' }, 'test:event');
      expect(callback3).toHaveBeenCalledWith({ data: 'test' }, 'test:event');
    });

    test('没有订阅者应该返回false', () => {
      expect(eventBus.emit('test:event')).toBe(false);
    });

    test('有订阅者应该返回true', () => {
      const callback = jest.fn();
      eventBus.on('test:event', callback);
      
      expect(eventBus.emit('test:event')).toBe(true);
    });

    test('回调抛出错误不应该影响其他回调', () => {
      const callback1 = jest.fn(() => { throw new Error('Test error'); });
      const callback2 = jest.fn();
      
      eventBus.on('test:event', callback1);
      eventBus.on('test:event', callback2);
      
      expect(() => eventBus.emit('test:event')).not.toThrow();
      expect(callback2).toHaveBeenCalled();
    });

    test('应该支持命名空间通配符', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();
      
      eventBus.on('previewer:render_start', callback1);
      eventBus.on('previewer:render_complete', callback2);
      eventBus.on('system:ready', callback3);
      
      eventBus.emit('previewer:*');
      
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
      expect(callback3).not.toHaveBeenCalled();
    });
  });

  describe('emitAsync', () => {
    test('应该异步触发所有订阅者', async () => {
      const callback1 = jest.fn(() => Promise.resolve('result1'));
      const callback2 = jest.fn(() => Promise.resolve('result2'));
      
      eventBus.on('test:event', callback1);
      eventBus.on('test:event', callback2);
      
      const results = await eventBus.emitAsync('test:event');
      
      expect(results).toEqual(['result1', 'result2']);
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    test('应该处理同步回调', async () => {
      const callback = jest.fn(() => 'sync result');
      
      eventBus.on('test:event', callback);
      
      const results = await eventBus.emitAsync('test:event');
      
      expect(results).toEqual(['sync result']);
    });

    test('回调失败应该返回null', async () => {
      const callback = jest.fn(() => Promise.reject(new Error('Error')));
      
      eventBus.on('test:event', callback);
      
      const results = await eventBus.emitAsync('test:event');
      
      expect(results).toEqual([null]);
    });
  });

  describe('listenerCount', () => {
    test('应该返回正确的监听器数量', () => {
      eventBus.on('test:event', jest.fn());
      eventBus.on('test:event', jest.fn());
      eventBus.on('test:event', jest.fn());
      
      expect(eventBus.listenerCount('test:event')).toBe(3);
    });

    test('没有监听器应该返回0', () => {
      expect(eventBus.listenerCount('test:event')).toBe(0);
    });
  });

  describe('eventNames', () => {
    test('应该返回所有事件名称', () => {
      eventBus.on('event1', jest.fn());
      eventBus.on('event2', jest.fn());
      eventBus.on('event3', jest.fn());
      
      const names = eventBus.eventNames();
      
      expect(names).toContain('event1');
      expect(names).toContain('event2');
      expect(names).toContain('event3');
    });

    test('空事件总线应该返回空数组', () => {
      expect(eventBus.eventNames()).toEqual([]);
    });
  });

  describe('clear', () => {
    test('应该清除所有事件', () => {
      eventBus.on('event1', jest.fn());
      eventBus.on('event2', jest.fn());
      
      eventBus.clear();
      
      expect(eventBus.eventNames()).toEqual([]);
    });
  });

  describe('clearEvent', () => {
    test('应该清除指定事件', () => {
      eventBus.on('event1', jest.fn());
      eventBus.on('event2', jest.fn());
      
      eventBus.clearEvent('event1');
      
      expect(eventBus.eventNames()).toEqual(['event2']);
    });
  });

  describe('emitBatch', () => {
    test('应该批量触发事件', () => {
      const callback = jest.fn();
      eventBus.on('test:event', callback);
      
      eventBus.emitBatch([
        { event: 'test:event', data: 1 },
        { event: 'test:event', data: 2 },
        { event: 'test:event', data: 3 }
      ]);
      
      expect(callback).toHaveBeenCalledTimes(3);
      expect(callback).toHaveBeenNthCalledWith(1, 1, 'test:event');
      expect(callback).toHaveBeenNthCalledWith(2, 2, 'test:event');
      expect(callback).toHaveBeenNthCalledWith(3, 3, 'test:event');
    });
  });

  describe('namespace', () => {
    test('应该创建命名空间', () => {
      const ns = eventBus.namespace('previewer');
      const callback = jest.fn();
      
      ns.on('render_start', callback);
      ns.emit('render_start', { test: 'data' });
      
      expect(callback).toHaveBeenCalledWith({ test: 'data' }, 'previewer:render_start');
    });

    test('应该支持命名空间的once', () => {
      const ns = eventBus.namespace('previewer');
      const callback = jest.fn();
      
      ns.once('render_start', callback);
      
      ns.emit('render_start');
      ns.emit('render_start');
      
      expect(callback).toHaveBeenCalledTimes(1);
    });

    test('应该支持命名空间的off', () => {
      const ns = eventBus.namespace('previewer');
      const callback = jest.fn();
      
      ns.on('render_start', callback);
      ns.off('render_start', callback);
      
      ns.emit('render_start');
      
      expect(callback).not.toHaveBeenCalled();
    });

    test('应该支持命名空间的listenerCount', () => {
      const ns = eventBus.namespace('previewer');
      
      ns.on('event1', jest.fn());
      ns.on('event1', jest.fn());
      
      expect(ns.listenerCount('event1')).toBe(2);
    });
  });

  describe('标准事件常量', () => {
    test('应该导出SystemEvents', () => {
      expect(SystemEvents.FILE_LOADED).toBe('system:file_loaded');
      expect(SystemEvents.FILE_ERROR).toBe('system:file_error');
      expect(SystemEvents.FILE_UNLOADED).toBe('system:file_unloaded');
      expect(SystemEvents.SYSTEM_READY).toBe('system:ready');
    });

    test('应该导出PreviewerEvents', () => {
      expect(PreviewerEvents.RENDER_START).toBe('previewer:render_start');
      expect(PreviewerEvents.RENDER_COMPLETE).toBe('previewer:render_complete');
      expect(PreviewerEvents.RENDER_ERROR).toBe('previewer:render_error');
      expect(PreviewerEvents.PAGE_CHANGED).toBe('previewer:page_changed');
      expect(PreviewerEvents.ZOOM_CHANGED).toBe('previewer:zoom_changed');
    });

    test('应该导出UIEvents', () => {
      expect(UIEvents.FULLSCREEN_ENTER).toBe('ui:fullscreen_enter');
      expect(UIEvents.FULLSCREEN_EXIT).toBe('ui:fullscreen_exit');
      expect(UIEvents.RESIZE).toBe('ui:resize');
    });
  });
});
