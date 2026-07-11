import { describe, expect, it } from 'vitest'
import { CanvasContext, encodeFlowSpeed, FLAG_STROKE_AA } from '../src'

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

// Plain-color strokes repurpose the UV channel for arc-length (flow effects +
// screen-space feathering) — their 1×1 ColorTexture ignores UV anyway. The
// per-draw triangulation cache must survive color-only redraws, including the
// uv arrays, or every hover restyle would re-tessellate.
describe('canvasContext stroke arc-length uvs', () => {
  function strokeOnce(ctx: CanvasContext, color = '#ff0000', flow?: number): any {
    ctx.moveTo(0, 0)
    ctx.lineTo(100, 0)
    ctx.lineTo(100, 100)
    ctx.strokeStyle = color
    ctx.lineWidth = 4
    ctx.lineFlow = flow
    ctx.stroke()
    return ctx.toBatchables()[0]
  }

  it('emits meshUvs + the stroke-AA effect flag for plain-color strokes', () => {
    const b = strokeOnce(new CanvasContext())
    expect(b.meshUvs).toBeInstanceOf(Float32Array)
    expect(b.meshUvs!.length).toBe(b.vertices.length)
    expect(b.effectFlags).toBe(FLAG_STROKE_AA)
    expect(b.effectParam).toBe(0)
  })

  it('carries the flow speed through without affecting the cache identity', () => {
    const ctx = new CanvasContext()
    const a = strokeOnce(ctx, '#ff0000', 1)
    ctx.reset()
    const b = strokeOnce(ctx, '#00ff00', 2)
    // same geometry: triangulation (and uvs) reused by identity, speed re-read
    expect(b.vertices).toBe(a.vertices)
    expect(b.meshUvs).toBe(a.meshUvs)
    expect(a.effectParam).toBe(encodeFlowSpeed(1))
    expect(b.effectParam).toBe(encodeFlowSpeed(2))
    // flow strokes render their own core AA — the feather flag must be off
    expect(a.effectFlags).toBe(0)
  })

  it('re-triangulates when the geometry actually changes', () => {
    const ctx = new CanvasContext()
    const a = strokeOnce(ctx)
    ctx.reset()
    ctx.moveTo(0, 0)
    ctx.lineTo(200, 0)
    ctx.strokeStyle = '#ff0000'
    ctx.lineWidth = 4
    ctx.stroke()
    const b = ctx.toBatchables()[0]
    expect(b.vertices).not.toBe(a.vertices)
  })

  it('fills keep position-derived uvs (no meshUvs, no effect channels)', () => {
    const ctx = new CanvasContext()
    ctx.rect(0, 0, 10, 10)
    ctx.fillStyle = '#ff0000'
    ctx.fill()
    const b = ctx.toBatchables()[0] as any
    expect(b.meshUvs).toBeUndefined()
    expect(b.effectFlags).toBeFalsy()
    expect(b.effectParam).toBeFalsy()
  })
})
