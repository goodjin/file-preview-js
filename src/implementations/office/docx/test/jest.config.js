/**
 * Jest配置文件 - docx子模块测试
 */
module.exports = {
  // 测试环境
  testEnvironment: 'jsdom',

  // 转换器配置
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },

  // 测试文件匹配模式
  testMatch: [
    '**/test/**/*.test.js'
  ],

  // 覆盖率配置
  collectCoverageFrom: [
    'src/implementations/office/docx/**/*.js',
    '!src/implementations/office/docx/**/*.test.js',
    '!src/implementations/office/docx/test/**',
    '!**/node_modules/**'
  ],

  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // 覆盖率报告格式
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],

  // 模块路径映射
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },

  // 测试超时时间（毫秒）
  testTimeout: 10000,

  // 是否在测试失败时停止
  bail: false,

  // 详细输出
  verbose: true,

  // 测试执行顺序
  testSequencer: '@jest/test-sequencer',

  // 清理模拟
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // 自动清除模拟
  clearMocks: true
};
