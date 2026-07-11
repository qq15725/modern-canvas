import { describe, expect, it, vi } from 'vitest'
import { bumpGeometryRevision, Element2DConnection } from '../src'

// The mocks below stand in for real scene objects, which bump the revision from
// `Element2D._updateGlobalAabb` (moves), `Element2DShape` (anchors) and `SceneTree`
// (nodeEnter/nodeExit) — see geometryRevision.test.ts. Here we say so by hand.
function moved(): void {
  bumpGeometryRevision()
}

function leftTree(nodes: Record<string, any>, ...ids: string[]): void {
  ids.forEach(id => delete nodes[id])
  bumpGeometryRevision() // SceneTree does this on 'nodeExit'
}

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
    moved()
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

// A fuller stand-in: route() is called every frame from Element2D._process, so the
// no-op path must not touch the endpoints at all.
function anchored(x: number, y: number): any {
  return {
    transformDirtyId: 0,
    size: { x: 10, y: 10 },
    globalRotation: 0,
    globalTransform: { apply: (v: any) => ({ x: x + v.x, y: y + v.y }) },
    globalAabb: { min: { x, y }, size: { x: 10, y: 10 } },
    shape: {
      connectionPointsDirtyId: 0,
      connectionPoints: [{ idx: 0, x: 0, y: 0.5 }, { idx: 1, x: 1, y: 0.5 }],
    },
  }
}

describe('element2DConnection route invalidation', () => {
  function connected(nodes: Record<string, any>): Element2DConnection {
    const conn = makeConnection(nodes)
    conn.setProperties({ start: { id: 'a', idx: 1 }, end: { id: 'b', idx: 0 }, mode: 'straight' })
    conn.route()
    return conn
  }

  it('touches nothing while the scene is still', () => {
    const conn = connected({ a: anchored(0, 0), b: anchored(100, 0) })
    const resolve = vi.spyOn(conn, 'resolveEndpoint')
    const lookup = vi.spyOn(conn as any, '_resolveTarget')
    const path = conn.route()
    expect(resolve).not.toHaveBeenCalled()
    expect(lookup).not.toHaveBeenCalled() // gate 1: not even a node lookup
    expect(conn.route()).toBe(path)
  })

  // Something moved, but not our endpoints: gate 1 misses, gate 2 catches it.
  it('resolves no endpoint when an unrelated element moves', () => {
    const conn = connected({ a: anchored(0, 0), b: anchored(100, 0) })
    const resolve = vi.spyOn(conn, 'resolveEndpoint')
    moved()
    conn.route()
    expect(resolve).not.toHaveBeenCalled()
  })

  it('re-resolves when the target transform revision bumps', () => {
    const nodes = { a: anchored(0, 0), b: anchored(100, 0) }
    const conn = connected(nodes)
    const resolve = vi.spyOn(conn, 'resolveEndpoint')
    nodes.b.transformDirtyId++
    moved()
    conn.route()
    expect(resolve).toHaveBeenCalled()
  })

  it('re-resolves when the target replaces its connection points', () => {
    const nodes = { a: anchored(0, 0), b: anchored(100, 0) }
    const conn = connected(nodes)
    const resolve = vi.spyOn(conn, 'resolveEndpoint')
    nodes.b.shape.connectionPointsDirtyId++
    moved() // Element2DShape bumps this from its property setter
    conn.route()
    expect(resolve).toHaveBeenCalled()
  })

  // `start.idx = 0` never goes through the property setter, and moves nothing.
  it('re-routes when an anchor is mutated in place', () => {
    const conn = connected({ a: anchored(0, 0), b: anchored(100, 0) })
    const before = conn.route()
    conn.start!.idx = 0
    const after = conn.route()
    expect(after).not.toBe(before)
  })

  // Removing a node changes no geometry — the revision has to move anyway, or the
  // connection keeps serving a path routed to a node that is no longer in the tree.
  it('drops the route when both targets leave the tree', () => {
    const nodes: Record<string, any> = { a: anchored(0, 0), b: anchored(100, 0) }
    const conn = connected(nodes)
    expect(conn.route()).toBeTruthy()
    leftTree(nodes, 'a', 'b')
    expect(conn.route()).toBeUndefined()
  })

  it('re-routes when one target leaves the tree', () => {
    const nodes: Record<string, any> = { a: anchored(0, 0), b: anchored(100, 0) }
    const conn = connected(nodes)
    const before = conn.route()
    leftTree(nodes, 'b')
    expect(conn.route()).not.toBe(before)
  })

  // isValid answers "is this a connection", isRoutable answers "can it be routed now".
  // Conflating them would make a dangling line look like an ordinary element to the
  // host (marquee selection, cascade delete, hit-testing all key off isValid).
  it('stays valid but unroutable once its targets are gone', () => {
    const nodes: Record<string, any> = { a: anchored(0, 0), b: anchored(100, 0) }
    const conn = connected(nodes)
    expect(conn.isValid()).toBe(true)
    expect(conn.isRoutable()).toBe(true)

    leftTree(nodes, 'a', 'b')
    expect(conn.isValid()).toBe(true)
    expect(conn.isRoutable()).toBe(false)
  })

  it('is routable while one end survives', () => {
    const nodes: Record<string, any> = { a: anchored(0, 0), b: anchored(100, 0) }
    const conn = connected(nodes)
    leftTree(nodes, 'b')
    expect(conn.isRoutable()).toBe(true)
  })

  // isRoutable() runs every frame right before route() — it must not re-walk the tree.
  it('resolves targets once per revision across isRoutable + route', () => {
    const nodes = { a: anchored(0, 0), b: anchored(100, 0) }
    const conn = connected(nodes)
    const lookup = vi.spyOn(conn as any, '_resolveTarget')

    conn.isRoutable()
    conn.route()
    expect(lookup).not.toHaveBeenCalled() // cached: nothing changed

    moved()
    conn.isRoutable()
    conn.route()
    expect(lookup).toHaveBeenCalledTimes(2) // one lookup per anchor, shared by both
  })

  it('re-resolves when a missing target appears later', () => {
    const nodes: Record<string, any> = { a: anchored(0, 0) }
    const conn = makeConnection(nodes)
    conn.setProperties({ start: { id: 'a', idx: 1 }, end: { id: 'b', idx: 0 }, mode: 'straight' })
    conn.route()
    nodes.b = anchored(100, 0)
    moved() // the new element's aabb was computed on enter
    const path = conn.route()
    expect(path!.getLength()).toBeGreaterThan(0)
  })
})

// `isValid()` runs per element per frame (process + culling), so non-connections
// must answer without touching the property machinery — a plain flag flips in
// `_updateProperty` and gates the anchor reads.
describe('element2DConnection isValid fast flag', () => {
  it('answers false without anchors and flips via the property setters', () => {
    const conn = makeConnection({})
    expect(conn.isValid()).toBe(false)

    conn.setProperties({ start: { id: 'a', idx: 0 } })
    expect(conn.isValid()).toBe(true)

    conn.start = undefined
    expect(conn.isValid()).toBe(false)

    conn.end = { id: 'b', idx: 0 }
    expect(conn.isValid()).toBe(true)
  })

  it('stays truthful when an installed anchor is mutated in place', () => {
    const conn = makeConnection({})
    conn.setProperties({ start: { id: 'a', idx: 0 } })
    conn.start!.id = 'c' // in-place mutation bypasses the setter by design
    expect(conn.isValid()).toBe(true)
  })

  it('an anchor object without an id is set but not valid', () => {
    const conn = makeConnection({})
    conn.start = { idx: 1 } as any
    expect(conn.isValid()).toBe(false)
  })
})
