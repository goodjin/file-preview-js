/**
 * DocxRenderer单元测试
 */
import DocxRenderer from '../DocxRenderer.js';

describe('DocxRenderer', () => {
  let renderer;
  let mockContainer;

  beforeEach(() => {
    renderer = new DocxRenderer();
    mockContainer = document.createElement('div');
    document.body.appendChild(mockContainer);
  });

  afterEach(() => {
    if (mockContainer.parentNode) {
      document.body.removeChild(mockContainer);
    }
  });

  describe('构造函数', () => {
    test('应该创建renderer实例', () => {
      expect(renderer).toBeInstanceOf(DocxRenderer);
      expect(renderer.container).toBeNull();
      expect(renderer.renderedHTML).toBe('');
      expect(renderer.zoomLevel).toBe(1.0);
    });
  });

  describe('render', () => {
    test('应该成功渲染HTML到容器', () => {
      const html = '<p>Test content</p>';
      renderer.render(html, mockContainer);

      expect(renderer.container).toBe(mockContainer);
      expect(renderer.renderedHTML).toBe(html);
      expect(mockContainer.innerHTML).toContain('docx-preview-container');
      expect(mockContainer.innerHTML).toContain('Test content');
    });

    test('应该处理自定义缩放', () => {
      const html = '<p>Test</p>';
      renderer.render(html, mockContainer, { zoom: 1.5 });

      expect(renderer.zoomLevel).toBe(1.5);
    });

    test('应该处理自定义宽度', () => {
      const html = '<p>Test</p>';
      renderer.render(html, mockContainer, { width: '800px' });

      const container = mockContainer.querySelector('.docx-preview-container');
      expect(container.style.width).toBe('800px');
    });

    test('应该处理自定义最大高度', () => {
      const html = '<p>Test</p>';
      renderer.render(html, mockContainer, { maxHeight: '600px' });

      const container = mockContainer.querySelector('.docx-preview-container');
      expect(container.style.maxHeight).toBe('600px');
    });

    test('应该处理showLineNumbers选项', () => {
      const html = '<p>Line 1\nLine 2\nLine 3</p>';
      renderer.render(html, mockContainer, { showLineNumbers: true });

      const lineNumbers = mockContainer.querySelector('.line-numbers');
      expect(lineNumbers).toBeDefined();
    });

    test('应该抛出错误如果没有提供容器', () => {
      expect(() => {
        renderer.render('<p>Test</p>', null);
      }).toThrow('Container is required');
    });

    test('应该清空容器后再渲染', () => {
      mockContainer.innerHTML = '<div>Old content</div>';
      const html = '<p>New content</p>';
      renderer.render(html, mockContainer);

      expect(mockContainer.innerHTML).not.toContain('Old content');
      expect(mockContainer.innerHTML).toContain('New content');
    });
  });

  describe('setZoom', () => {
    test('应该设置有效的缩放级别', () => {
      renderer.setZoom(1.5);
      expect(renderer.zoomLevel).toBe(1.5);
    });

    test('应该设置最小缩放级别', () => {
      renderer.setZoom(0.5);
      expect(renderer.zoomLevel).toBe(0.5);
    });

    test('应该设置最大缩放级别', () => {
      renderer.setZoom(3.0);
      expect(renderer.zoomLevel).toBe(3.0);
    });

    test('应该拒绝小于0.5的缩放级别', () => {
      expect(() => {
        renderer.setZoom(0.4);
      }).toThrow('Zoom level must be between 0.5 and 3.0');
    });

    test('应该拒绝大于3.0的缩放级别', () => {
      expect(() => {
        renderer.setZoom(3.1);
      }).toThrow('Zoom level must be between 0.5 and 3.0');
    });

    test('应该应用到已渲染的内容', () => {
      const html = '<p>Test</p>';
      renderer.render(html, mockContainer);
      renderer.setZoom(1.5);

      const wrapper = mockContainer.querySelector('.docx-wrapper');
      expect(wrapper.style.transform).toBe('scale(1.5)');
    });
  });

  describe('getZoom', () => {
    test('应该返回当前缩放级别', () => {
      renderer.zoomLevel = 1.5;
      expect(renderer.getZoom()).toBe(1.5);
    });

    test('应该返回默认缩放级别', () => {
      expect(renderer.getZoom()).toBe(1.0);
    });
  });

  describe('update', () => {
    test('应该更新渲染内容', () => {
      const html1 = '<p>Content 1</p>';
      const html2 = '<p>Content 2</p>';

      renderer.render(html1, mockContainer);
      expect(mockContainer.innerHTML).toContain('Content 1');

      renderer.update(html2);
      expect(mockContainer.innerHTML).not.toContain('Content 1');
      expect(mockContainer.innerHTML).toContain('Content 2');
    });

    test('如果没有渲染内容应该抛出错误', () => {
      expect(() => {
        renderer.update('<p>Test</p>');
      }).toThrow('No rendered content found');
    });

    test('应该保持容器宽度', () => {
      renderer.render('<p>Content 1</p>', mockContainer, { width: '800px' });
      renderer.update('<p>Content 2</p>');

      const container = mockContainer.querySelector('.docx-preview-container');
      expect(container.style.width).toBe('800px');
    });

    test('应该保持缩放级别', () => {
      renderer.render('<p>Content 1</p>', mockContainer, { zoom: 1.5 });
      renderer.update('<p>Content 2</p>');

      const wrapper = mockContainer.querySelector('.docx-wrapper');
      expect(wrapper.style.transform).toBe('scale(1.5)');
    });
  });

  describe('clear', () => {
    test('应该清空渲染内容', () => {
      const html = '<p>Test</p>';
      renderer.render(html, mockContainer);
      expect(mockContainer.innerHTML).not.toBe('');

      renderer.clear();
      expect(mockContainer.innerHTML).toBe('');
      expect(renderer.renderedHTML).toBe('');
    });

    test('应该在没有容器时安全执行', () => {
      expect(() => {
        renderer.clear();
      }).not.toThrow();
    });
  });

  describe('getRenderedHTML', () => {
    test('应该返回渲染的HTML', () => {
      const html = '<p>Test</p>';
      renderer.render(html, mockContainer);

      expect(renderer.getRenderedHTML()).toBe(html);
    });

    test('如果没有渲染应该返回空字符串', () => {
      expect(renderer.getRenderedHTML()).toBe('');
    });
  });

  describe('图片处理', () => {
    test('应该为图片设置响应式样式', () => {
      const html = '<img src="test.jpg" />';
      renderer.render(html, mockContainer);

      const img = mockContainer.querySelector('img');
      expect(img.style.maxWidth).toBe('100%');
      expect(img.style.height).toBe('auto');
      expect(img.style.display).toBe('block');
    });
  });

  describe('表格处理', () => {
    test('应该为表格设置样式', () => {
      const html = `
        <table>
          <tr><td>Cell 1</td><td>Cell 2</td></tr>
          <tr><td>Cell 3</td><td>Cell 4</td></tr>
        </table>
      `;
      renderer.render(html, mockContainer);

      const table = mockContainer.querySelector('table');
      expect(table.style.borderCollapse).toBe('collapse');

      const cells = mockContainer.querySelectorAll('td, th');
      cells.forEach(cell => {
        expect(cell.style.border).toBe('1px solid #ddd');
        expect(cell.style.padding).toBe('8px');
      });
    });
  });

  describe('段落处理', () => {
    test('应该为段落设置样式', () => {
      const html = '<p>Test paragraph</p>';
      renderer.render(html, mockContainer);

      const p = mockContainer.querySelector('p');
      expect(p.style.margin).toBe('8px 0');
      expect(p.style.lineHeight).toBe('1.6');
    });
  });
});
