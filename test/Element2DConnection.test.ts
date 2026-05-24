import { describe, expect, it } from 'vitest'
import { Element2DConnection } from '../src'

// Element2DConnection.route() only needs the parent's `tree.getNodeById` and each
// endpoint node's `globalAabb` (center-anchor fallback), so it can be unit-tested
// with a lightweight mock parent.
function makeConnection(nodes: Record<string, any>): Element2DConnection {
  const parent = {
    tree: { getNodeById: (id: string) => nodes[id] },
    requestDraw: () => {},
  }
  return new Element2DConnection(parent as any)
}

const aabb = (x: number, y: number): any => ({ globalAabb: { min: { x, y }, size: { x: 10, y: 10 } } })

describe('element2DConnection route caching', () => {
  it('returns the same path instance while endpoints and mode are unchanged', () => {
    const nodes = { a: aabb(0, 0), b: aabb(100, 0) }
    const conn = makeConnection(nodes)
    conn.setProperties({ start: { id: 'a' }, end: { id: 'b' }, mode: 'straight' })

    const p1 = conn.route()
    expect(p1).toBeTruthy()
    expect(p1!.getLength()).toBeGreaterThan(0)
    expect(conn.route()).toBe(p1) // cached: same instance
  })

  it('re-routes when an endpoint moves', () => {
    const nodes = { a: aabb(0, 0), b: aabb(100, 0) }
    const conn = makeConnection(nodes)
    conn.setProperties({ start: { id: 'a' }, end: { id: 'b' }, mode: 'straight' })
    const p1 = conn.route()

    nodes.b.globalAabb.min.x = 300 // endpoint moved
    const p2 = conn.route()
    expect(p2).not.toBe(p1) // re-routed
  })

  it('re-routes when the mode changes', () => {
    const nodes = { a: aabb(0, 0), b: aabb(100, 100) }
    const conn = makeConnection(nodes)
    conn.setProperties({ start: { id: 'a' }, end: { id: 'b' }, mode: 'straight' })
    const p1 = conn.route()

    conn.mode = 'orthogonal'
    const p2 = conn.route()
    expect(p2).not.toBe(p1)
  })

  it('returns undefined when neither endpoint resolves', () => {
    const conn = makeConnection({})
    conn.setProperties({ start: { id: 'missing' }, mode: 'straight' })
    expect(conn.route()).toBeUndefined()
  })
})
