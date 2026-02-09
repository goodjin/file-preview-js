/**
 * StateManager 单元测试
 * 
 * @description 测试状态管理器的功能
 * @version 1.0.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventBus } from '../../../src/core/EventBus.js';
import { StateManager, StateKeys } from '../../../src/core/StateManager.js';

describe('StateManager', () => {
  let eventBus;
  let stateManager;

  beforeEach(() => {
    eventBus = new EventBus();
    stateManager = new StateManager(eventBus);
  });

  afterEach(() => {
    stateManager.clear();
  });

  describe('基础功能', () => {
    it('应该能够创建状态管理器实例', () => {
      expect(stateManager).toBeInstanceOf(StateManager);
      expect(stateManager.state).toEqual({});
      expect(stateManager.eventBus).toBe(eventBus);
    });

    it('应该能够设置和获取状态', () => {
      stateManager.setState('test', 'value');

      expect(stateManager.getState('test')).toBe('value');
    });

    it('应该能够获取所有状态', () => {
      stateManager.setState('test1', 'value1');
      stateManager.setState('test2', 'value2');

      expect(stateManager.getAllState()).toEqual({
        test1: 'value1',
        test2: 'value2'
      });
    });
  });

  describe('批量操作', () => {
    it('应该能够批量设置状态', () => {
      stateManager.setMultipleStates({
        test1: 'value1',
        test2: 'value2'
      });

      expect(stateManager.getState('test1')).toBe('value1');
      expect(stateManager.getState('test2')).toBe('value2');
    });
  });

  describe('订阅机制', () => {
    it('应该能够订阅状态变化', () => {
      const callback = vi.fn();
      const unsubscribe = stateManager.subscribe('test', callback);

      expect(unsubscribe).toBeInstanceOf(Function);

      stateManager.setState('test', 'new-value');

      expect(callback).toHaveBeenCalledWith('new-value', undefined);
    });

    it('应该能够取消订阅', () => {
      const callback = vi.fn();
      stateManager.subscribe('test', callback);
      stateManager.setState('test', 'value1');

      stateManager.unsubscribe('test');

      stateManager.setState('test', 'value2');

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('value1', undefined);
    });

    it('应该能够取消指定状态的所有订阅', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      stateManager.subscribe('test', callback1);
      stateManager.subscribe('test', callback2);

      stateManager.setState('test', 'value1');

      stateManager.unsubscribeAll('test');

      stateManager.setState('test', 'value2');

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });

  describe('事件触发', () => {
    it('应该在状态变化时触发事件', () => {
      const eventSpy = vi.spyOn(eventBus, 'emit');

      stateManager.setState('test', 'value');

      expect(eventSpy).toHaveBeenCalledWith(
        'state:test',
        { oldValue: undefined, newValue: 'value' }
      );
    });
  });

  describe('状态键常量', () => {
    it('应该定义所有状态键常量', () => {
      expect(StateKeys.CURRENT_FILE).toBe('currentFile');
      expect(StateKeys.FILE_TYPE).toBe('fileType');
      expect(StateKeys.ZOOM_LEVEL).toBe('zoomLevel');
      expect(StateKeys.CURRENT_PAGE).toBe('currentPage');
      expect(StateKeys.TOTAL_PAGES).toBe('totalPages');
      expect(StateKeys.LOADING).toBe('loading');
      expect(StateKeys.ERROR).toBe('error');
    });
  });

  describe('清除状态', () => {
    it('应该能够清除所有状态', () => {
      stateManager.setState('test1', 'value1');
      stateManager.setState('test2', 'value2');

      stateManager.clear();

      expect(stateManager.state).toEqual({});
      expect(stateManager.subscribers.size).toBe(0);
    });
  });
});