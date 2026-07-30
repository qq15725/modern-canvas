import { describe, expect, it } from 'vitest'
import { Aabb2D } from '../src'

describe('aabb2D', () => {
  it('keeps min/size/max mirrored', () => {
    const box = new Aabb2D(10, 20, 30, 40)
    expect([box.max.x, box.max.y]).toEqual([40, 60])

    box.min.set(0, 0)
    expect([box.max.x, box.max.y]).toEqual([30, 40])

    box.max.set(100, 100)
    expect([box.size.x, box.size.y]).toEqual([100, 100])
  })

  // A NaN never equals itself, so Vector2.set's "skip when unchanged" guard stops
  // working and _updateMax ⇄ _updateSize bounce off each other until the stack blows.
  // That took down the render loop (and with it the WebGL context) in production.
  it('does not blow the stack when a non-finite value is assigned', () => {
    const box = new Aabb2D(0, 0, 10, 10)

    expect(() => {
      box.min.x = Number.NaN
    }).not.toThrow()
    expect(Number.isFinite(box.max.x)).toBe(true)

    expect(() => {
      box.size.y = Number.NaN
    }).not.toThrow()
    expect(Number.isFinite(box.max.y)).toBe(true)

    expect(() => {
      box.max.set(Number.NaN, Number.POSITIVE_INFINITY)
    }).not.toThrow()
    expect(Number.isFinite(box.size.x)).toBe(true)
    expect(Number.isFinite(box.size.y)).toBe(true)
  })
})
