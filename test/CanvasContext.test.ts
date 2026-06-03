import { describe, expect, it } from 'vitest'
import { CanvasContext } from '../src'

// CanvasContext mirrors HTMLCanvas's 2D state for the WebGL batcher. The
// `fillRule` plumbing in particular is needed so SVG `<path fill-rule="evenodd">`
// reaches modern-path2d's triangulation — without it, the captured FillDraw's
// Path2D would carry no fillRule and the engine falls back to nonzero.

function draws(ctx: CanvasContext): any[] {
  return (ctx as any)._draws
}

describe('canvasContext fillRule plumbing', () => {
  it('writes the transient fillRule onto the captured fill path', () => {
    const ctx = new CanvasContext()
    ctx.rect(0, 0, 10, 10)
    ctx.fillRule = 'evenodd'
    ctx.fill()
    const path = draws(ctx)[0].path
    expect(path.style.fillRule).toBe('evenodd')
  })

  it('falls back to the ctx.style.fillRule when no transient is set', () => {
    const ctx = new CanvasContext()
    ctx.rect(0, 0, 10, 10)
    ctx.style.fillRule = 'evenodd'
    ctx.fill()
    const path = draws(ctx)[0].path
    expect(path.style.fillRule).toBe('evenodd')
  })

  it('leaves the captured fillRule undefined when neither source set it', () => {
    const ctx = new CanvasContext()
    ctx.rect(0, 0, 10, 10)
    ctx.fill()
    const path = draws(ctx)[0].path
    expect(path.style.fillRule).toBeUndefined()
  })

  it('clears the transient fillRule when resetStatus runs', () => {
    const ctx = new CanvasContext()
    ctx.fillRule = 'evenodd'
    ctx.resetStatus()
    expect(ctx.fillRule).toBeUndefined()
  })

  it('copies the transient fillRule via copyFrom', () => {
    const src = new CanvasContext()
    src.fillRule = 'evenodd'
    const dst = new CanvasContext()
    dst.copyFrom(src)
    expect(dst.fillRule).toBe('evenodd')
  })
})
