/**
 * PPTX子模块完整单元测试
 */

import PptxParser from './PptxParser.js';
import PptxRenderer from './PptxRenderer.js';
import { PptxModule } from './index.js';

describe('PptxParser', () => {
  let parser;

  beforeEach(() => {
    parser = new PptxParser();
  });

  afterEach(() => {
    parser.destroy();
  });

  describe('初始化', () => {
    test('应该正确初始化', () => {
      expect(parser.slides).toEqual([]);
      expect(parser.slideMasters).toEqual({});
      expect(parser.media).toEqual({});
    });
  });

  describe('parse方法', () => {
    test('空文件应该返回空结果', async () => {
      const mockZip = {
        file: jest.fn().mockReturnValue(null)
      };
      
      jest.spyOn(parser, '_loadJSZip').mockResolvedValue(mockZip);
      
      const result = await parser.parse(new ArrayBuffer(0));
      expect(result.totalSlides).toBe(0);
      expect(result.slides).toEqual([]);
    });

    test('应该设置选项参数', async () => {
      const onProgress = jest.fn();
      const mockZip = {
        file: jest.fn().mockReturnValue({
          async: jest.fn().mockResolvedValue('<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"></p:presentation>')
        })
      };
      
      jest.spyOn(parser, '_loadJSZip').mockResolvedValue(mockZip);
      
      await parser.parse(new ArrayBuffer(0), { maxSlides: 5, onProgress });
      expect(parser.slides.length).toBe(0);
    });

    test('解析失败应该抛出错误', async () => {
      jest.spyOn(parser, '_loadJSZip').mockRejectedValue(new Error('Zip error'));
      
      await expect(parser.parse(new ArrayBuffer(0))).rejects.toThrow('PPTX解析失败');
    });
  });

  describe('_parseDocProps', () => {
    test('应该解析文档属性', async () => {
      const mockZip = {
        file: jest.fn().mockReturnValue({
          async: jest.fn().mockResolvedValue('<Properties><Title>测试文档</Title><Manager>张三</Manager></Properties>')
        })
      };

      const props = await parser._parseDocProps(mockZip);
      expect(props.title).toBe('测试文档');
    });

    test('缺少属性文件应该返回空对象', async () => {
      const mockZip = {
        file: jest.fn().mockReturnValue(null)
      };

      const props = await parser._parseDocProps(mockZip);
      expect(props).toEqual({});
    });
  });

  describe('_parseCoord', () => {
    test('应该正确解析坐标', () => {
      const parent = {
        querySelector: jest.fn().mockReturnValue({
          getAttribute: jest.fn((attr) => attr === 'x' ? '952500' : '6858000')
        })
      };

      const x = parser._parseCoord(parent, 'a:off', 'x', 0);
      const y = parser._parseCoord(parent, 'a:off', 'y', 0);
      
      expect(x).toBe(100);
      expect(y).toBe(720);
    });

    test('缺少元素应该返回默认值', () => {
      const parent = {
        querySelector: jest.fn().mockReturnValue(null)
      };

      const x = parser._parseCoord(parent, 'a:off', 'x', 100);
      expect(x).toBe(100);
    });
  });

  describe('资源清理', () => {
    test('destroy应该清理资源', () => {
      parser.slides = [{}, {}];
      parser.media = { 'image1': 'blob:url' };
      URL.revokeObjectURL = jest.fn();

      parser.destroy();

      expect(parser.slides).toEqual([]);
      expect(parser.media).toEqual({});
    });
  });
});

describe('PptxRenderer', () => {
  let renderer;
  let container;

  beforeEach(() => {
    renderer = new PptxRenderer();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    renderer.destroy();
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('初始化', () => {
    test('应该正确初始化', () => {
      expect(renderer.currentSlideIndex).toBe(0);
      expect(renderer.zoomLevel).toBe(1);
    });
  });

  describe('init方法', () => {
    test('应该初始化渲染器', () => {
      const slidesData = {
        slides: [{}, {}, {}]
      };

      renderer.init(slidesData, {
        initialSlide: 2,
        zoom: 1.5,
        onPageChange: jest.fn(),
        onZoomChange: jest.fn()
      });

      expect(renderer.currentSlideIndex).toBe(1);
      expect(renderer.zoomLevel).toBe(1.5);
      expect(renderer.slidesData.length).toBe(3);
    });

    test('使用默认参数', () => {
      const slidesData = {
        slides: [{}, {}, {}]
      };

      renderer.init(slidesData, {});
      
      expect(renderer.currentSlideIndex).toBe(0);
      expect(renderer.zoomLevel).toBe(1);
    });
  });

  describe('render方法', () => {
    test('应该渲染到容器', () => {
      const slidesData = {
        slides: [
          {
            index: 1,
            elements: [
              {
                type: 'textbox',
                x: 0,
                y: 0,
                width: 9144000,
                height: 6858000,
                textRuns: [{ text: 'Hello', fontSize: 18, bold: false, italic: false, color: '000000' }]
              }
            ]
          }
        ]
      };

      renderer.init(slidesData);
      renderer.render(container);

      expect(container.querySelector('.pptx-preview-container')).toBeTruthy();
      expect(container.querySelector('.pptx-slide')).toBeTruthy();
    });

    test('空容器应该抛出错误', () => {
      const slidesData = { slides: [] };
      renderer.init(slidesData);

      expect(() => renderer.render(null)).toThrow('渲染容器不能为空');
    });

    test('应该创建导航控制', () => {
      const slidesData = {
        slides: [
          {
            index: 1,
            elements: []
          }
        ]
      };

      renderer.init(slidesData);
      renderer.render(container);

      expect(container.querySelector('.pptx-navigation')).toBeTruthy();
      expect(container.querySelector('.pptx-zoom-control')).toBeTruthy();
      expect(container.querySelector('.pptx-page-info')).toBeTruthy();
    });
  });

  describe('幻灯片控制', () => {
    beforeEach(() => {
      renderer.slidesData = [
        { index: 1, elements: [] },
        { index: 2, elements: [] },
        { index: 3, elements: [] }
      ];
      renderer.currentSlideIndex = 0;
      renderer.slidesElements = [
        document.createElement('div'),
        document.createElement('div'),
        document.createElement('div')
      ];
      renderer._showSlide = jest.fn();
    });

    test('goToPage应该跳转到指定页面', () => {
      renderer.goToPage(2);
      expect(renderer.currentSlideIndex).toBe(1);
      expect(renderer._showSlide).toHaveBeenCalledWith(1);
    });

    test('goToPage超出范围应该忽略', () => {
      renderer.goToPage(5);
      expect(renderer.currentSlideIndex).toBe(0);
    });

    test('nextPage应该跳转到下一页', () => {
      renderer.nextPage();
      expect(renderer.currentSlideIndex).toBe(1);
    });

    test('nextPage到达末尾应该不跳转', () => {
      renderer.currentSlideIndex = 2;
      renderer.nextPage();
      expect(renderer.currentSlideIndex).toBe(2);
    });

    test('prevPage应该跳转到上一页', () => {
      renderer.currentSlideIndex = 1;
      renderer.prevPage();
      expect(renderer.currentSlideIndex).toBe(0);
    });

    test('prevPage到达开头应该不跳转', () => {
      renderer.prevPage();
      expect(renderer.currentSlideIndex).toBe(0);
    });
  });

  describe('缩放控制', () => {
    beforeEach(() => {
      renderer.slidesWrapper = document.createElement('div');
      renderer.zoomLabel = document.createElement('span');
      renderer.zoomLevel = 1;
    });

    test('setZoom应该设置缩放级别', () => {
      renderer.setZoom(1.5);
      expect(renderer.zoomLevel).toBe(1.5);
    });

    test('setZoom应该限制在合理范围内', () => {
      renderer.setZoom(5);
      expect(renderer.zoomLevel).toBe(3);

      renderer.setZoom(0.05);
      expect(renderer.zoomLevel).toBe(0.1);
    });

    test('getZoom应该返回当前缩放级别', () => {
      renderer.zoomLevel = 1.5;
      expect(renderer.getZoom()).toBe(1.5);
    });

    test('getCurrentPage应该返回当前页码', () => {
      renderer.currentSlideIndex = 2;
      expect(renderer.getCurrentPage()).toBe(3);
    });

    test('getTotalPages应该返回总页数', () => {
      renderer.slidesElements = [1, 2, 3, 4];
      expect(renderer.getTotalPages()).toBe(4);
    });
  });

  describe('销毁', () => {
    test('destroy应该清理所有资源', () => {
      renderer.container = container;
      renderer.slidesElements = [document.createElement('div')];

      renderer.destroy();

      expect(renderer.container).toBeNull();
      expect(renderer.slidesElements).toEqual([]);
    });
  });
});

describe('PptxModule', () => {
  let pptx;

  beforeEach(() => {
    pptx = new PptxModule();
  });

  afterEach(() => {
    pptx.destroy();
  });

  describe('静态方法', () => {
    test('getSupportedTypes应该返回支持的文件类型', () => {
      const types = PptxModule.getSupportedTypes();
      expect(types).toContain('pptx');
      expect(types.length).toBeGreaterThan(0);
    });

    test('isSupported应该正确检测文件类型', () => {
      expect(PptxModule.isSupported('pptx')).toBe(true);
      expect(PptxModule.isSupported('PPTX')).toBe(true);
      expect(PptxModule.isSupported('docx')).toBe(false);
      expect(PptxModule.isSupported('pdf')).toBe(false);
      expect(PptxModule.isSupported('')).toBe(false);
    });
  });

  describe('parse方法', () => {
    test('应该解析PPTX文件', async () => {
      const mockFile = new File([new ArrayBuffer(100)], 'test.pptx');
      
      jest.spyOn(pptx.parser, 'parse').mockResolvedValue({
        slides: [{}, {}],
        totalSlides: 2,
        docProps: { title: 'Test' }
      });

      const result = await pptx.parse(mockFile);
      expect(result.totalSlides).toBe(2);
      expect(pptx.isLoaded).toBe(true);
    });

    test('解析失败应该触发error事件', async () => {
      const errorCallback = jest.fn();
      pptx.on('error', errorCallback);

      jest.spyOn(pptx.parser, 'parse').mockRejectedValue(new Error('Parse error'));

      await expect(pptx.parse(new File([], 'test.pptx'))).rejects.toThrow();
      expect(errorCallback).toHaveBeenCalled();
    });

    test('解析成功应该触发load事件', async () => {
      const loadCallback = jest.fn();
      pptx.on('load', loadCallback);

      jest.spyOn(pptx.parser, 'parse').mockResolvedValue({
        slides: [{}, {}],
        totalSlides: 2
      });

      await pptx.parse(new File([], 'test.pptx'));
      expect(loadCallback).toHaveBeenCalled();
    });
  });

  describe('render方法', () => {
    test('应该渲染到容器', () => {
      const container = document.createElement('div');
      pptx.fileInfo = {
        slides: [{ index: 1, elements: [] }],
        totalSlides: 1
      };
      pptx.isLoaded = true;
      pptx.renderer.init = jest.fn();
      pptx.renderer.render = jest.fn();

      pptx.render(container);

      expect(pptx.renderer.init).toHaveBeenCalled();
      expect(pptx.renderer.render).toHaveBeenCalledWith(container);
    });

    test('未加载应该抛出错误', () => {
      const container = document.createElement('div');
      pptx.isLoaded = false;

      expect(() => pptx.render(container)).toThrow('请先解析PPTX文件');
    });
  });

  describe('幻灯片控制', () => {
    beforeEach(() => {
      pptx.fileInfo = {
        slides: [{}, {}, {}],
        totalSlides: 3
      };
      pptx.isLoaded = true;
      pptx.renderer.goToPage = jest.fn();
      pptx.renderer.nextPage = jest.fn();
      pptx.renderer.prevPage = jest.fn();
      pptx.renderer.currentSlideIndex = 0;
      pptx.renderer.slidesElements = [1, 2, 3];
    });

    test('goToPage应该触发页面变化事件', () => {
      const pageChangeCallback = jest.fn();
      pptx.on('pageChange', pageChangeCallback);

      pptx.goToPage(2);
      expect(pptx.renderer.goToPage).toHaveBeenCalledWith(2);
      expect(pageChangeCallback).toHaveBeenCalled();
    });

    test('nextPage应该调用渲染器的nextPage', () => {
      pptx.nextPage();
      expect(pptx.renderer.nextPage).toHaveBeenCalled();
    });

    test('prevPage应该调用渲染器的prevPage', () => {
      pptx.prevPage();
      expect(pptx.renderer.prevPage).toHaveBeenCalled();
    });
  });

  describe('缩放控制', () => {
    test('setZoom应该调用渲染器的setZoom', () => {
      pptx.renderer.setZoom = jest.fn();
      pptx.setZoom(1.5);
      expect(pptx.renderer.setZoom).toHaveBeenCalledWith(1.5);
    });

    test('getZoom应该返回渲染器的缩放级别', () => {
      pptx.renderer.zoomLevel = 1.5;
      expect(pptx.getZoom()).toBe(1.5);
    });

    test('缩放变化应该触发zoomChange事件', () => {
      const zoomChangeCallback = jest.fn();
      pptx.on('zoomChange', zoomChangeCallback);

      pptx.renderer.zoomLevel = 1.5;
      pptx._trigger('zoomChange', { zoomLevel: 1.5 });

      expect(zoomChangeCallback).toHaveBeenCalledWith({ zoomLevel: 1.5 });
    });
  });

  describe('getFileInfo', () => {
    test('未加载应该返回null', () => {
      expect(pptx.getFileInfo()).toBeNull();
    });

    test('已加载应该返回文件信息', () => {
      pptx.fileInfo = {
        slides: [],
        totalSlides: 5,
        docProps: {
          title: '演示文稿',
          author: '张三',
          created: '2024-01-01'
        }
      };
      pptx.isLoaded = true;

      const info = pptx.getFileInfo();

      expect(info.fileName).toBe('演示文稿');
      expect(info.fileType).toBe('pptx');
      expect(info.pageCount).toBe(5);
      expect(info.author).toBe('张三');
      expect(info.createdDate).toBe('2024-01-01');
    });
  });

  describe('事件系统', () => {
    test('on应该注册事件监听器', () => {
      const callback = jest.fn();
      pptx.on('test', callback);
      pptx._trigger('test', { data: 'test' });
      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });

    test('off应该移除事件监听器', () => {
      const callback = jest.fn();
      pptx.on('test', callback);
      pptx.off('test', callback);
      pptx._trigger('test', { data: 'test' });
      expect(callback).not.toHaveBeenCalled();
    });

    test('应该支持多个监听器', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      pptx.on('test', callback1);
      pptx.on('test', callback2);
      pptx._trigger('test', { data: 'test' });
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    test('监听器抛出错误不应该影响其他监听器', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Test error');
      });
      const normalCallback = jest.fn();
      pptx.on('test', errorCallback);
      pptx.on('test', normalCallback);
      
      pptx._trigger('test', { data: 'test' });
      
      expect(errorCallback).toHaveBeenCalled();
      expect(normalCallback).toHaveBeenCalled();
    });
  });

  describe('destroy方法', () => {
    test('应该清理所有资源', () => {
      pptx.renderer.destroy = jest.fn();
      pptx.parser.destroy = jest.fn();

      pptx.destroy();

      expect(pptx.renderer.destroy).toHaveBeenCalled();
      expect(pptx.parser.destroy).toHaveBeenCalled();
      expect(pptx.isLoaded).toBe(false);
      expect(pptx.fileInfo).toBeNull();
      expect(pptx.eventCallbacks).toEqual({});
    });
  });

  describe('错误处理', () => {
    test('未加载时调用goToPage应该抛出错误', () => {
      expect(() => pptx.goToPage(1)).toThrow('请先加载PPTX文件');
    });

    test('未加载时调用nextPage应该抛出错误', () => {
      expect(() => pptx.nextPage()).toThrow('请先加载PPTX文件');
    });

    test('未加载时调用prevPage应该抛出错误', () => {
      expect(() => pptx.prevPage()).toThrow('请先加载PPTX文件');
    });
  });

  describe('边界测试', () => {
    test('空幻灯片列表应该正常处理', () => {
      pptx.fileInfo = { slides: [], totalSlides: 0 };
      pptx.isLoaded = true;
      pptx.renderer.currentSlideIndex = 0;
      pptx.renderer.slidesElements = [];

      expect(() => pptx.nextPage()).not.toThrow();
      expect(() => pptx.prevPage()).not.toThrow();
    });

    test('单张幻灯片应该正常处理', () => {
      pptx.fileInfo = { slides: [{}], totalSlides: 1 };
      pptx.isLoaded = true;
      pptx.renderer.currentSlideIndex = 0;
      pptx.renderer.slidesElements = [document.createElement('div')];

      pptx.goToPage(1);
      expect(pptx.renderer.currentSlideIndex).toBe(0);
    });

    test('跳转到第0页应该不执行', () => {
      pptx.fileInfo = { slides: [{}], totalSlides: 1 };
      pptx.isLoaded = true;
      pptx.renderer.currentSlideIndex = 0;
      pptx.renderer._showSlide = jest.fn();

      pptx.goToPage(0);
      expect(pptx.renderer._showSlide).not.toHaveBeenCalled();
    });
  });
});

// 运行测试的辅助函数
export function runTests() {
  console.log('PPTX子模块测试开始...');
  
  if (typeof describe !== 'undefined') {
    // Jest会自动运行测试
    return;
  }

  // 简单的测试运行器（非Jest环境）
  console.log('注意：请使用Jest运行完整测试套件');
}

// 自动运行测试
runTests();
