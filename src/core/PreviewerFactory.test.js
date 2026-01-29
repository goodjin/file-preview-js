/**
 * PreviewerFactory 单元测试
 */

import { PreviewerFactory, PreviewerError } from './PreviewerFactory.js';

// Mock预览器类
class MockPreviewer {
  constructor(file, container) {
    this.file = file;
    this.container = container;
    this.destroyed = false;
  }

  destroy() {
    this.destroyed = true;
  }
}

class AnotherMockPreviewer {
  constructor(file, container) {
    this.file = file;
    this.container = container;
  }
}

describe('PreviewerFactory', () => {
  let factory;
  const mockFile = { name: 'test.xlsx', size: 1024 };
  const mockContainer = document.createElement('div');

  beforeEach(() => {
    factory = new PreviewerFactory();
  });

  afterEach(() => {
    factory.clear();
  });

  describe('register', () => {
    test('应该成功注册预览器类型', () => {
      factory.register('xlsx', MockPreviewer);
      expect(factory.isSupported('xlsx')).toBe(true);
    });

    test('应该忽略大小写', () => {
      factory.register('XLSX', MockPreviewer);
      expect(factory.isSupported('xlsx')).toBe(true);
      expect(factory.isSupported('XLSX')).toBe(true);
    });

    test('注册无效类型应该抛出错误', () => {
      expect(() => factory.register('', MockPreviewer)).toThrow(PreviewerError);
      expect(() => factory.register(null, MockPreviewer)).toThrow(PreviewerError);
    });

    test('注册无效类应该抛出错误', () => {
      expect(() => factory.register('xlsx', null)).toThrow(PreviewerError);
      expect(() => factory.register('xlsx', {})).toThrow(PreviewerError);
    });
  });

  describe('unregister', () => {
    test('应该成功注销预览器类型', () => {
      factory.register('xlsx', MockPreviewer);
      expect(factory.unregister('xlsx')).toBe(true);
      expect(factory.isSupported('xlsx')).toBe(false);
    });

    test('注销不存在的类型应该返回false', () => {
      expect(factory.unregister('nonexistent')).toBe(false);
    });
  });

  describe('create', () => {
    beforeEach(() => {
      factory.register('xlsx', MockPreviewer);
      factory.register('pdf', AnotherMockPreviewer);
    });

    test('应该创建预览器实例', () => {
      const previewer = factory.create('xlsx', mockFile, mockContainer);
      expect(previewer).toBeInstanceOf(MockPreviewer);
      expect(previewer.file).toBe(mockFile);
      expect(previewer.container).toBe(mockContainer);
    });

    test('应该忽略大小写', () => {
      const previewer = factory.create('XLSX', mockFile, mockContainer);
      expect(previewer).toBeInstanceOf(MockPreviewer);
    });

    test('创建不支持的类型应该抛出错误', () => {
      expect(() => factory.create('docx', mockFile, mockContainer)).toThrow(PreviewerError);
      
      try {
        factory.create('docx', mockFile, mockContainer);
      } catch (error) {
        expect(error.code).toBe('UNSUPPORTED_FILE_TYPE');
        expect(error.details.supportedTypes).toContain('xlsx');
        expect(error.details.supportedTypes).toContain('pdf');
      }
    });

    test('预览器类构造函数失败应该抛出错误', () => {
      class FailPreviewer {
        constructor() {
          throw new Error('Construction failed');
        }
      }
      
      factory.register('fail', FailPreviewer);
      
      expect(() => factory.create('fail', mockFile, mockContainer)).toThrow(PreviewerError);
    });
  });

  describe('destroy', () => {
    test('应该调用预览器的destroy方法', () => {
      factory.register('xlsx', MockPreviewer);
      const previewer = factory.create('xlsx', mockFile, mockContainer);
      
      factory.destroy(previewer);
      
      expect(previewer.destroyed).toBe(true);
    });

    test('应该处理没有destroy方法的预览器', () => {
      factory.register('pdf', AnotherMockPreviewer);
      const previewer = factory.create('pdf', mockFile, mockContainer);
      
      expect(() => factory.destroy(previewer)).not.toThrow();
    });

    test('应该处理null预览器', () => {
      expect(() => factory.destroy(null)).not.toThrow();
    });
  });

  describe('getSupportedTypes', () => {
    test('应该返回所有支持的文件类型', () => {
      factory.register('xlsx', MockPreviewer);
      factory.register('pdf', AnotherMockPreviewer);
      factory.register('jpg', MockPreviewer);

      const types = factory.getSupportedTypes();
      
      expect(types).toContain('xlsx');
      expect(types).toContain('pdf');
      expect(types).toContain('jpg');
      expect(types.length).toBe(3);
    });

    test('空工厂应该返回空数组', () => {
      const types = factory.getSupportedTypes();
      expect(types).toEqual([]);
    });
  });

  describe('isSupported', () => {
    test('应该检查文件类型是否支持', () => {
      factory.register('xlsx', MockPreviewer);
      
      expect(factory.isSupported('xlsx')).toBe(true);
      expect(factory.isSupported('pdf')).toBe(false);
    });

    test('应该忽略大小写', () => {
      factory.register('xlsx', MockPreviewer);
      
      expect(factory.isSupported('XLSX')).toBe(true);
      expect(factory.isSupported('Xlsx')).toBe(true);
    });
  });

  describe('clear', () => {
    test('应该清除所有注册的预览器', () => {
      factory.register('xlsx', MockPreviewer);
      factory.register('pdf', AnotherMockPreviewer);
      
      factory.clear();
      
      expect(factory.getSupportedTypes()).toEqual([]);
      expect(factory.isSupported('xlsx')).toBe(false);
    });
  });
});
