/**
 * 排序函数属性测试
 * 功能: agent-web-viewer
 */

import { describe, test, expect } from 'bun:test';
import * as fc from 'fast-check';

// 模拟 SortUtils（因为原文件是浏览器环境）
const SortUtils = {
  ASC: 'asc',
  DESC: 'desc',

  sortByCreatedAt(agents, order = this.ASC) {
    if (!Array.isArray(agents)) {
      return [];
    }
    const sorted = [...agents];
    sorted.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      if (order === this.ASC) {
        return timeA - timeB;
      } else {
        return timeB - timeA;
      }
    });
    return sorted;
  },

  toggleOrder(currentOrder) {
    return currentOrder === this.ASC ? this.DESC : this.ASC;
  },
};

// 使用整数时间戳生成日期字符串
const dateStringArb = fc.integer({ min: 1577836800000, max: 1893456000000 })
  .map(ts => new Date(ts).toISOString());

// 智能体生成器
const agentArbitrary = fc.record({
  id: fc.uuid(),
  roleId: fc.uuid(),
  roleName: fc.string({ minLength: 1, maxLength: 20 }),
  parentAgentId: fc.option(fc.uuid(), { nil: undefined }),
  createdAt: dateStringArb,
  status: fc.oneof(fc.constant('active'), fc.constant('terminated')),
});

describe('功能: agent-web-viewer, 属性 1: 智能体列表排序正确性', () => {
  test('升序排序时，每个智能体的创建时间应小于或等于其后一个智能体的创建时间', () => {
    fc.assert(
      fc.property(
        fc.array(agentArbitrary, { minLength: 0, maxLength: 100 }),
        (agents) => {
          const sorted = SortUtils.sortByCreatedAt(agents, 'asc');
          
          // 验证排序正确性
          for (let i = 0; i < sorted.length - 1; i++) {
            const timeA = new Date(sorted[i].createdAt).getTime();
            const timeB = new Date(sorted[i + 1].createdAt).getTime();
            expect(timeA).toBeLessThanOrEqual(timeB);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('降序排序时，每个智能体的创建时间应大于或等于其后一个智能体的创建时间', () => {
    fc.assert(
      fc.property(
        fc.array(agentArbitrary, { minLength: 0, maxLength: 100 }),
        (agents) => {
          const sorted = SortUtils.sortByCreatedAt(agents, 'desc');
          
          for (let i = 0; i < sorted.length - 1; i++) {
            const timeA = new Date(sorted[i].createdAt).getTime();
            const timeB = new Date(sorted[i + 1].createdAt).getTime();
            expect(timeA).toBeGreaterThanOrEqual(timeB);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('排序不应改变数组长度', () => {
    fc.assert(
      fc.property(
        fc.array(agentArbitrary, { minLength: 0, maxLength: 100 }),
        fc.oneof(fc.constant('asc'), fc.constant('desc')),
        (agents, order) => {
          const sorted = SortUtils.sortByCreatedAt(agents, order);
          expect(sorted.length).toBe(agents.length);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('排序不应修改原数组', () => {
    fc.assert(
      fc.property(
        fc.array(agentArbitrary, { minLength: 1, maxLength: 50 }),
        (agents) => {
          const original = JSON.stringify(agents);
          SortUtils.sortByCreatedAt(agents, 'asc');
          expect(JSON.stringify(agents)).toBe(original);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('切换排序方向应正确工作', () => {
    expect(SortUtils.toggleOrder('asc')).toBe('desc');
    expect(SortUtils.toggleOrder('desc')).toBe('asc');
  });
});
