/**
 * xlsx子模块测试运行器
 * 运行所有单元测试
 */

import { runXlsxParserTests } from './XlsxParser.test.js';
import { runXlsxRendererTests } from './XlsxRenderer.test.js';
import { runXlsxModuleTests } from './index.test.js';

/**
 * 运行所有测试
 * @returns {Promise<Object>} 测试结果汇总
 */
export async function runAllTests() {
  console.log('========================================');
  console.log('   xlsx子模块单元测试套件');
  console.log('========================================\n');

  let totalPassed = 0;
  let totalFailed = 0;
  const results = [];

  // 运行解析器测试
  console.log('【第1组】XlsxParser 测试');
  console.log('----------------------------------------\n');
  const parserResult = await runXlsxParserTests();
  results.push({ name: 'XlsxParser', ...parserResult });
  totalPassed += parserResult.passed;
  totalFailed += parserResult.failed;

  // 运行渲染器测试
  console.log('\n【第2组】XlsxRenderer 测试');
  console.log('----------------------------------------\n');
  const rendererResult = await runXlsxRendererTests();
  results.push({ name: 'XlsxRenderer', ...rendererResult });
  totalPassed += rendererResult.passed;
  totalFailed += rendererResult.failed;

  // 运行模块测试
  console.log('\n【第3组】XlsxModule 测试');
  console.log('----------------------------------------\n');
  const moduleResult = await runXlsxModuleTests();
  results.push({ name: 'XlsxModule', ...moduleResult });
  totalPassed += moduleResult.passed;
  totalFailed += moduleResult.failed;

  // 输出汇总
  console.log('\n========================================');
  console.log('   测试结果汇总');
  console.log('========================================\n');
  
  console.log(`总测试数: ${totalPassed + totalFailed}`);
  console.log(`✅ 通过: ${totalPassed}`);
  console.log(`❌ 失败: ${totalFailed}`);
  console.log(`通过率: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(2)}%\n`);

  // 详细结果
  console.log('详细结果:');
  console.log('----------------------------------------');
  results.forEach(result => {
    console.log(`${result.name}: ${result.passed} 通过, ${result.failed} 失败`);
  });
  console.log('========================================\n');

  return {
    totalPassed,
    totalFailed,
    total: totalPassed + totalFailed,
    passRate: ((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(2),
    results
  };
}

// 如果直接运行此文件
if (typeof window === 'undefined') {
  runAllTests().then(result => {
    const exitCode = result.totalFailed > 0 ? 1 : 0;
    console.log(`\n测试${exitCode === 0 ? '全部通过' : '存在失败'}，退出码: ${exitCode}`);
    process.exit(exitCode);
  }).catch(error => {
    console.error('测试运行出错:', error);
    process.exit(1);
  });
}
