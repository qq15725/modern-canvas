import { describe, expect, it } from 'vitest'
import { Timeline } from '../src'

describe('timeline.addTime', () => {
  it('does not degrade currentTime to NaN when startTime === endTime === 0 while looping (regression)', () => {
    const tl = new Timeline({ startTime: 0, endTime: 0, currentTime: 0, loop: true })
    tl.addTime(16)
    expect(Number.isFinite(tl.currentTime)).toBe(true)
    expect(tl.currentTime).toBe(0)
    // 多帧推进仍保持有限值（旧逻辑 current % 0 = NaN 会一路传染）
    for (let i = 0; i < 10; i++) {
      tl.addTime(16)
    }
    expect(Number.isFinite(tl.currentTime)).toBe(true)
  })

  it('loops within [start, end) when the range is positive', () => {
    const tl = new Timeline({ startTime: 0, endTime: 1000, currentTime: 900, loop: true })
    tl.addTime(250) // 1150 > 1000 → 回绕到 150
    expect(tl.currentTime).toBeCloseTo(150)
  })

  it('wraps relative to a non-zero startTime', () => {
    const tl = new Timeline({ startTime: 100, endTime: 600, currentTime: 550, loop: true })
    tl.addTime(100) // 650 > 600 → 100 + ((650-100) % 500) = 150
    expect(tl.currentTime).toBeCloseTo(150)
  })
})
