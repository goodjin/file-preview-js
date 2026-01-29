/**
 * PptxParser - PPTX文件解析器
 * 解析PPTX文件结构，提取幻灯片和元素数据
 * 支持流式解析大文件
 */

class PptxParser {
  constructor() {
    this.slides = [];
    this.slideMasters = {};
    this.slideLayouts = {};
    this.media = {};
    this.currentSlideIndex = 0;
  }

  /**
   * 解析PPTX文件
   * @param {File|ArrayBuffer} file - PPTX文件或ArrayBuffer
   * @param {Object} options - 解析选项
   * @returns {Promise<Object>} 解析结果
   */
  async parse(file, options = {}) {
    try {
      const arrayBuffer = file instanceof File 
        ? await file.arrayBuffer() 
        : file;

      // 使用JSZip解压文件
      const JSZip = await this._loadJSZip();
      const zip = await JSZip.loadAsync(arrayBuffer);

      // 解析文档属性
      const docProps = await this._parseDocProps(zip);

      // 解析幻灯片主模板
      await this._parseSlideMasters(zip);

      // 解析幻灯片布局
      await this._parseSlideLayouts(zip);

      // 解析幻灯片列表
      const slideList = await this._parseSlideList(zip);

      // 按需解析幻灯片（流式解析）
      const slidesToParse = options.maxSlides || slideList.length;
      for (let i = 0; i < Math.min(slidesToParse, slideList.length); i++) {
        const slideData = await this._parseSlide(zip, slideList[i], i + 1);
        this.slides.push(slideData);
        
        // 触发进度回调
        if (options.onProgress) {
          options.onProgress({
            loaded: i + 1,
            total: slideList.length,
            slide: slideData
          });
        }
      }

      return {
        slides: this.slides,
        totalSlides: slideList.length,
        loadedSlides: this.slides.length,
        docProps,
        media: this.media
      };
    } catch (error) {
      throw new Error(`PPTX解析失败: ${error.message}`);
    }
  }

  /**
   * 解析文档属性
   */
  async _parseDocProps(zip) {
    try {
      const content = await zip.file('docProps/app.xml')?.async('string');
      if (!content) return {};
      
      // 简单解析XML提取元数据
      const parser = new DOMParser();
      const xml = parser.parseFromString(content, 'text/xml');
      
      return {
        title: xml.querySelector('Title')?.textContent || '',
        author: xml.querySelector('Manager')?.textContent || '',
        created: xml.querySelector('Created')?.textContent || '',
        application: xml.querySelector('Application')?.textContent || ''
      };
    } catch (error) {
      return {};
    }
  }

  /**
   * 解析幻灯片主模板
   */
  async _parseSlideMasters(zip) {
    try {
      const content = await zip.file('ppt/slideMasters/_rels/slideMaster1.xml.rels')?.async('string');
      if (!content) return;
      // 解析主模板关系（简化处理）
    } catch (error) {
      // 忽略错误，使用默认模板
    }
  }

  /**
   * 解析幻灯片布局
   */
  async _parseSlideLayouts(zip) {
    // 简化处理，实际项目中需要解析布局定义
    this.slideLayouts['default'] = {
      name: 'blank',
      width: 9144000, // 10英寸 * 914400 EMU
      height: 6858000 // 7.5英寸 * 914400 EMU
    };
  }

  /**
   * 解析幻灯片列表
   */
  async _parseSlideList(zip) {
    try {
      const content = await zip.file('ppt/presentation.xml')?.async('string');
      if (!content) return [];

      const parser = new DOMParser();
      const xml = parser.parseFromString(content, 'text/xml');
      const slides = [];
      
      // 提取幻灯片ID列表
      xml.querySelectorAll('p:sldId').forEach((sldId, index) => {
        const rid = sldId.getAttribute('r:id');
        const relId = rid.match(/(\d+)$/)?.[1] || index + 1;
        slides.push({
          id: sldId.getAttribute('id'),
          relId,
          path: `ppt/slides/slide${relId}.xml`
        });
      });

      return slides;
    } catch (error) {
      return [];
    }
  }

  /**
   * 解析单个幻灯片
   */
  async _parseSlide(zip, slideInfo, index) {
    try {
      const content = await zip.file(slideInfo.path)?.async('string');
      if (!content) return this._createEmptySlide(index);

      const parser = new DOMParser();
      const xml = parser.parseFromString(content, 'text/xml');

      // 提取幻灯片元素
      const elements = [];
      const spTree = xml.querySelector('p:spTree');
      
      if (spTree) {
        // 提取文本框
        spTree.querySelectorAll('p:sp').forEach(sp => {
          const textBox = this._parseTextBox(sp);
          if (textBox) elements.push(textBox);
        });

        // 提取图片
        spTree.querySelectorAll('p:pic').forEach(pic => {
          const image = this._parseImage(pic, zip);
          if (image) elements.push(image);
        });

        // 提取形状
        spTree.querySelectorAll('p:sp').forEach(sp => {
          const shape = this._parseShape(sp);
          if (shape && !sp.querySelector('a:t')) { // 排除文本框
            elements.push(shape);
          }
        });
      }

      return {
        index,
        id: slideInfo.id,
        elements,
        layout: this.slideLayouts['default'],
        transition: this._parseTransition(xml)
      };
    } catch (error) {
      return this._createEmptySlide(index);
    }
  }

  /**
   * 解析文本框
   */
  _parseTextBox(sp) {
    const textRuns = [];
    sp.querySelectorAll('a:r a:t').forEach(textElem => {
      const rPr = textElem.closest('a:r')?.querySelector('a:rPr');
      textRuns.push({
        text: textElem.textContent,
        bold: rPr?.getAttribute('b') === '1',
        italic: rPr?.getAttribute('i') === '1',
        fontSize: rPr?.getAttribute('sz') ? parseInt(rPr.getAttribute('sz')) / 100 : 18,
        color: rPr?.querySelector('a:srgbClr')?.getAttribute('val') || '000000'
      });
    });

    if (textRuns.length === 0) return null;

    const spPr = sp.querySelector('a:spPr');
    return {
      type: 'textbox',
      x: this._parseCoord(spPr, 'a:off', 'x', 0),
      y: this._parseCoord(spPr, 'a:off', 'y', 0),
      width: this._parseCoord(spPr, 'a:ext', 'cx', 9144000),
      height: this._parseCoord(spPr, 'a:ext', 'cy', 6858000),
      textRuns
    };
  }

  /**
   * 解析图片
   */
  async _parseImage(pic, zip) {
    try {
      const blip = pic.querySelector('a:blip');
      if (!blip) return null;

      const embed = blip.getAttribute('r:embed');
      if (!embed) return null;

      const relFile = `ppt/slides/_rels/slide${this.currentSlideIndex + 1}.xml.rels`;
      const relContent = await zip.file(relFile)?.async('string');
      if (!relContent) return null;

      const parser = new DOMParser();
      const relXml = parser.parseFromString(relContent, 'text/xml');
      const rel = relXml.querySelector(`Relationship[Id="${embed}"]`);
      if (!rel) return null;

      const imagePath = rel.getAttribute('Target').replace('..', 'ppt');
      const imageFile = zip.file(imagePath);
      if (!imageFile) return null;

      const blob = await imageFile.async('blob');
      const url = URL.createObjectURL(blob);

      const spPr = pic.querySelector('p:spPr');
      return {
        type: 'image',
        url,
        x: this._parseCoord(spPr, 'a:off', 'x', 0),
        y: this._parseCoord(spPr, 'a:off', 'y', 0),
        width: this._parseCoord(spPr, 'a:ext', 'cx', 9144000),
        height: this._parseCoord(spPr, 'a:ext', 'cy', 6858000)
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 解析形状
   */
  _parseShape(sp) {
    const spPr = sp.querySelector('a:spPr');
    if (!spPr) return null;

    const solidFill = spPr.querySelector('a:solidFill a:srgbClr');
    const presetGeometry = spPr.querySelector('a:presetGeometry');

    return {
      type: 'shape',
      x: this._parseCoord(spPr, 'a:off', 'x', 0),
      y: this._parseCoord(spPr, 'a:off', 'y', 0),
      width: this._parseCoord(spPr, 'a:ext', 'cx', 100000),
      height: this._parseCoord(spPr, 'a:ext', 'cy', 100000),
      fill: solidFill?.getAttribute('val') || 'FFFFFF',
      geometry: presetGeometry?.getAttribute('prst') || 'rect'
    };
  }

  /**
   * 解析切换效果
   */
  _parseTransition(xml) {
    const transition = xml.querySelector('p:transition');
    if (!transition) return null;

    const type = transition.querySelector('p:dissolve') ? 'dissolve' :
                 transition.querySelector('p:fade') ? 'fade' : 'none';

    return { type, duration: 500 };
  }

  /**
   * 解析坐标（EMU转像素）
   */
  _parseCoord(parent, selector, attr, defaultValue) {
    const elem = parent?.querySelector(selector);
    if (!elem) return defaultValue;
    return Math.round(parseInt(elem.getAttribute(attr) || defaultValue) / 9525);
  }

  /**
   * 创建空幻灯片
   */
  _createEmptySlide(index) {
    return {
      index,
      id: `${index}`,
      elements: [],
      layout: this.slideLayouts['default'],
      transition: null
    };
  }

  /**
   * 动态加载JSZip
   */
  async _loadJSZip() {
    if (window.JSZip) return window.JSZip;
    
    // 动态导入JSZip
    return import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js')
      .then(module => module.default);
  }

  /**
   * 清理资源
   */
  destroy() {
    // 释放图片URL
    Object.values(this.media).forEach(url => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    this.slides = [];
    this.media = {};
  }
}

// 导出
export default PptxParser;
