import { describe, expect, it } from 'vitest'
import { Transform2D } from 'modern-path2d'
import { Element2D } from '../src'

// _intersectsViewport compares the node's world-space globalAabb against the
// viewport's screen rect mapped back to world via canvasTransform. With an
// identity canvasTransform, world space == screen space.
function viewport(width: number, height: number): any {
  return { valid: true, width, height, canvasTransform: new Transform2D() }
}

function elementAt(x: number, y: number, w = 50, h = 50): Element2D {
  const el = new Element2D()
  el.position.set(x, y)
  el.size.set(w, h)
  el.updateGlobalTransform()
  return el
}

describe('element2D viewport culling', () => {
  it('intersects when inside the viewport', () => {
    const el = elementAt(100, 100)
    expect((el as any)._intersectsViewport(viewport(800, 600))).toBe(true)
  })

  it('does not intersect when far outside (beyond the margin)', () => {
    const el = elementAt(5000, 5000)
    expect((el as any)._intersectsViewport(viewport(800, 600))).toBe(false)
  })

  it('still intersects within the generous one-viewport margin', () => {
    // viewport spans x:0..800, margin = 800 → x up to ~1600 still counts as visible
    const el = elementAt(1000, 100)
    expect((el as any)._intersectsViewport(viewport(800, 600))).toBe(true)
  })

  it('does not cull when no viewport is available (conservative)', () => {
    const el = elementAt(5000, 5000)
    // _cullsRender falls back to false without a valid viewport
    expect(el.tree).toBeUndefined()
    expect((el as any)._cullsRender()).toBe(false)
  })
})
