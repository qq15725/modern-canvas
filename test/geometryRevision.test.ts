import { describe, expect, it } from 'vitest'
import { Element2D, geometryRevision, SceneTree } from '../src'

describe('geometryRevision', () => {
  it('bumps when a node enters or leaves the tree', () => {
    const tree = new SceneTree()
    const node = new Element2D()

    const before = geometryRevision()
    node.setTree(tree)
    const entered = geometryRevision()
    expect(entered).toBeGreaterThan(before)

    node.setTree(undefined)
    expect(geometryRevision()).toBeGreaterThan(entered)
  })

  it('bumps when an element moves', () => {
    const node = new Element2D()
    const before = geometryRevision()
    node.style.left = 100
    expect(geometryRevision()).toBeGreaterThan(before)
  })

  it('bumps when connection points are replaced', () => {
    const node = new Element2D()
    const before = geometryRevision()
    node.shape.connectionPoints = [{ idx: 0, x: 0, y: 0.5 }]
    expect(geometryRevision()).toBeGreaterThan(before)
  })
})
