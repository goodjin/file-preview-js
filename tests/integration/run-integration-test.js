/**
 * ImageAdapter与图片预览器集成测试工具
 * 通过代码分析和接口验证执行集成测试
 */

// 测试结果存储
const testResults = {
    jpg: [],
    png: [],
    gif: [],
    summary: {
        total: 0,
        passed: 0,
        failed: 0,
        passRate: 0
    }
};

// 性能数据
const performanceData = {
    parseTimes: [],
    renderTimes: [],
    loadTimes: []
};

/**
 * 测试工具类
 */
class IntegrationTestRunner {
    constructor() {
        this.startTime = Date.now();
        this.testCases = [];
    }

    /**
     * 运行测试用例
     * @param {string} testName - 测试名称
     * @param {Function} testFn - 测试函数
     * @param {string} category - 测试分类（jpg/png/gif）
     */
    async runTest(testName, testFn, category) {
        const startTime = performance.now();
        let result = {
            testName,
            passed: false,
            message: '',
            duration: 0,
            timestamp: Date.now()
        };

        try {
            const testResult = await testFn();
            result.passed = testResult.passed;
            result.message = testResult.message || '';
        } catch (error) {
            result.passed = false;
            result.message = `异常: ${error.message}`;
            console.error(`测试失败: ${testName}`, error);
        }

        result.duration = Math.round(performance.now() - startTime);
        testResults[category].push(result);
        this.logResult(result, category);
        
        return result;
    }

    /**
     * 记录测试结果
     */
    logResult(result, category) {
        const status = result.passed ? '✓ 通过' : '✗ 失败';
        const durationInfo = result.duration ? ` | 耗时: ${result.duration}ms` : '';
        console.log(`[${category.toUpperCase()}] ${result.testName}: ${status}${durationInfo}`);
        
        if (result.message) {
            console.log(`  └─ ${result.message}`);
        }
    }

    /**
     * 更新测试统计
     */
    updateStats() {
        const allResults = [
            ...testResults.jpg,
            ...testResults.png,
            ...testResults.gif
        ];

        testResults.summary.total = allResults.length;
        testResults.summary.passed = allResults.filter(r => r.passed).length;
        testResults.summary.failed = allResults.length - testResults.summary.passed;
        testResults.summary.passRate = testResults.summary.total > 0 
            ? ((testResults.summary.passed / testResults.summary.total) * 100).toFixed(1)
            : 0;
    }

    /**
     * 生成测试报告
     */
    generateReport() {
        this.updateStats();
        
        const report = {
            testPhase: 'P0阶段（jpg/png/gif格式）',
            testDate: new Date().toISOString(),
            summary: testResults.summary,
            performance: {
                averageParseTime: this.calculateAverage(performanceData.parseTimes),
                averageRenderTime: this.calculateAverage(performanceData.renderTimes),
                averageLoadTime: this.calculateAverage(performanceData.loadTimes)
            },
            results: testResults
        };

        return report;
    }

    /**
     * 计算平均值
     */
    calculateAverage(values) {
        if (values.length === 0) return 0;
        const sum = values.reduce((acc, val) => acc + val, 0);
        return Math.round(sum / values.length);
    }

    /**
     * 打印测试报告
     */
    printReport() {
        const report = this.generateReport();
        
        console.log('\n========================================');
        console.log('      集成测试报告');
        console.log('========================================');
        console.log(`测试阶段: ${report.testPhase}`);
        console.log(`测试时间: ${report.testDate}`);
        console.log('\n测试统计:');
        console.log(`  总测试数: ${report.summary.total}`);
        console.log(`  通过数: ${report.summary.passed}`);
        console.log(`  失败数: ${report.summary.failed}`);
        console.log(`  通过率: ${report.summary.passRate}%`);
        console.log('\n性能指标:');
        console.log(`  平均解析时间: ${report.performance.averageParseTime}ms`);
        console.log(`  平均渲染时间: ${report.performance.averageRenderTime}ms`);
        console.log(`  平均加载时间: ${report.performance.averageLoadTime}ms`);
        console.log('\n========================================');
        
        return report;
    }

    /**
     * 导出为Markdown报告
     */
    exportMarkdown() {
        const report = this.generateReport();
        
        let markdown = `# ImageAdapter与图片预览器集成测试报告\n\n`;
        markdown += `## 测试概要\n\n`;
        markdown += `- **测试阶段**: ${report.testPhase}\n`;
        markdown += `- **测试时间**: ${report.testDate}\n`;
        markdown += `- **总测试数**: ${report.summary.total}\n`;
        markdown += `- **通过数**: ${report.summary.passed}\n`;
        markdown += `- **失败数**: ${report.summary.failed}\n`;
        markdown += `- **通过率**: ${report.summary.passRate}%\n\n`;
        
        markdown += `## 性能指标\n\n`;
        markdown += `- **平均解析时间**: ${report.performance.averageParseTime}ms\n`;
        markdown += `- **平均渲染时间**: ${report.performance.averageRenderTime}ms\n`;
        markdown += `- **平均加载时间**: ${report.performance.averageLoadTime}ms\n\n`;
        
        // JPG测试结果
        markdown += `## JPG格式测试详情\n\n`;
        if (testResults.jpg.length === 0) {
            markdown += `暂无测试数据\n\n`;
        } else {
            testResults.jpg.forEach((result, index) => {
                const status = result.passed ? '✅' : '❌';
                markdown += `${index + 1}. ${status} **${result.testName}**\n`;
                markdown += `   - 状态: ${result.passed ? '通过' : '失败'}\n`;
                if (result.message) markdown += `   - 详情: ${result.message}\n`;
                if (result.duration) markdown += `   - 耗时: ${result.duration}ms\n`;
                markdown += `\n`;
            });
        }
        
        // PNG测试结果
        markdown += `## PNG格式测试详情\n\n`;
        if (testResults.png.length === 0) {
            markdown += `暂无测试数据\n\n`;
        } else {
            testResults.png.forEach((result, index) => {
                const status = result.passed ? '✅' : '❌';
                markdown += `${index + 1}. ${status} **${result.testName}**\n`;
                markdown += `   - 状态: ${result.passed ? '通过' : '失败'}\n`;
                if (result.message) markdown += `   - 详情: ${result.message}\n`;
                if (result.duration) markdown += `   - 耗时: ${result.duration}ms\n`;
                markdown += `\n`;
            });
        }
        
        // GIF测试结果
        markdown += `## GIF格式测试详情\n\n`;
        if (testResults.gif.length === 0) {
            markdown += `暂无测试数据\n\n`;
        } else {
            testResults.gif.forEach((result, index) => {
                const status = result.passed ? '✅' : '❌';
                markdown += `${index + 1}. ${status} **${result.testName}**\n`;
                markdown += `   - 状态: ${result.passed ? '通过' : '失败'}\n`;
                if (result.message) markdown += `   - 详情: ${result.message}\n`;
                if (result.duration) markdown += `   - 耗时: ${result.duration}ms\n`;
                markdown += `\n`;
            });
        }
        
        markdown += `## M4里程碑评估\n\n`;
        if (report.summary.passRate >= 90) {
            markdown += `✅ **通过** - P0阶段测试通过率达到90%以上，M4里程碑验收通过。\n\n`;
        } else if (report.summary.passRate >= 70) {
            markdown += `⚠️ **条件通过** - P0阶段测试通过率达到70%以上，但存在部分问题需要修复。\n\n`;
        } else {
            markdown += `❌ **不通过** - P0阶段测试通过率低于70%，M4里程碑验收不通过，需要重点修复。\n\n`;
        }
        
        markdown += `## 问题列表\n\n`;
        const allFailedResults = [
            ...testResults.jpg.filter(r => !r.passed),
            ...testResults.png.filter(r => !r.passed),
            ...testResults.gif.filter(r => !r.passed)
        ];
        
        if (allFailedResults.length === 0) {
            markdown += `暂无发现问题\n\n`;
        } else {
            allFailedResults.forEach((result, index) => {
                markdown += `${index + 1}. **${result.testName}**\n`;
                markdown += `   - 问题描述: ${result.message}\n`;
                markdown += `   - 优先级: 高\n`;
                markdown += `   - 状态: 待修复\n\n`;
            });
        }
        
        markdown += `---\n`;
        markdown += `*报告生成时间: ${new Date().toLocaleString('zh-CN')}*\n`;
        
        return markdown;
    }
}

// 导出测试运行器
export { IntegrationTestRunner, testResults, performanceData };
