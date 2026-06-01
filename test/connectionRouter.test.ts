import type { ConnectionEndpoint } from '../src'
import { describe, expect, it } from 'vitest'
import { routeConnection } from '../src'

// Flatten the routed Path2D back into its polyline points.
function points(path: any): { x: number, y: number }[] {
  const segs = path.curves[0].curves as { p1: any, p2: any }[]
  return [segs[0].p1, ...segs.map(s => s.p2)]
}

// Unit direction of each non-zero segment.
function segDirs(pts: { x: number, y: number }[]): { x: number, y: number }[] {
  const dirs: { x: number, y: number }[] = []
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x
    const dy = pts[i].y - pts[i - 1].y
    const len = Math.hypot(dx, dy)
    if (len > 1e-6)
      dirs.push({ x: dx / len, y: dy / len })
  }
  return dirs
}

// A clean orthogonal route never reverses: consecutive segments are either
// perpendicular or collinear in the same direction, never head-on (dot === -1).
function assertNoBacktrack(pts: { x: number, y: number }[]): void {
  const dirs = segDirs(pts)
  for (let i = 1; i < dirs.length; i++) {
    const dot = dirs[i].x * dirs[i - 1].x + dirs[i].y * dirs[i - 1].y
    expect(dot, `segment ${i} reverses over ${i - 1}`).toBeGreaterThan(-0.5)
  }
}

function ep(x: number, y: number, dx: number, dy: number): ConnectionEndpoint {
  return { point: { x, y }, dir: { x: dx, y: dy } }
}

describe('orthogonal connection routing', () => {
  it('routes a forward facing pair as a clean Z', () => {
    // start right anchor -> end left anchor, end to the right
    const path = routeConnection('orthogonal', ep(0, 0, 1, 0), ep(200, 40, -1, 0))
    const pts = points(path)
    expect(pts[0]).toMatchObject({ x: 0, y: 0 })
    expect(pts.at(-1)).toMatchObject({ x: 200, y: 40 })
    assertNoBacktrack(pts)
  })

  it('does not double back when anchors face away (reverse direction)', () => {
    // the reported bug: start LEFT anchor, end RIGHT anchor, end stacked below.
    // both stubs point outward, away from each other.
    const path = routeConnection('orthogonal', ep(0, 0, -1, 0), ep(40, 300, 1, 0))
    const pts = points(path)

    // leaves the start heading left along its stub, then turns off-axis rather
    // than reversing straight back to the right (the old midpoint Z bug)
    expect(pts[1].x).toBeLessThan(pts[0].x)
    assertNoBacktrack(pts)
  })

  it('does not double back for two same-direction horizontal anchors', () => {
    // both right anchors, target behind the source
    const path = routeConnection('orthogonal', ep(0, 0, 1, 0), ep(-200, 120, 1, 0))
    assertNoBacktrack(points(path))
  })

  it('does not double back for vertical anchors facing away', () => {
    // start bottom anchor (down), end top anchor (up), but end is ABOVE start
    const path = routeConnection('orthogonal', ep(0, 0, 0, 1), ep(40, -300, 0, -1))
    assertNoBacktrack(points(path))
  })

  it('routes a perpendicular (mixed-axis) pair without reversing', () => {
    // start right anchor, end top anchor, end up-and-right
    const path = routeConnection('orthogonal', ep(0, 0, 1, 0), ep(200, -200, 0, -1))
    const pts = points(path)
    expect(pts.at(-1)).toMatchObject({ x: 200, y: -200 })
    assertNoBacktrack(pts)
  })

  it('handles a mixed-axis pair where the target sits behind the horizontal stub', () => {
    // start right anchor, end bottom anchor, end below-and-LEFT of start
    const path = routeConnection('orthogonal', ep(0, 0, 1, 0), ep(-200, 200, 0, 1))
    assertNoBacktrack(points(path))
  })

  it('loops around when same-direction anchors are exactly collinear', () => {
    // both right anchors on the same y, end to the LEFT — without the collinear
    // guard the perpendicular split would degenerate to a flat backtrack
    const path = routeConnection('orthogonal', ep(0, 0, 1, 0), ep(-200, 0, 1, 0))
    const pts = points(path)
    assertNoBacktrack(pts)
    // the route must leave its straight axis at some point (otherwise it is the
    // degenerate flat backtrack the guard exists to prevent)
    const ys = pts.map(p => p.y)
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(0)
  })

  it('does not let curved overshoot when anchors face away from the target', () => {
    // reverse direction: start LEFT anchor, end RIGHT anchor, target offset below
    // (the orange swoop in the original bug screenshot). Old code pushed the
    // control points along the anchor directions by ~dist*0.4, looping the curve
    // far past the source/target. Aligned scaling must keep the swing reasonable.
    const path = routeConnection('curved', ep(0, 0, -1, 0), ep(40, 300, 1, 0))
    const pts = points(path)
    const dist = Math.hypot(40, 300)
    const minX = Math.min(...pts.map(p => p.x))
    const maxX = Math.max(...pts.map(p => p.x))
    // curve may extend somewhat outside the s-e x range, but well under the old
    // ~dist*0.4 overshoot on each side
    expect(minX).toBeGreaterThan(-dist * 0.25)
    expect(maxX).toBeLessThan(40 + dist * 0.25)
  })

  it('loops around when same-direction vertical anchors are exactly collinear', () => {
    const path = routeConnection('orthogonal', ep(0, 0, 0, 1), ep(0, -200, 0, 1))
    const pts = points(path)
    assertNoBacktrack(pts)
    const xs = pts.map(p => p.x)
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0)
  })

  it('routes around endpoint bboxes instead of cutting through them', () => {
    // Two same-direction anchors (both right-facing) with the target laid to
    // the LEFT of the source — the non-facing perpendicular split kicks in
    // here. Without bbox awareness the connecting segment runs straight across
    // the source body at the anchor's y.
    const start = {
      point: { x: 100, y: 50 },
      dir: { x: 1, y: 0 },
      bbox: { min: { x: 0, y: 0 }, size: { x: 100, y: 100 } },
    }
    const end = {
      point: { x: -100, y: 50 },
      dir: { x: 1, y: 0 },
      bbox: { min: { x: -200, y: 0 }, size: { x: 100, y: 100 } },
    }
    const path = routeConnection('orthogonal', start, end)
    const pts = points(path)
    assertNoBacktrack(pts)
    // the perpendicular run sits at some midY; that midY must clear the source
    // box's y-band so the segment doesn't cut through it
    const inner = pts.slice(2, -2) // drop anchor + stub points on either side
    for (const p of inner) {
      expect(p.y <= 0 || p.y >= 100, `inner point at y=${p.y} is inside the source box`).toBe(true)
    }
  })
})
