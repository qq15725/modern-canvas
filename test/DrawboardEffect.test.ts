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
    const styles = { grid: 1, gridDark: 2, dot: 3, dotDark: 4 } as const
    for (const [style, code] of Object.entries(styles)) {
      const e = new DrawboardEffect({ checkerboard: true, checkerboardStyle: style as any })
      expect(uniformsAfterApply(e).checkerboardStyle).toBe(code)
    }
  })

  it('falls back to 0 when checkerboard is disabled (shader skips the branch)', () => {
    const e = new DrawboardEffect({ checkerboard: false })
    expect(uniformsAfterApply(e).checkerboard).toBe(0)
  })

  it('passes light dot colours by default and dark colours under dotDark', () => {
    const light = uniformsAfterApply(new DrawboardEffect({ checkerboardStyle: 'dot' }))
    const dark = uniformsAfterApply(new DrawboardEffect({ checkerboardStyle: 'dotDark' }))
    expect(light.dotBackgroundBaseColor).toBeGreaterThan(0.9)
    expect(dark.dotBackgroundBaseColor).toBeLessThan(0.2)
    expect(dark.dotBackgroundZoomedOutColor).toBeGreaterThan(light.dotBackgroundBaseColor - 0.7)
    expect(dark.dotBackgroundBaseColor).not.toBe(light.dotBackgroundBaseColor)
  })

  it('lets explicit dot colour props override the style preset', () => {
    const e = new DrawboardEffect({
      checkerboardStyle: 'dot',
      dotBaseColor: 0.2,
      dotColor: 0.8,
      dotZoomDiff: 0.05,
    })
    const u = uniformsAfterApply(e)
    expect(u.dotBackgroundBaseColor).toBe(0.2)
    expect(u.dotBackgroundZoomedOutColor).toBe(0.8)
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
    expectTriggers('checkerboardStyle', 'dotDark')
    expectTriggers('pixelGrid', true)
    expectTriggers('dotBaseColor', 0.5)
    expectTriggers('dotColor', 0.4)
    expectTriggers('dotZoomDiff', 0.2)
  })
})
