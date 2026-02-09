/**
 * 测试环境设置
 * 
 * @description 测试前的全局设置
 * @version 1.0.0
 */

import { expect, beforeEach, afterEach, vi } from 'vitest';

// 全局设置
beforeEach(() => {
  // 每个测试前的设置
});

afterEach(() => {
  // 每个测试后的清理
  vi.restoreAllMocks();
});

// 模拟DOM
global.HTMLDivElement = class HTMLDivElement {
  constructor() {
    this.className = '';
    this.style = {};
    this.innerHTML = '';
    this.appendChild = vi.fn();
    this.removeChild = vi.fn();
    this.addEventListener = vi.fn();
    this.removeEventListener = vi.fn();
    this.querySelector = vi.fn();
    this.querySelectorAll = vi.fn();
  }
};

global.HTMLDocumentElement = class HTMLDocumentElement {
  constructor() {
    this.body = new global.HTMLDivElement();
    this.getElementById = vi.fn();
    this.querySelector = vi.fn();
    this.querySelectorAll = vi.fn();
    this.createElement = vi.fn();
  }
};

// 模拟File对象
global.File = class File {
  constructor(chunks, filename, options = {}) {
    this.name = filename;
    this.size = options.size || 0;
    this.type = options.type || '';
    this.lastModified = options.lastModified || new Date();
    this.arrayBuffer = vi.fn(() => Promise.resolve(new ArrayBuffer(0)));
    this.text = vi.fn(() => Promise.resolve(''));
    this.slice = vi.fn();
  }
};

// 模拟FileReader
global.FileReader = class FileReader {
  constructor() {
    this.onload = null;
    this.onerror = null;
    this.onprogress = null;
    this.readAsArrayBuffer = vi.fn();
    this.readAsText = vi.fn();
    this.readAsDataURL = vi.fn();
  }
};

export { expect, vi };