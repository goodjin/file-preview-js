/**
 * StateManager 单元测试
 */

import StateManager, { DEFAULT_STATE, PERSISTENT_KEYS } from './StateManager.js';

describe('StateManager', () => {
  let stateManager;

  beforeEach(() => {
    stateManager = new StateManager();
    // 清除LocalStorage
    localStorage.clear();
  });

  describe('get', () => {
    test('应该获取完整的状态', () => {
      const state = stateManager.get();
      expect(state).toHaveProperty('currentFile');
      expect(state).toHaveProperty('previewer');
      expect(state).toHaveProperty('ui');
      expect(state).toHaveProperty('preferences');
    });

    test('应该通过路径获取状态', () => {
      expect(stateManager.get('previewer.zoom')).toBe(1.0);
      expect(stateManager.get('previewer.currentPage')).toBe(1);
      expect(stateManager.get('ui.isFullscreen')).toBe(false);
    });

    test('应该处理不存在的路径', () => {
      expect(stateManager.get('nonexistent.path')).toBeUndefined();
    });

    test('空参数应该返回完整状态', () => {
      const state = stateManager.get();
      expect(state).toBeDefined();
      expect(typeof state).toBe('object');
    });
  });

  describe('set', () => {
    test('应该设置状态值', () => {
      stateManager.set('previewer.zoom', 1.5);
      expect(stateManager.get('previewer.zoom')).toBe(1.5);
    });

    test('应该设置嵌套属性', () => {
      stateManager.set('ui.newProperty', 'test');
      expect(stateManager.get('ui.newProperty')).toBe('test');
    });

    test('应该触发订阅', () => {
      const callback = jest.fn();
      stateManager.subscribe('previewer.zoom', callback);
      
      stateManager.set('previewer.zoom', 2.0);
      
      expect(callback).toHaveBeenCalledWith(2.0, 1.0);
    });

    test('设置相同值不应该触发订阅', () => {
      const callback = jest.fn();
      stateManager.subscribe('previewer.zoom', callback);
      
      stateManager.set('previewer.zoom', 1.0);
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    test('应该批量更新状态', () => {
      stateManager.update({
        'previewer.zoom': 1.5,
        'previewer.currentPage': 5,
        'ui.isFullscreen': true
      });

      expect(stateManager.get('previewer.zoom')).toBe(1.5);
      expect(stateManager.get('previewer.currentPage')).toBe(5);
      expect(stateManager.get('ui.isFullscreen')).toBe(true);
    });
  });

  describe('reset', () => {
    test('应该重置所有状态到默认值', () => {
      stateManager.set('previewer.zoom', 2.5);
      stateManager.set('ui.isFullscreen', true);
      
      stateManager.reset();
      
      expect(stateManager.get('previewer.zoom')).toBe(1.0);
      expect(stateManager.get('ui.isFullscreen')).toBe(false);
    });

    test('应该重置指定路径的状态', () => {
      stateManager.set('previewer.zoom', 2.5);
      stateManager.set('ui.isFullscreen', true);
      
      stateManager.reset('previewer.zoom');
      
      expect(stateManager.get('previewer.zoom')).toBe(1.0);
      expect(stateManager.get('ui.isFullscreen')).toBe(true);
    });
  });

  describe('subscribe', () => {
    test('应该成功订阅状态变化', () => {
      const callback = jest.fn();
      const id = stateManager.subscribe('previewer.zoom', callback);
      
      expect(typeof id).toBe('number');
      
      stateManager.set('previewer.zoom', 1.5);
      
      expect(callback).toHaveBeenCalledWith(1.5, 1.0);
    });

    test('应该支持嵌套路径订阅', () => {
      const callback = jest.fn();
      stateManager.subscribe('previewer.zoom', callback);
      
      stateManager.set('previewer.zoom', 2.0);
      
      expect(callback).toHaveBeenCalled();
    });

    test('应该支持父级路径订阅', () => {
      const callback = jest.fn();
      stateManager.subscribe('previewer', callback);
      
      stateManager.set('previewer.zoom', 2.0);
      
      expect(callback).toHaveBeenCalled();
    });

    test('非函数回调应该抛出错误', () => {
      expect(() => stateManager.subscribe('test', null)).toThrow(TypeError);
      expect(() => stateManager.subscribe('test', 'string')).toThrow(TypeError);
    });

    test('回调抛出错误不应该影响其他订阅者', () => {
      const callback1 = jest.fn(() => { throw new Error('Test error'); });
      const callback2 = jest.fn();
      
      stateManager.subscribe('previewer.zoom', callback1);
      stateManager.subscribe('previewer.zoom', callback2);
      
      expect(() => stateManager.set('previewer.zoom', 2.0)).not.toThrow();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('unsubscribe', () => {
    test('应该通过ID取消订阅', () => {
      const callback = jest.fn();
      const id = stateManager.subscribe('previewer.zoom', callback);
      
      stateManager.unsubscribe('previewer.zoom', id);
      stateManager.set('previewer.zoom', 2.0);
      
      expect(callback).not.toHaveBeenCalled();
    });

    test('应该通过回调函数取消订阅', () => {
      const callback = jest.fn();
      stateManager.subscribe('previewer.zoom', callback);
      
      stateManager.unsubscribe('previewer.zoom', callback);
      stateManager.set('previewer.zoom', 2.0);
      
      expect(callback).not.toHaveBeenCalled();
    });

    test('取消不存在的订阅不应该报错', () => {
      const callback = jest.fn();
      expect(() => stateManager.unsubscribe('test', callback)).not.toThrow();
    });
  });

  describe('clearSubscribers', () => {
    test('应该清除所有订阅', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      stateManager.subscribe('previewer.zoom', callback1);
      stateManager.subscribe('ui.isFullscreen', callback2);
      
      stateManager.clearSubscribers();
      stateManager.set('previewer.zoom', 2.0);
      
      expect(callback1).not.toHaveBeenCalled();
    });
  });

  describe('persist', () => {
    test('应该持久化状态到LocalStorage', () => {
      stateManager.set('preferences.defaultZoom', 1.5);
      stateManager.set('ui.toolbarVisible', false);
      
      stateManager.persist();
      
      const stored = localStorage.getItem('previewer_state');
      expect(stored).toBeDefined();
      
      const data = JSON.parse(stored);
      expect(data['preferences.defaultZoom']).toBe(1.5);
      expect(data['ui.toolbarVisible']).toBe(false);
    });

    test('应该只持久化指定的键', () => {
      stateManager.set('previewer.zoom', 2.0);
      stateManager.set('preferences.defaultZoom', 1.5);
      
      stateManager.persist();
      
      const stored = localStorage.getItem('previewer_state');
      const data = JSON.parse(stored);
      
      expect(data['previewer.zoom']).toBeUndefined();
      expect(data['preferences.defaultZoom']).toBe(1.5);
    });

    test('LocalStorage错误不应该抛出异常', () => {
      // Mock localStorage.setItem to throw
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => { throw new Error('Storage error'); });
      
      expect(() => stateManager.persist()).not.toThrow();
      
      localStorage.setItem = originalSetItem;
    });
  });

  describe('restore', () => {
    test('应该从LocalStorage恢复状态', () => {
      const data = {
        'preferences.defaultZoom': 1.5,
        'ui.toolbarVisible': false
      };
      localStorage.setItem('previewer_state', JSON.stringify(data));
      
      const restored = stateManager.restore();
      
      expect(restored).toBe(true);
      expect(stateManager.get('preferences.defaultZoom')).toBe(1.5);
      expect(stateManager.get('ui.toolbarVisible')).toBe(false);
    });

    test('LocalStorage没有数据应该返回false', () => {
      const restored = stateManager.restore();
      expect(restored).toBe(false);
    });

    test('LocalStorage数据损坏应该返回false', () => {
      localStorage.setItem('previewer_state', 'invalid json');
      
      const restored = stateManager.restore();
      expect(restored).toBe(false);
    });
  });

  describe('clearPersisted', () => {
    test('应该清除持久化状态', () => {
      stateManager.persist();
      expect(localStorage.getItem('previewer_state')).toBeDefined();
      
      stateManager.clearPersisted();
      expect(localStorage.getItem('previewer_state')).toBeNull();
    });
  });

  describe('getSnapshot', () => {
    test('应该返回状态快照', () => {
      stateManager.set('previewer.zoom', 1.5);
      stateManager.set('ui.isFullscreen', true);
      
      const snapshot = stateManager.getSnapshot();
      
      expect(snapshot).toBeDefined();
      expect(snapshot.previewer.zoom).toBe(1.5);
      expect(snapshot.ui.isFullscreen).toBe(true);
    });

    test('快照应该是状态的深拷贝', () => {
      const snapshot = stateManager.getSnapshot();
      
      snapshot.previewer.zoom = 2.0;
      
      expect(stateManager.get('previewer.zoom')).toBe(1.0);
    });
  });

  describe('restoreSnapshot', () => {
    test('应该恢复状态快照', () => {
      const snapshot = {
        previewer: {
          zoom: 1.5,
          currentPage: 10,
          totalPages: 20,
          isLoaded: true,
          isLoading: false
        },
        ui: {
          isFullscreen: true,
          toolbarVisible: false,
          sidebarVisible: true
        }
      };
      
      stateManager.restoreSnapshot(snapshot);
      
      expect(stateManager.get('previewer.zoom')).toBe(1.5);
      expect(stateManager.get('previewer.currentPage')).toBe(10);
      expect(stateManager.get('ui.isFullscreen')).toBe(true);
    });

    test('无效快照应该抛出错误', () => {
      expect(() => stateManager.restoreSnapshot(null)).toThrow('Invalid snapshot');
      expect(() => stateManager.restoreSnapshot('string')).toThrow('Invalid snapshot');
    });

    test('应该合并快照和默认状态', () => {
      const snapshot = {
        previewer: {
          zoom: 1.5
        }
      };
      
      stateManager.restoreSnapshot(snapshot);
      
      expect(stateManager.get('previewer.zoom')).toBe(1.5);
      expect(stateManager.get('previewer.currentPage')).toBe(1); // 默认值
    });
  });

  describe('getHistory', () => {
    test('应该返回变更历史', () => {
      stateManager.set('previewer.zoom', 1.5);
      stateManager.set('previewer.zoom', 2.0);
      stateManager.set('ui.isFullscreen', true);
      
      const history = stateManager.getHistory();
      
      expect(history).toBeDefined();
      expect(history.length).toBeGreaterThanOrEqual(3);
    });

    test('应该限制返回的历史记录数', () => {
      for (let i = 0; i < 20; i++) {
        stateManager.set('previewer.zoom', i);
      }
      
      const history = stateManager.getHistory(5);
      
      expect(history.length).toBe(5);
    });
  });

  describe('clearHistory', () => {
    test('应该清除历史记录', () => {
      stateManager.set('previewer.zoom', 1.5);
      stateManager.set('previewer.zoom', 2.0);
      
      expect(stateManager.getHistory().length).toBeGreaterThan(0);
      
      stateManager.clearHistory();
      
      expect(stateManager.getHistory().length).toBe(0);
    });
  });

  describe('DEFAULT_STATE', () => {
    test('应该包含所有默认状态', () => {
      expect(DEFAULT_STATE).toHaveProperty('currentFile');
      expect(DEFAULT_STATE).toHaveProperty('previewer');
      expect(DEFAULT_STATE).toHaveProperty('ui');
      expect(DEFAULT_STATE).toHaveProperty('preferences');
    });

    test('应该包含正确的默认值', () => {
      expect(DEFAULT_STATE.previewer.zoom).toBe(1.0);
      expect(DEFAULT_STATE.ui.isFullscreen).toBe(false);
      expect(DEFAULT_STATE.preferences.theme).toBe('light');
    });
  });

  describe('PERSISTENT_KEYS', () => {
    test('应该包含需要持久化的键', () => {
      expect(PERSISTENT_KEYS).toContain('preferences');
      expect(PERSISTENT_KEYS).toContain('ui.toolbarVisible');
      expect(PERSISTENT_KEYS).toContain('ui.sidebarVisible');
    });
  });
});
