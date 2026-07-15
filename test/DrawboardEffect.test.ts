import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DrawboardEffect, QuadUvGeometry } from '../src'

// DrawboardEffect.apply only touches a small slice of the renderer API:
// shader.uniforms.viewMatrix (read-only), texture.unbind, source.redraw, and the
// quad draw call. Mocking those lets us assert the uniforms it ships without
// needing a real GL context.
function makeRenderer(): any {
  return {
    shader: { uniforms: { viewMatrix: [1, 0, 0, 0, 1, 0, 0, 0, 1] } },
    texture: { unbind: vi.fn() },
  }
}

function makeSource(): any {
  return {
    width: 800,
    height: 600,
    redraw: (_renderer: any, cb: () => void) => cb(),
  }
}

function uniformsAfterApply(effect: DrawboardEffect): Record<string, any> {
  const spy = vi.spyOn(QuadUvGeometry, 'draw').mockImplementation(() => {})
  try {
    effect.apply(makeRenderer(), makeSource())
    return spy.mock.calls[0][2] as Record<string, any>
  }
  finally {
    spy.mockRestore()
  }
}

describe('drawboardEffect uniforms', () => {
  it('maps each checkerboard style to its shader constant', () => {
    // 明暗不再进枚举，family 只有 grid / dot。
    const styles = { grid: 1, dot: 2 } as const
    for (const [style, code] of Object.entries(styles)) {
      const e = new DrawboardEffect({ checkerboard: true, checkerboardStyle: style as any })
      expect(uniformsAfterApply(e).checkerboardStyle).toBe(code)
    }
  })

  it('falls back to 0 when checkerboard is disabled (shader skips the branch)', () => {
    const e = new DrawboardEffect({ checkerboard: false })
    expect(uniformsAfterApply(e).checkerboard).toBe(0)
  })

  it('ships checkerboard colours as RGB (0..1) vec3 from the colour props', () => {
    const u = uniformsAfterApply(new DrawboardEffect({
      checkerboardColor: '#ffffff',
      checkerboardDotColor: '#000000',
    }))
    expect(u.checkerboardColor).toEqual([1, 1, 1])
    expect(u.checkerboardDotColor).toEqual([0, 0, 0])
  })

  it('resolves dark colours the same way (no baked style variant)', () => {
    const u = uniformsAfterApply(new DrawboardEffect({
      checkerboardStyle: 'dot',
      checkerboardColor: '#141414',
      checkerboardDotColor: '#505050',
      dotColorDiff: 0.05,
    }))
    expect(u.checkerboardColor[0]).toBeCloseTo(0x14 / 255, 2)
    expect(u.checkerboardDotColor[0]).toBeCloseTo(0x50 / 255, 2)
    expect(u.dotColorDiff).toBe(0.05)
  })
})

describe('drawboardEffect re-render triggers', () => {
  let effect: DrawboardEffect

  beforeEach(() => {
    effect = new DrawboardEffect({ checkerboardStyle: 'grid' })
  })

  function expectTriggers(prop: keyof DrawboardEffect, next: any): void {
    const spy = vi.spyOn(effect, 'requestRender')
    ;(effect as any)[prop] = next
    expect(spy, `setting ${String(prop)} did not request a re-render`).toHaveBeenCalled()
    spy.mockRestore()
  }

  it('requests a re-render when shader-driving properties change', () => {
    expectTriggers('checkerboard', true)
    expectTriggers('checkerboardStyle', 'dot')
    expectTriggers('pixelGrid', true)
    expectTriggers('checkerboardColor', '#123456')
    expectTriggers('checkerboardDotColor', '#654321')
    expectTriggers('dotColorDiff', 0.2)
  })
})
