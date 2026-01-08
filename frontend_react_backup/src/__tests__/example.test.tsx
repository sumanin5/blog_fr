/**
 * ✂️ 示例单元测试
 *
 * 这是一个真实的单元测试示例（精简版）。
 *
 * 注意：这里只是演示。实际项目中应该：
 * - src/__tests__/pages/auth/ → 集成测试（如 Login.integration.test.tsx）
 * - src/__tests__/hooks/ → Hook 单元测试
 * - src/__tests__/lib/ → 工具函数单元测试
 */

import { describe, it, expect } from "vitest";

/**
 * 真实的单元测试例子：测试一个纯函数
 * 单元测试应该是：小、快、独立
 */
describe("单位测试示例 - 纯函数", () => {
  // 示例函数
  function sum(a: number, b: number): number {
    return a + b;
  }

  it("应该正确计算两个正数的和", () => {
    expect(sum(1, 2)).toBe(3);
  });

  it("应该处理负数", () => {
    expect(sum(-1, 2)).toBe(1);
  });

  it("应该处理零", () => {
    expect(sum(0, 0)).toBe(0);
  });
});
