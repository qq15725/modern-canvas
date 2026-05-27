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
})
