/**
 * WPS演示解析器单元测试
 */

import { DPSParser } from '../../src/parsers/DPSParser.js';

// 测试辅助函数
function createTestDPSSlides() {
  // 简化处理，实际测试需要真实的.DPS文件
  return null;
}

describe('WPS演示解析器测试', () => {
  
  let parser;
  
  beforeEach(() => {
    parser = new DPSParser();
  });
  
  // 测试1: ArrayBuffer转Base64
  test('测试1: ArrayBuffer转Base64', () => {
    const testData = 'Hello';
    const encoder = new TextEncoder();
    const buffer = encoder.encode(testData).buffer;
    
    const base64 = parser.arrayBufferToBase64(buffer);
    
    expect(base64).toBe('SGVsbG8=');
  });
  
  // 测试2: 媒体类型识别
  test('测试2: 媒体类型识别', () => {
    expect(parser.getMediaType('media/image1.png')).toBe('image/png');
    expect(parser.getMediaType('media/image2.jpg')).toBe('image/jpeg');
    expect(parser.getMediaType('media/image3.gif')).toBe('image/gif');
    expect(parser.getMediaType('media/image4.bmp')).toBe('image/bmp');
    expect(parser.getMediaType('media/unknown.xyz')).toBe('image');
  });
  
  // 测试3: XML解码
  test('测试3: XML解码', () => {
    const xmlText = '<root><slide>测试</slide></root>';
    const encoder = new TextEncoder();
    const data = encoder.encode(xmlText).buffer;
    
    const decoded = parser.decodeXML(data);
    
    expect(decoded).toContain('测试');
    expect(decoded).toContain('<root>');
  });
  
  // 测试4: 文件验证
  test('测试4: 文件验证 - 有效ZIP文件', () => {
    const validData = new ArrayBuffer(4);
    const view = new Uint8Array(validData);
    view[0] = 0x50;
    view[1] = 0x4B;
    view[2] = 0x03;
    view[3] = 0x04;
    
    const isValid = parser.validate(validData);
    expect(isValid).toBe(true);
  });
  
  test('测试5: 文件验证 - 无效文件', () => {
    const invalidData = new ArrayBuffer(4);
    const view = new Uint8Array(invalidData);
    view[0] = 0xFF;
    view[1] = 0xFF;
    view[2] = 0xFF;
    view[3] = 0xFF;
    
    const isValid = parser.validate(invalidData);
    expect(isValid).toBe(false);
  });
  
  // 测试6: 获取元数据
  test('测试6: 获取元数据', () => {
    const testData = new ArrayBuffer(1024);
    const metadata = parser.getMetadata(testData);
    
    expect(metadata.format).toBe('DPS');
    expect(metadata.mimeType).toContain('powerpoint');
    expect(metadata.size).toBe(1024);
  });
  
  // 测试7: 解析演示文稿
  test('测试7: 解析演示文稿', () => {
    const xmlText = `
      <presentation xmlns="http://schemas.openxmlformats.org/presentationml/2006/main">
        <slides>
          <slide id="1" name="幻灯片1" filename="2.xml"/>
          <slide id="2" name="幻灯片2" filename="3.xml"/>
          <slide name="自动命名" filename="custom.xml"/>
        </slides>
      </presentation>
    `;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(xmlText).buffer;
    
    const presentation = parser.parsePresentation(data);
    
    expect(presentation.slides.length).toBe(3);
    expect(presentation.slides[0].id).toBe(1);
    expect(presentation.slides[0].name).toBe('幻灯片1');
    expect(presentation.slides[1].fileName).toBe('3.xml');
    expect(presentation.slides[2].name).toBe('自动命名');
  });
  
  // 测试8: 解析形状
  test('测试8: 解析形状', () => {
    const xmlString = '<shape id="shape1" type="rectangle" x="100" y="200" width="300" height="400"/>';
    const domParser = new DOMParser();
    const doc = domParser.parseFromString(xmlString, 'application/xml');
    const shapeElement = doc.getElementsByTagName('shape')[0];
    
    const shape = parser.parseShape(shapeElement);
    
    expect(shape.id).toBe('shape1');
    expect(shape.type).toBe('rectangle');
    expect(shape.position.x).toBe(100);
    expect(shape.position.y).toBe(200);
    expect(shape.size.width).toBe(300);
    expect(shape.size.height).toBe(400);
  });
  
  // 测试9: 解析图片元素
  test('测试9: 解析图片元素', () => {
    const xmlString = '<image ref="media/image1.png" x="150" y="250"/>';
    const domParser = new DOMParser();
    const doc = domParser.parseFromString(xmlString, 'application/xml');
    const imageElement = doc.getElementsByTagName('image')[0];
    
    const image = parser.parseImage(imageElement);
    
    expect(image.type).toBe('image');
    expect(image.ref).toBe('media/image1.png');
    expect(image.position.x).toBe(150);
    expect(image.position.y).toBe(250);
  });
  
  // 测试10: 共享字符串解析
  test('测试10: 共享字符串解析', async () => {
    const xmlText = `
      <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        <si><t>标题1</t></si>
        <si><t>标题2</t></si>
        <si><t>标题3</t></si>
      </sst>
    `;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(xmlText).buffer;
    
    await parser.parseSharedStrings(data);
    
    expect(parser.sharedStrings.length).toBe(3);
    expect(parser.sharedStrings[0]).toBe('标题1');
    expect(parser.sharedStrings[1]).toBe('标题2');
    expect(parser.sharedStrings[2]).toBe('标题3');
  });
  
  // 测试11: 空共享字符串元素
  test('测试11: 空共享字符串元素', async () => {
    const xmlText = `
      <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        <si><t>有文本</t></si>
        <si></si>
        <si><t>末尾</t></si>
      </sst>
    `;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(xmlText).buffer;
    
    await parser.parseSharedStrings(data);
    
    expect(parser.sharedStrings.length).toBe(3);
    expect(parser.sharedStrings[1]).toBe('');
  });
  
  // 测试12: 形状默认值
  test('测试12: 形状默认值', () => {
    const xmlString = '<shape id="shape1"/>';
    const domParser = new DOMParser();
    const doc = domParser.parseFromString(xmlString, 'application/xml');
    const shapeElement = doc.getElementsByTagName('shape')[0];
    
    const shape = parser.parseShape(shapeElement);
    
    expect(shape.type).toBe('rectangle');
    expect(shape.position.x).toBe(0);
    expect(shape.position.y).toBe(0);
    expect(shape.size.width).toBe(100);
    expect(shape.size.height).toBe(100);
  });
  
  // 测试13: 中文XML解码
  test('测试13: 中文XML解码', () => {
    const xmlText = '<presentation><slide>中文幻灯片</slide></presentation>';
    const encoder = new TextEncoder();
    const data = encoder.encode(xmlText).buffer;
    
    const decoded = parser.decodeXML(data);
    
    expect(decoded).toContain('中文幻灯片');
    expect(decoded).toContain('<presentation>');
  });
  
  // 测试14: 图片默认位置
  test('测试14: 图片默认位置', () => {
    const xmlString = '<image ref="media/image1.png"/>';
    const domParser = new DOMParser();
    const doc = domParser.parseFromString(xmlString, 'application/xml');
    const imageElement = doc.getElementsByTagName('image')[0];
    
    const image = parser.parseImage(imageElement);
    
    expect(image.type).toBe('image');
    expect(image.position.x).toBe(0);
    expect(image.position.y).toBe(0);
  });
  
  // 测试15: 演示文稿空处理
  test('测试15: 演示文稿无幻灯片', () => {
    const xmlText = `
      <presentation xmlns="http://schemas.openxmlformats.org/presentationml/2006/main">
        <slides>
        </slides>
      </presentation>
    `;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(xmlText).buffer;
    
    const presentation = parser.parsePresentation(data);
    
    expect(presentation.slides.length).toBe(0);
  });
  
  // 测试16: 形状不同类型
  test('测试16: 形状不同类型', () => {
    const xmlString1 = '<shape id="shape1" type="ellipse"/>';
    const xmlString2 = '<shape id="shape2" type="triangle"/>';
    
    const domParser = new DOMParser();
    const doc1 = domParser.parseFromString(xmlString1, 'application/xml');
    const doc2 = domParser.parseFromString(xmlString2, 'application/xml');
    
    const shape1 = parser.parseShape(doc1.getElementsByTagName('shape')[0]);
    const shape2 = parser.parseShape(doc2.getElementsByTagName('shape')[0]);
    
    expect(shape1.type).toBe('ellipse');
    expect(shape2.type).toBe('triangle');
  });
  
  // 测试17: 不同图片格式
  test('测试17: 不同图片格式', () => {
    expect(parser.getMediaType('media/image.jpeg')).toBe('image/jpeg');
    expect(parser.getMediaType('media/image1.JPG')).toBe('image/jpeg');
    expect(parser.getMediaType('media/picture.png')).toBe('image/png');
  });
  
  // 测试18: 多个形状元素
  test('测试18: 多个形状元素解析', () => {
    const xmlText = `
      <shapes>
        <shape id="shape1" x="10" y="10"/>
        <shape id="shape2" x="100" y="100"/>
        <shape id="shape3" x="200" y="200"/>
      </shapes>
    `;
    
    const domParser = new DOMParser();
    const doc = domParser.parseFromString(xmlString, 'application/xml');
    const shapes = doc.getElementsByTagName('shape');
    
    expect(shapes.length).toBe(3);
    
    const shape1 = parser.parseShape(shapes[0]);
    const shape2 = parser.parseShape(shapes[1]);
    const shape3 = parser.parseShape(shapes[2]);
    
    expect(shape1.position.x).toBe(10);
    expect(shape2.position.x).toBe(100);
    expect(shape3.position.x).toBe(200);
  });
  
  // 测试19: 大型Base64转换
  test('测试19: 大型Base64转换', () => {
    const largeText = 'x'.repeat(1000);
    const encoder = new TextEncoder();
    const buffer = encoder.encode(largeText).buffer;
    
    const base64 = parser.arrayBufferToBase64(buffer);
    
    expect(base64.length).toBeGreaterThan(0);
    expect(base64).not.toContain(largeText); // Base64编码后不同
  });
  
  // 测试20: 边界条件 - 空ArrayBuffer
  test('测试20: 边界条件 - 空ArrayBuffer', () => {
    const emptyBuffer = new ArrayBuffer(0);
    const base64 = parser.arrayBufferToBase64(emptyBuffer);
    
    expect(base64).toBe('');
  });
});

// 运行测试的辅助函数
export async function runDPSParserTests() {
  console.log('\n========================================');
  console.log('开始WPS演示解析器测试');
  console.log('========================================\n');
  
  const parser = new DPSParser();
  let passed = 0;
  let failed = 0;
  
  // 测试套件1: Base64转换
  console.log('📋 测试套件: Base64转换');
  const testStr = 'Test';
  const buffer = new TextEncoder().encode(testStr).buffer;
  const base64 = parser.arrayBufferToBase64(buffer);
  if (base64 === btoa(testStr)) {
    console.log('   ✅ Base64编码正确');
    passed++;
  } else {
    console.log('   ❌ Base64编码失败');
    failed++;
  }
  console.log('');
  
  // 测试套件2: 媒体类型识别
  console.log('📋 测试套件: 媒体类型识别');
  const typeTests = [
    { file: 'media/image1.png', expected: 'image/png' },
    { file: 'media/image2.jpg', expected: 'image/jpeg' },
    { file: 'media/image3.gif', expected: 'image/gif' },
    { file: 'media/image4.bmp', expected: 'image/bmp' }
  ];
  
  for (const test of typeTests) {
    const type = parser.getMediaType(test.file);
    if (type === test.expected) {
      console.log(`   ✅ ${test.file} -> ${type}`);
      passed++;
    } else {
      console.log(`   ❌ ${test.file} -> 期望${test.expected}, 实际${type}`);
      failed++;
    }
  }
  console.log('');
  
  // 测试套件3: 文件验证
  console.log('📋 测试套件: 文件验证');
  const validData = new ArrayBuffer(4);
  new Uint8Array(validData).set([0x50, 0x4B, 0x03, 0x04]);
  const invalidData = new ArrayBuffer(4);
  new Uint8Array(invalidData).set([0xFF, 0xFF, 0xFF, 0xFF]);
  
  if (parser.validate(validData)) {
    console.log('   ✅ 有效ZIP文件验证通过');
    passed++;
  } else {
    console.log('   ❌ 有效ZIP文件验证失败');
    failed++;
  }
  
  if (!parser.validate(invalidData)) {
    console.log('   ✅ 无效文件验证通过');
    passed++;
  } else {
    console.log('   ❌ 无效文件验证失败');
    failed++;
  }
  console.log('');
  
  // 测试套件4: XML解码
  console.log('📋 测试套件: XML解码');
  const testXML = '<root><slide>中文</slide></root>';
  const testBuffer = new TextEncoder().encode(testXML).buffer;
  const decoded = parser.decodeXML(testBuffer);
  if (decoded.includes('中文')) {
    console.log('   ✅ 中文XML解码正确');
    passed++;
  } else {
    console.log('   ❌ 中文XML解码失败');
    failed++;
  }
  console.log('');
  
  console.log('========================================');
  console.log(`测试完成: ${passed}通过, ${failed}失败`);
  console.log('========================================\n');
  
  return { passed, failed };
}
