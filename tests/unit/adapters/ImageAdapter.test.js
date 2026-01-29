/**
 * ImageAdapter 单元测试
 */

import ImageAdapter from '../../../src/adapters/ImageAdapter.js';

describe('ImageAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new ImageAdapter();
  });

  describe('canHandle', () => {
    test('should support jpg files', () => {
      expect(adapter.canHandle('jpg')).toBe(true);
      expect(adapter.canHandle('JPG')).toBe(true);
    });

    test('should support jpeg files', () => {
      expect(adapter.canHandle('jpeg')).toBe(true);
      expect(adapter.canHandle('JPEG')).toBe(true);
    });

    test('should support png files', () => {
      expect(adapter.canHandle('png')).toBe(true);
      expect(adapter.canHandle('PNG')).toBe(true);
    });

    test('should support gif files', () => {
      expect(adapter.canHandle('gif')).toBe(true);
    });

    test('should support bmp files', () => {
      expect(adapter.canHandle('bmp')).toBe(true);
    });

    test('should support svg files', () => {
      expect(adapter.canHandle('svg')).toBe(true);
    });

    test('should support tif files', () => {
      expect(adapter.canHandle('tif')).toBe(true);
    });

    test('should support tiff files', () => {
      expect(adapter.canHandle('tiff')).toBe(true);
    });

    test('should support webp files', () => {
      expect(adapter.canHandle('webp')).toBe(true);
    });

    test('should support psd files', () => {
      expect(adapter.canHandle('psd')).toBe(true);
    });

    test('should not support document files', () => {
      expect(adapter.canHandle('pdf')).toBe(false);
      expect(adapter.canHandle('txt')).toBe(false);
    });

    test('should not support office files', () => {
      expect(adapter.canHandle('docx')).toBe(false);
      expect(adapter.canHandle('xlsx')).toBe(false);
    });
  });

  describe('getSupportedTypes', () => {
    test('should return all supported types', () => {
      const types = adapter.getSupportedTypes();
      expect(types).toEqual(expect.arrayContaining([
        'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'tif', 'tiff', 'webp', 'psd'
      ]));
      expect(types.length).toBe(10);
    });
  });

  describe('validateFile', () => {
    test('should validate valid file object', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      expect(() => adapter.validateFile(file)).not.toThrow();
    });

    test('should throw error for null file', () => {
      expect(() => adapter.validateFile(null)).toThrow('File is required');
    });

    test('should throw error for invalid file object', () => {
      expect(() => adapter.validateFile({})).toThrow('Invalid file object');
    });
  });

  describe('getFileExtension', () => {
    test('should extract file extension correctly', () => {
      expect(adapter.getFileExtension('photo.jpg')).toBe('jpg');
      expect(adapter.getFileExtension('image.png')).toBe('png');
      expect(adapter.getFileExtension('animation.gif')).toBe('gif');
    });

    test('should handle uppercase extensions', () => {
      expect(adapter.getFileExtension('PHOTO.JPG')).toBe('jpg');
      expect(adapter.getFileExtension('Image.PNG')).toBe('png');
    });

    test('should handle files without extension', () => {
      expect(adapter.getFileExtension('image')).toBe('');
    });
  });

  describe('parse', () => {
    test('should parse jpg file', async () => {
      const content = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]);
      const file = new File([content], 'test.jpg', { type: 'image/jpeg' });

      const result = await adapter.parse(file);

      expect(result.fileType).toBe('jpg');
      expect(result.fileName).toBe('test.jpg');
      expect(result.dataUrl).toBeDefined();
      expect(result.dataUrl).toMatch(/^data:image\/jpeg;base64/);
      expect(result.naturalWidth).toBeGreaterThan(0);
      expect(result.naturalHeight).toBeGreaterThan(0);
    });

    test('should parse png file', async () => {
      const content = new Uint8Array([0x89, 0x50, 0x4E, 0x47]);
      const file = new File([content], 'test.png', { type: 'image/png' });

      const result = await adapter.parse(file);

      expect(result.fileType).toBe('png');
      expect(result.fileName).toBe('test.png');
      expect(result.dataUrl).toMatch(/^data:image\/png;base64/);
    });

    test('should parse gif file', async () => {
      const content = new Uint8Array([0x47, 0x49, 0x46, 0x38]);
      const file = new File([content], 'test.gif', { type: 'image/gif' });

      const result = await adapter.parse(file);

      expect(result.fileType).toBe('gif');
      expect(result.dataUrl).toMatch(/^data:image\/gif;base64/);
    });

    test('should parse webp file', async () => {
      const content = new Uint8Array([0x52, 0x49, 0x46, 0x46]);
      const file = new File([content], 'test.webp', { type: 'image/webp' });

      const result = await adapter.parse(file);

      expect(result.fileType).toBe('webp');
    });

    test('should throw error for unsupported file type', async () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });

      await expect(adapter.parse(file)).rejects.toThrow('Unsupported file type');
    });
  });

  describe('render', () => {
    const mockImageData = {
      fileType: 'jpg',
      fileName: 'test.jpg',
      fileSize: 1024,
      dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      naturalWidth: 800,
      naturalHeight: 600
    };

    test('should render image with default options', () => {
      const result = adapter.render(mockImageData);

      expect(result.tagName).toBe('DIV');
      expect(result.className).toBe('image-preview');
      expect(result.querySelector('.preview-image')).toBeDefined();
      expect(result.querySelector('.preview-image').src).toBe(mockImageData.dataUrl);
      expect(result.querySelector('.image-info')).toBeDefined();
    });

    test('should render image with zoom', () => {
      const result = adapter.render(mockImageData, { zoom: 1.5 });

      const wrapper = result.querySelector('.image-wrapper');
      expect(wrapper.style.transform).toContain('scale(1.5)');
    });

    test('should render image with rotation', () => {
      const result = adapter.render(mockImageData, { rotation: 90 });

      const wrapper = result.querySelector('.image-wrapper');
      expect(wrapper.style.transform).toContain('rotate(90deg)');
    });

    test('should render image with zoom and rotation', () => {
      const result = adapter.render(mockImageData, { zoom: 2.0, rotation: 180 });

      const wrapper = result.querySelector('.image-wrapper');
      expect(wrapper.style.transform).toContain('scale(2)');
      expect(wrapper.style.transform).toContain('rotate(180deg)');
    });

    test('should display image info', () => {
      const result = adapter.render(mockImageData);

      const info = result.querySelector('.image-info');
      expect(info.innerHTML).toContain('test.jpg');
      expect(info.innerHTML).toContain('800 x 600');
      expect(info.innerHTML).toContain('100%');
      expect(info.innerHTML).toContain('0°');
    });

    test('should display correct file size', () => {
      const result = adapter.render(mockImageData);

      const info = result.querySelector('.image-info');
      expect(info.innerHTML).toContain('1.00 KB');
    });
  });

  describe('formatFileSize', () => {
    test('should format bytes', () => {
      expect(adapter._formatFileSize(100)).toBe('100 B');
    });

    test('should format kilobytes', () => {
      expect(adapter._formatFileSize(1024)).toBe('1.00 KB');
      expect(adapter._formatFileSize(2048)).toBe('2.00 KB');
      expect(adapter._formatFileSize(1536)).toBe('1.50 KB');
    });

    test('should format megabytes', () => {
      expect(adapter._formatFileSize(1024 * 1024)).toBe('1.00 MB');
      expect(adapter._formatFileSize(2 * 1024 * 1024)).toBe('2.00 MB');
    });

    test('should format gigabytes', () => {
      expect(adapter._formatFileSize(1024 * 1024 * 1024)).toBe('1.00 GB');
    });
  });

  describe('fitToContainer', () => {
    test('should calculate scale to fit both width and height', () => {
      const data = { naturalWidth: 800, naturalHeight: 600 };
      const scale = adapter.fitToContainer(data, 400, 300);
      
      expect(scale).toBeLessThan(1.0);
      expect(scale).toBeCloseTo(0.5, 1);
    });

    test('should scale based on width when width is limiting factor', () => {
      const data = { naturalWidth: 800, naturalHeight: 400 };
      const scale = adapter.fitToContainer(data, 400, 1000);
      
      expect(scale).toBe(0.5);
    });

    test('should scale based on height when height is limiting factor', () => {
      const data = { naturalWidth: 400, naturalHeight: 800 };
      const scale = adapter.fitToContainer(data, 1000, 400);
      
      expect(scale).toBe(0.5);
    });

    test('should not scale up if image is smaller than container', () => {
      const data = { naturalWidth: 400, naturalHeight: 300 };
      const scale = adapter.fitToContainer(data, 800, 600);
      
      expect(scale).toBe(1.0);
    });
  });

  describe('fitToWidth', () => {
    test('should calculate scale to fit width', () => {
      const data = { naturalWidth: 800, naturalHeight: 600 };
      const scale = adapter.fitToWidth(data, 400);
      
      expect(scale).toBe(0.5);
    });

    test('should not scale up if image width is smaller than container', () => {
      const data = { naturalWidth: 400, naturalHeight: 300 };
      const scale = adapter.fitToWidth(data, 800);
      
      expect(scale).toBe(1.0);
    });
  });

  describe('fitToHeight', () => {
    test('should calculate scale to fit height', () => {
      const data = { naturalWidth: 600, naturalHeight: 800 };
      const scale = adapter.fitToHeight(data, 400);
      
      expect(scale).toBe(0.5);
    });

    test('should not scale up if image height is smaller than container', () => {
      const data = { naturalWidth: 600, naturalHeight: 400 };
      const scale = adapter.fitToHeight(data, 800);
      
      expect(scale).toBe(1.0);
    });
  });

  describe('getMetadata', () => {
    test('should return correct metadata', () => {
      const data = {
        fileType: 'jpg',
        fileName: 'test.jpg',
        fileSize: 1024,
        naturalWidth: 800,
        naturalHeight: 600,
        lastModified: 1234567890
      };

      const metadata = adapter.getMetadata(data);

      expect(metadata.fileName).toBe('test.jpg');
      expect(metadata.fileSize).toBe(1024);
      expect(metadata.fileType).toBe('jpg');
      expect(metadata.width).toBe(800);
      expect(metadata.height).toBe(600);
      expect(metadata.aspectRatio).toBeCloseTo(1.333, 2);
      expect(metadata.lastModified).toBe(1234567890);
    });
  });
});
