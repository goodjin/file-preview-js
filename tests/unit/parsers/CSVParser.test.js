/**
 * CSV解析器单元测试
 */

import { CSVParser } from '../../src/parsers/CSVParser.js';

// 测试辅助函数：创建测试CSV数据
function createCSVFile(csvText, encoding = 'utf-8') {
  const encoder = new TextEncoder();
  return encoder.encode(csvText).buffer;
}

describe('CSV解析器测试', () => {
  
  let parser;
  
  beforeEach(() => {
    parser = new CSVParser();
  });
  
  // 测试1: 基本CSV解析
  test('测试1: 基本CSV解析', () => {
    const csvText = 'name,age,city\n张三,25,北京\n李四,30,上海';
    const fileData = createCSVFile(csvText);
    
    return parser.parse(fileData).then(result => {
      expect(result.type).toBe('csv');
      expect(result.data.length).toBe(2);
      expect(result.data[0].columns).toEqual(['张三', '25', '北京']);
    });
  });
  
  // 测试2: 带引号的CSV
  test('测试2: 带引号的CSV', () => {
    const csvText = 'name,description\n"张三","a, b, c"\n"李四","x\ny"';
    const fileData = createCSVFile(csvText);
    
    return parser.parse(fileData).then(result => {
      expect(result.data[0].columns).toEqual(['张三', 'a, b, c']);
      expect(result.data[1].columns).toEqual(['李四', 'x\ny']);
    });
  });
  
  // 测试3: 不同分隔符
  test('测试3: 分号分隔符', () => {
    const csvText = 'name;age;city\n张三;25;北京\n李四;30;上海';
    const fileData = createCSVFile(csvText);
    
    const parserWithSemicolon = new CSVParser({ delimeter: ';' });
    return parserWithSemicolon.parse(fileData).then(result => {
      expect(result.data[0].columns).toEqual(['张三', '25', '北京']);
      expect(result.data[1].columns).toEqual(['李四', '30', '上海']);
    });
  });
  
  // 测试4: 制表符分隔符
  test('测试4: 制表符分隔符', () => {
    const csvText = 'name\tage\tcity\n张三\t25\t北京\n李四\t30\t上海';
    const fileData = createCSVFile(csvText);
    
    const parserWithTab = new CSVParser({ delimeter: '\t' });
    return parserWithTab.parse(fileData).then(result => {
      expect(result.data[0].columns).toEqual(['张三', '25', '北京']);
    });
  });
  
  // 测试5: 转义引号
  test('测试5: 转义引号', () => {
    const csvText = 'name,description\n"张三","包含""引号"""\n"李四","""""';
    const fileData = createCSVFile(csvText);
    
    return parser.parse(fileData).then(result => {
      expect(result.data[0].columns[1]).toContain('"引号"');
    });
  });
  
  // 测试6: 标题行处理
  test('测试6: 标题行处理', () => {
    const csvText = 'name,age,city\n张三,25,北京\n李四,30,上海';
    const fileData = createCSVFile(csvText);
    
    return parser.parse(fileData).then(result => {
      expect(result.headers).toEqual(['name', 'age', 'city']);
      expect(result.data.length).toBe(2);  // 不包含标题行
    });
  });
  
  // 测试7: 无标题行
  test('测试7: 无标题行', () => {
    const csvText = '张三,25,北京\n李四,30,上海';
    const fileData = createCSVFile(csvText);
    
    const parserNoHeader = new CSVParser({ hasHeader: false });
    return parserNoHeader.parse(fileData).then(result => {
      expect(result.headers).toEqual([]);
      expect(result.data.length).toBe(2);
    });
  });
  
  // 测试8: 空字段
  test('测试8: 空字段', () => {
    const csvText = 'name,,city\n张三,,北京\n,,上海';
    const fileData = createCSVFile(csvText);
    
    return parser.parse(fileData).then(result => {
      expect(result.data[0].columns[1]).toBe('');
      expect(result.data[1].columns).toEqual(['', '', '上海']);
    });
  });
  
  // 测试9: 不同换行符
  test('测试9: Windows换行符（CRLF）', () => {
    const csvText = 'name,age\r\n张三,25\r\n李四,30';
    const fileData = createCSVFile(csvText);
    
    return parser.parse(fileData).then(result => {
      expect(result.data.length).toBe(2);
    });
  });
  
  // 测试10: 文件验证
  test('测试10: 文件验证 - 有效CSV', () => {
    const csvText = 'name,age\n张三,25';
    const fileData = createCSVFile(csvText);
    
    const isValid = parser.validate(fileData);
    expect(isValid).toBe(true);
  });
  
  test('测试11: 文件验证 - 无效文件', () => {
    const invalidData = new ArrayBuffer(100);
    
    const isValid = parser.validate(invalidData);
    expect(isValid).toBe(false);
  });
  
  // 测试12: 转换为数组
  test('测试12: 转换为数组', async () => {
    const csvText = 'name,age\n张三,25\n李四,30';
    const fileData = createCSVFile(csvText);
    
    const array = await parser.toArray(fileData);
    expect(array.length).toBe(2);
    expect(array[0][0]).toBe('张三');
  });
  
  // 测试13: 转换为对象
  test('测试13: 转换为对象', async () => {
    const csvText = 'name,age,city\n张三,25,北京\n李四,30,上海';
    const fileData = createCSVFile(csvText);
    
    const objects = await parser.toObjects(fileData);
    expect(objects.length).toBe(2);
    expect(objects[0]).toEqual({ name: '张三', age: '25', city: '北京' });
  });
  
  // 测试14: 获取元数据
  test('测试14: 获取元数据', () => {
    const csvText = 'name,age,city\n张三,25,北京\n李四,30,上海';
    const fileData = createCSVFile(csvText);
    
    const metadata = parser.getMetadata(fileData);
    expect(metadata.format).toBe('CSV');
    expect(metadata.estimatedRowCount).toBe(3);
    expect(metadata.estimatedColumnCount).toBe(3);
  });
  
  // 测试15: CSV生成
  test('测试15: CSV生成', () => {
    const data = [
      ['张三', '25', '北京'],
      ['李四', '30', '上海']
    ];
    
    const csvText = parser.generateCSV(data, false);
    expect(csvText).toContain('张三,25,北京');
    expect(csvText).toContain('李四,30,上海');
  });
  
  // 测试16: 中文支持
  test('测试16: 中文支持', () => {
    const csvText = '姓名,年龄,城市\n张三,25,北京\n李四,30,上海';
    const fileData = createCSVFile(csvText);
    
    return parser.parse(fileData).then(result => {
      expect(result.data[0].columns[0]).toBe('张三');
      expect(result.data[1].columns[2]).toBe('上海');
    });
  });
  
  // 测试17: 单列CSV
  test('测试17: 单列CSV', () => {
    const csvText = 'name\n张三\n李四';
    const fileData = createCSVFile(csvText);
    
    return parser.parse(fileData).then(result => {
      expect(result.data.length).toBe(3);
      expect(result.data[0].columns).toEqual(['张三']);
    });
  });
  
  // 测试18: 大量数据
  test('测试18: 大量数据', () => {
    let csvText = 'name,age,city\n';
    for (let i = 0; i < 100; i++) {
      csvText += `用户${i},${20 + i},${['北京', '上海', '广州', '深圳'][i % 4]}\n`;
    }
    const fileData = createCSVFile(csvText);
    
    return parser.parse(fileData).then(result => {
      expect(result.data.length).toBe(100);
    });
  });
  
  // 测试19: 混合数据类型
  test('测试19: 混合数据类型', () => {
    const csvText = 'name,age,salary,active\n张三,25,10000.5,true\n李四,30,15000,false';
    const fileData = createCSVFile(csvText);
    
    return parser.parse(fileData).then(result => {
      expect(result.data[0].columns).toEqual(['张三', '25', '10000.5', 'true']);
      expect(result.data[1].columns[3]).toBe('false');
    });
  });
  
  // 测试20: 空行处理
  test('测试20: 空行处理', () => {
    const csvText = 'name,age\n张三,25\n\n李四,30';
    const fileData = createCSVFile(csvText);
    
    return parser.parse(fileData).then(result => {
      expect(result.data.length).toBe(2);  // 空行被跳过
    });
  });
});

// 运行测试的辅助函数
export async function runCSVParserTests() {
  console.log('\n========================================');
  console.log('开始CSV解析器测试');
  console.log('========================================\n');
  
  const parser = new CSVParser();
  let passed = 0;
  let failed = 0;
  
  // 测试套件1: 基本解析
  console.log('📋 测试套件: 基本解析');
  const basicCSV = 'name,age,city\n张三,25,北京\n李四,30,上海';
  const fileData = new TextEncoder().encode(basicCSV).buffer;
  
  const result = await parser.parse(fileData);
  if (result.data.length === 2 && result.data[0].columns[0] === '张三') {
    console.log('   ✅ 基本CSV解析');
    passed++;
  } else {
    console.log('   ❌ 基本CSV解析失败');
    failed++;
  }
  console.log('');
  
  // 测试套件2: 引号处理
  console.log('📋 测试套件: 引号处理');
  const quotedCSV = 'name,description\n"张三","a, b, c"\n"李四","x\ny"';
  const quotedData = new TextEncoder().encode(quotedCSV).buffer;
  const quotedResult = await parser.parse(quotedData);
  
  if (quotedResult.data[0].columns[1] === 'a, b, c') {
    console.log('   ✅ 引号处理 - 包含逗号的字段');
    passed++;
  } else {
    console.log('   ❌ 引号处理失败');
    failed++;
  }
  
  if (quotedResult.data[1].columns[1] === 'x\ny') {
    console.log('   ✅ 引号处理 - 包含换行符的字段');
    passed++;
  } else {
    console.log('   ❌ 引号处理失败');
    failed++;
  }
  console.log('');
  
  // 测试套件3: 分隔符
  console.log('📋 测试套件: 不同分隔符');
  
  const semicolonParser = new CSVParser({ delimeter: ';' });
  const semicolonCSV = 'name;age\n张三;25';
  const semicolonResult = await semicolonParser.parse(new TextEncoder().encode(semicolonCSV).buffer);
  
  if (semicolonResult.data[0].columns[0] === '张三') {
    console.log('   ✅ 分号分隔符');
    passed++;
  } else {
    console.log('   ❌ 分号分隔符失败');
    failed++;
  }
  
  const tabParser = new CSVParser({ delimeter: '\t' });
  const tabCSV = 'name\tage\n张三\t25';
  const tabResult = await tabParser.parse(new TextEncoder().encode(tabCSV).buffer);
  
  if (tabResult.data[0].columns[0] === '张三') {
    console.log('   ✅ 制表符分隔符');
    passed++;
  } else {
    console.log('   ❌ 制表符分隔符失败');
    failed++;
  }
  console.log('');
  
  // 测试套件4: 文件验证
  console.log('📋 测试套件: 文件验证');
  
  const validCSV = 'name,age\n张三,25';
  const validData = new TextEncoder().encode(validCSV).buffer;
  
  if (parser.validate(validData)) {
    console.log('   ✅ 有效CSV文件验证');
    passed++;
  } else {
    console.log('   ❌ 有效CSV文件验证失败');
    failed++;
  }
  
  const invalidData = new ArrayBuffer(100);
  if (!parser.validate(invalidData)) {
    console.log('   ✅ 无效文件验证');
    passed++;
  } else {
    console.log('   ❌ 无效文件验证失败');
    failed++;
  }
  console.log('');
  
  // 测试套件5: 元数据
  console.log('📋 测试套件: 元数据提取');
  
  const metadata = parser.getMetadata(validData);
  if (metadata.format === 'CSV' && metadata.estimatedRowCount >= 2) {
    console.log(`   ✅ 元数据提取 - ${metadata.format}, ${metadata.estimatedRowCount}行, ${metadata.estimatedColumnCount}列`);
    passed++;
  } else {
    console.log('   ❌ 元数据提取失败');
    failed++;
  }
  console.log('');
  
  console.log('========================================');
  console.log(`测试完成: ${passed}通过, ${failed}失败`);
  console.log('========================================\n');
  
  return { passed, failed };
}
