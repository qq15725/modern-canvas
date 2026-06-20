import { describe, expect, it } from 'vitest'
import { Animation } from '../src'

function parse(easing: string): (amount: number) => number {
  // _parseEasing 是 protected，测试里通过 any 访问
  return (new Animation() as any)._parseEasing(easing)
}

describe('animation._parseEasing', () => {
  it('only CSS preset names and cubic-bezier() are accepted; camelCase names fall back to linear', () => {
    // 'linear' / 'ease' 是 CSS 关键字，仍有效
    expect(parse('linear')(0.3)).toBeCloseTo(0.3, 4)
    // 驼峰写法不再特殊识别，兜底为 linear（输入即输出）
    expect(parse('easeOut')(0.3)).toBeCloseTo(0.3, 4)
    expect(parse('easeInOut')(0.7)).toBeCloseTo(0.7, 4)
  })

  it('css hyphenated preset names resolve to real curves (regression: "ease-out" used to parse to NaN)', () => {
    for (const easing of [
      'ease-in',
      'ease-out',
      'ease-in-out',
      'ease-in-quad',
      'ease-out-quad',
      'ease-in-out-quad',
      'ease-in-cubic',
      'ease-out-cubic',
      'ease-in-out-cubic',
    ]) {
      const fn = parse(easing)
      // 端点 0/1，全程不产出 NaN
      expect(fn(0)).toBeCloseTo(0, 5)
      expect(fn(1)).toBeCloseTo(1, 5)
      for (const t of [0, 0.25, 0.5, 0.75, 1]) {
        expect(Number.isNaN(fn(t))).toBe(false)
      }
    }
    // ease-out 应是缓出曲线（前段快），中点进度 > 0.5，区别于 linear
    expect(parse('ease-out')(0.5)).toBeGreaterThan(0.5)
  })

  it('unknown / malformed easing falls back to linear instead of NaN', () => {
    for (const easing of ['not-an-easing', 'cubic-bezier(foo)', '']) {
      const fn = parse(easing)
      for (const t of [0, 0.3, 0.7, 1]) {
        expect(Number.isNaN(fn(t))).toBe(false)
      }
      expect(fn(0.3)).toBeCloseTo(0.3, 5)
    }
  })

  it('custom cubic-bezier() curves work, including overshoot (y outside 0..1)', () => {
    const fn = parse('cubic-bezier(0.42, 0, 0.58, 1)')
    expect(fn(0)).toBeCloseTo(0, 5)
    expect(fn(1)).toBeCloseTo(1, 5)
    expect(fn(0.5)).toBeCloseTo(0.5, 2) // 对称曲线，中点 ≈ 0.5

    // back/过冲曲线：控制点 y 超出 [0,1]，端点仍精确、全程非 NaN
    const back = parse('cubic-bezier(0.68, -0.55, 0.265, 1.55)')
    expect(back(0)).toBeCloseTo(0, 5)
    expect(back(1)).toBeCloseTo(1, 5)
    for (const t of [0, 0.2, 0.5, 0.8, 1]) {
      expect(Number.isNaN(back(t))).toBe(false)
    }
    // 不是被当成 linear 兜底：中点应明显偏离 0.5
    expect(Math.abs(back(0.5) - 0.5)).toBeGreaterThan(0.05)
  })
})
