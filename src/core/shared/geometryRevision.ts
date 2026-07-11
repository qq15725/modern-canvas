let revision = 0

/**
 * Revision of everything a connection's endpoints can be derived from. Bumped when:
 *
 * - any Element2D's world geometry is recomputed (globalTransform / globalAabb / size)
 * - a shape's `connectionPoints` are replaced
 * - a node enters or leaves the tree (changes what an id resolves to)
 *
 * Deliberately global rather than per-element: a connection would otherwise have to
 * read its two targets to notice a change, and reading is exactly what we're avoiding.
 * `route()` runs every frame for every connection (Element2D._process), and in a host
 * that wraps elements in a reactive proxy — mce puts them behind Vue's `reactive()` —
 * even reading a handful of properties per connection per frame adds up, while writing
 * a cache field back triggers the proxy's dependency machinery. One integer compare
 * costs nothing.
 *
 * Being global only ever costs extra work, never correctness: an unrelated element
 * moving makes every connection fall through to comparing its own endpoints, which is
 * still far cheaper than re-resolving them.
 *
 * The camera is a plain Node2D whose transform touches no Element2D aabb, so panning /
 * zooming the viewport does NOT bump this — connections stay fully cached while the
 * user navigates.
 */
export function geometryRevision(): number {
  return revision
}

export function bumpGeometryRevision(): void {
  revision++
}
