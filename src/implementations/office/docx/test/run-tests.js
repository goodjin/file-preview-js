#!/usr/bin/env node

/**
 * docx子模块测试运行脚本
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  log('\n' + '='.repeat(60), 'cyan');
  log(message, 'cyan');
  log('='.repeat(60), 'cyan');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

// 检查依赖是否安装
function checkDependencies() {
  logHeader('检查依赖');

  const packageJsonPath = path.join(__dirname, '../../../package.json');

  if (!fs.existsSync(packageJsonPath)) {
    logWarning('未找到package.json文件');
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const devDependencies = packageJson.devDependencies || {};

  const requiredDeps = ['jest'];
  let allInstalled = true;

  requiredDeps.forEach(dep => {
    if (!devDependencies[dep]) {
      logError(`缺少依赖: ${dep}`);
      allInstalled = false;
    } else {
      logSuccess(`依赖已安装: ${dep}`);
    }
  });

  return allInstalled;
}

// 运行测试
function runTests(args = []) {
  logHeader('运行测试');

  try {
    const jestPath = path.join(__dirname, '../../../node_modules/.bin/jest');
    const configPath = path.join(__dirname, 'jest.config.js');

    let command = `"${jestPath}" --config="${configPath}"`;

    if (args.length > 0) {
      command += ' ' + args.join(' ');
    }

    log(`执行命令: ${command}`, 'blue');
    console.log();

    execSync(command, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '../..')
    });

    logSuccess('测试完成\n');
    return true;
  } catch (error) {
    logError(`测试失败: ${error.message}\n`);
    return false;
  }
}

// 运行覆盖率测试
function runCoverage() {
  logHeader('运行覆盖率测试');

  const success = runTests(['--coverage']);

  if (success) {
    logSuccess('覆盖率报告已生成: coverage/\n');
  }

  return success;
}

// 运行特定测试文件
function runSpecificTest(testFile) {
  logHeader(`运行测试文件: ${testFile}`);

  const success = runTests([testFile]);
  return success;
}

// 显示帮助
function showHelp() {
  logHeader('测试脚本帮助');

  console.log(`
用法:
  node run-tests.js [选项]

选项:
  --help, -h          显示帮助信息
  --coverage, -c      运行覆盖率测试
  --watch, -w         监视模式
  --verbose, -v       详细输出
  <testFile>          运行特定测试文件

示例:
  node run-tests.js                   # 运行所有测试
  node run-tests.js --coverage        # 运行覆盖率测试
  node run-tests.js --watch           # 监视模式
  node run-tests.js DocxParser.test.js  # 运行特定测试
  node run-tests.js -c                # 简写：覆盖率测试

环境要求:
  - Node.js 12+
  - npm 包: jest, @jest/globals, jsdom, babel-jest
`);
}

// 主函数
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    process.exit(0);
  }

  // 检查依赖
  if (!checkDependencies()) {
    logError('依赖检查失败，请运行: npm install');
    process.exit(1);
  }

  // 解析参数
  const arg = args[0];

  if (arg === '--coverage' || arg === '-c') {
    const success = runCoverage();
    process.exit(success ? 0 : 1);
  } else if (arg === '--watch' || arg === '-w') {
    const success = runTests(['--watch']);
    process.exit(success ? 0 : 1);
  } else if (arg === '--verbose' || arg === '-v') {
    const success = runTests(['--verbose']);
    process.exit(success ? 0 : 1);
  } else if (arg.endsWith('.test.js')) {
    const success = runSpecificTest(arg);
    process.exit(success ? 0 : 1);
  } else {
    logError(`未知参数: ${arg}`);
    showHelp();
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  runTests,
  runCoverage,
  checkDependencies
};
