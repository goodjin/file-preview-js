/**
 * XML解析工具类
 * 用于解析和处理XML文档
 */
export class XMLUtils {
  /**
   * 解析XML字符串为DOM文档
   * @param {string} xmlString - XML字符串
   * @returns {Document} DOM文档对象
   */
  static parseXML(xmlString) {
    const parser = new DOMParser();
    return parser.parseFromString(xmlString, 'text/xml');
  }

  /**
   * 将DOM文档序列化为XML字符串
   * @param {Document} xmlDoc - DOM文档对象
   * @returns {string} XML字符串
   */
  static serializeXML(xmlDoc) {
    const serializer = new XMLSerializer();
    return serializer.serializeToString(xmlDoc);
  }

  /**
   * 获取元素的文本内容
   * @param {Element} element - DOM元素
   * @returns {string} 文本内容
   */
  static getText(element) {
    return element.textContent || '';
  }

  /**
   * 获取元素的属性值
   * @param {Element} element - DOM元素
   * @param {string} attrName - 属性名称
   * @param {string} defaultValue - 默认值
   * @returns {string} 属性值
   */
  static getAttribute(element, attrName, defaultValue = '') {
    return element.getAttribute(attrName) || defaultValue;
  }

  /**
   * 获取元素的数字属性
   * @param {Element} element - DOM元素
   * @param {string} attrName - 属性名称
   * @param {number} defaultValue - 默认值
   * @returns {number} 数字属性值
   */
  static getNumberAttribute(element, attrName, defaultValue = 0) {
    const value = element.getAttribute(attrName);
    return value ? parseInt(value, 10) : defaultValue;
  }

  /**
   * 获取子元素
   * @param {Element} element - DOM元素
   * @param {string} tagName - 子元素标签名
   * @returns {Element[]} 子元素数组
   */
  static getChildren(element, tagName) {
    if (!tagName) {
      return Array.from(element.children);
    }
    return Array.from(element.getElementsByTagName(tagName));
  }

  /**
   * 获取第一个子元素
   * @param {Element} element - DOM元素
   * @param {string} tagName - 子元素标签名
   * @returns {Element|null} 第一个子元素
   */
  static getFirstChild(element, tagName) {
    const children = this.getChildren(element, tagName);
    return children.length > 0 ? children[0] : null;
  }

  /**
   * 解析命名空间URI
   * @param {string} prefix - 命名空间前缀
   * @returns {Object} 命名空间映射
   */
  static getNamespaces(prefix = '') {
    return {
      'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
      'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
      'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
      's': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
    };
  }

  /**
   * 使用XPath查询元素
   * @param {Document|Element} context - 上下文节点
   * @param {string} xpath - XPath表达式
   * @returns {XPathResult} XPath结果
   */
  static queryXPath(context, xpath) {
    return document.evaluate(
      xpath,
      context,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
  }

  /**
   * 获取所有指定标签的元素
   * @param {Element} element - DOM元素
   * @param {string} tagName - 标签名
   * @returns {Element[]} 元素数组
   */
  static getAllByTag(element, tagName) {
    return Array.from(element.getElementsByTagNameNS('*', tagName));
  }

  /**
   * 解析样式字符串
   * @param {string} styleStr - 样式字符串
   * @returns {Object} 样式对象
   */
  static parseStyle(styleStr) {
    const styles = {};
    if (!styleStr) return styles;
    
    const parts = styleStr.split(';');
    for (const part of parts) {
      const [key, value] = part.split(':');
      if (key && value) {
        styles[key.trim()] = value.trim();
      }
    }
    return styles;
  }

  /**
   * 解析颜色值
   * @param {string} colorStr - 颜色字符串
   * @returns {Object} 颜色对象 { r, g, b, a }
   */
  static parseColor(colorStr) {
    if (!colorStr) return { r: 0, g: 0, b: 0, a: 1 };
    
    // 处理十六进制颜色 #RRGGBB 或 #AARRGGBB
    if (colorStr.startsWith('#')) {
      const hex = colorStr.slice(1);
      if (hex.length === 6) {
        return {
          r: parseInt(hex.slice(0, 2), 16),
          g: parseInt(hex.slice(2, 4), 16),
          b: parseInt(hex.slice(4, 6), 16),
          a: 1
        };
      } else if (hex.length === 8) {
        return {
          r: parseInt(hex.slice(2, 4), 16),
          g: parseInt(hex.slice(4, 6), 16),
          b: parseInt(hex.slice(6, 8), 16),
          a: parseInt(hex.slice(0, 2), 16) / 255
        };
      }
    }
    
    // 处理rgba/rgb格式
    const rgbMatch = colorStr.match(/rgba?\(([^)]+)\)/);
    if (rgbMatch) {
      const values = rgbMatch[1].split(',').map(v => parseFloat(v.trim()));
      return {
        r: values[0],
        g: values[1],
        b: values[2],
        a: values[3] !== undefined ? values[3] : 1
      };
    }
    
    return { r: 0, g: 0, b: 0, a: 1 };
  }

  /**
   * 转义XML特殊字符
   * @param {string} text - 文本内容
   * @returns {string} 转义后的文本
   */
  static escapeXML(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * 反转义XML特殊字符
   * @param {string} text - 文本内容
   * @returns {string} 反转义后的文本
   */
  static unescapeXML(text) {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }
}
