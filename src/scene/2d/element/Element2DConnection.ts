import type { Connection, ConnectionMode, NormalizedConnection, ShapeConnectionPoint } from 'modern-idoc'
import type { Path2D, Vector2Like } from 'modern-path2d'
import type { ConnectionEndpoint } from './connectionRouter'
import type { Element2D } from './Element2D'
import { isNone, normalizeConnection, property } from 'modern-idoc'
import { Vector2 } from 'modern-path2d'
import { CoreObject, geometryRevision } from '../../../core'
import { axisDir, routeConnection } from './connectionRouter'

/** Per-endpoint slots in the route cache key, see {@link Element2DConnection._writeKey}. */
const KEY_SIZE = 8

export class Element2DConnection extends CoreObject implements NormalizedConnection {
  @property() declare start: NormalizedConnection['start']
  @property() declare end: NormalizedConnection['end']
  /** Routing mode: `straight` | `orthogonal` | `curved` (normalized by modern-idoc). */
  @property({ fallback: 'straight' }) declare mode: ConnectionMode
  /** Fraction (0..1) along the routed path used by {@link getLabelPoint}. */
  @property({ fallback: 0.5 }) declare labelPosition: number

  // cache the routed path; while endpoints + mode are unchanged, route() returns
  // the same instance so callers can skip re-layout via identity comparison.
  protected _routeSig?: string
  protected _routePath?: Path2D

  // `route()` runs every frame for every connection (Element2D._process), so the common
  // case — nothing moved — must do as close to nothing as possible. Two gates:
  //
  //  1. `geometryRevision` hasn't moved → no element's world geometry changed anywhere
  //     in the scene, so the cached path stands. One integer compare, zero reads of the
  //     targets (which matters: hosts commonly wrap elements in a reactive proxy).
  //  2. Something moved, but maybe not *our* endpoints → compare a numeric key of
  //     everything an endpoint's world point can depend on. Nothing is written back
  //     while it matches, because writing to a proxied field triggers the host's
  //     dependency machinery.
  //
  // Only when both gates miss do we resolve the endpoints and re-route.
  protected _keyTargets: (Element2D | undefined)[] = [undefined, undefined]
  protected _routeKey: number[] = Array.from({ length: KEY_SIZE * 2 }, () => Number.NaN)
  protected _keyMode?: ConnectionMode
  protected _keyAnchors: (string | number | undefined)[] = [undefined, undefined, undefined, undefined]
  protected _keyRevision = -1
  protected _keyValid = false

  // Fast reject for the 99% of elements that are not connections: `isValid()` runs
  // per element per frame (process + culling), and reading `start`/`end` goes through
  // the property-declaration machinery. This plain flag flips in `_updateProperty`,
  // so non-connections answer with a single field read. In-place mutation of an
  // existing anchor (`start.id = ...`) keeps the flag truthful — the anchor object
  // itself was still installed through the setter.
  protected _anchorsSet = false

  // Resolved endpoints, shared by `isRoutable()` and `route()` — both run every frame,
  // and the tree lookup is re-done at most once per revision per anchor change.
  protected _startTarget?: Element2D
  protected _endTarget?: Element2D
  protected _targetsRevision = -1
  protected _targetsStartId?: string
  protected _targetsEndId?: string

  constructor(protected _parent: Element2D) {
    super()
  }

  override setProperties(properties?: Record<string, any>): this {
    return super.setProperties(
      isNone(properties)
        ? undefined
        : normalizeConnection(properties as Connection),
    )
  }

  /**
   * Whether this element *is* a connection — i.e. it declares at least one anchor.
   * Says nothing about whether those anchors still resolve; callers use this to tell
   * connection elements apart from ordinary ones (hit-testing, marquee selection,
   * cascade-deleting dangling lines), and a dangling connection is still a connection.
   *
   * For "can this actually be routed right now", see {@link isRoutable}.
   */
  isValid(): boolean {
    return this._anchorsSet && Boolean(this.start?.id || this.end?.id)
  }

  /**
   * Whether at least one anchor resolves to a node currently in the tree. A connection
   * whose targets were removed is valid but not routable: it must stop consuming a
   * per-frame route and stop opting out of viewport culling.
   */
  isRoutable(): boolean {
    if (!this.isValid()) {
      return false
    }
    this._refreshTargets()
    return Boolean(this._startTarget || this._endTarget)
  }

  protected _updateProperty(key: string, value: any, oldValue: any): void {
    super._updateProperty(key, value, oldValue)
    switch (key) {
      case 'start':
      case 'end':
      case 'mode':
        if (key !== 'mode') {
          this._anchorsSet = Boolean(this.start || this.end)
        }
        // The anchors/mode aren't part of the numeric key — they change through here.
        this._keyValid = false
        this._parent.requestDraw()
        break
    }
  }

  protected _resolveTarget(anchor: NormalizedConnection['start']): Element2D | undefined {
    return anchor?.id ? this._parent.tree?.getNodeById<Element2D>(anchor.id) : undefined
  }

  /**
   * Re-resolve both anchors, at most once per (revision, anchor ids) pair. Nodes enter
   * and leave the tree through `SceneTree`, which bumps the revision, so a cached target
   * can never outlive its membership.
   */
  protected _refreshTargets(): void {
    const revision = geometryRevision()
    const startId = this.start?.id
    const endId = this.end?.id
    if (
      this._targetsRevision === revision
      && this._targetsStartId === startId
      && this._targetsEndId === endId
    ) {
      return
    }
    this._targetsRevision = revision
    this._targetsStartId = startId
    this._targetsEndId = endId
    this._startTarget = this._resolveTarget(this.start)
    this._endTarget = this._resolveTarget(this.end)
  }

  /**
   * The anchors are compared by value rather than relying on `_updateProperty`, because
   * `connection.start.idx = 2` mutates in place without going through the setter.
   */
  protected _anchorsMatch(): boolean {
    return this._keyMode === this.mode
      && this._keyAnchors[0] === this.start?.id
      && this._keyAnchors[1] === this.start?.idx
      && this._keyAnchors[2] === this.end?.id
      && this._keyAnchors[3] === this.end?.idx
  }

  /**
   * Everything an endpoint's world point + direction is derived from, compared in place.
   * `getNodeById<Element2D>` is an unchecked cast — a connection may well point at a
   * plain Node2D — so every field is read defensively.
   */
  protected _keyMatches(target: Element2D | undefined, offset: number): boolean {
    const key = this._routeKey
    if (!target) {
      return key[offset] === -1
    }
    const aabb = target.globalAabb
    return key[offset] === (target.transformDirtyId ?? -1)
      && key[offset + 1] === (target.size?.x ?? -1)
      && key[offset + 2] === (target.size?.y ?? -1)
      && key[offset + 3] === (target.shape?.connectionPointsDirtyId ?? -1)
      && key[offset + 4] === (aabb?.min.x ?? -1)
      && key[offset + 5] === (aabb?.min.y ?? -1)
      && key[offset + 6] === (aabb?.size.x ?? -1)
      && key[offset + 7] === (aabb?.size.y ?? -1)
  }

  protected _writeKey(target: Element2D | undefined, offset: number): void {
    const key = this._routeKey
    if (!target) {
      key.fill(-1, offset, offset + KEY_SIZE)
      return
    }
    const aabb = target.globalAabb
    key[offset] = target.transformDirtyId ?? -1
    key[offset + 1] = target.size?.x ?? -1
    key[offset + 2] = target.size?.y ?? -1
    key[offset + 3] = target.shape?.connectionPointsDirtyId ?? -1
    key[offset + 4] = aabb?.min.x ?? -1
    key[offset + 5] = aabb?.min.y ?? -1
    key[offset + 6] = aabb?.size.x ?? -1
    key[offset + 7] = aabb?.size.y ?? -1
  }

  /** Snapshot what the current route was computed from. Only on a cache miss. */
  protected _storeKey(s: Element2D | undefined, e: Element2D | undefined): void {
    this._writeKey(s, 0)
    this._writeKey(e, KEY_SIZE)
    this._keyTargets[0] = s
    this._keyTargets[1] = e
    this._keyMode = this.mode
    this._keyAnchors[0] = this.start?.id
    this._keyAnchors[1] = this.start?.idx
    this._keyAnchors[2] = this.end?.id
    this._keyAnchors[3] = this.end?.idx
    this._keyRevision = geometryRevision()
    this._keyValid = true
  }

  /**
   * Resolve an anchor to a world-space point.
   * If idx is specified, uses the target shape's connectionPoints;
   * otherwise falls back to the target's globalAabb center.
   */
  resolveAnchor(anchor: NormalizedConnection['start']): Vector2 | undefined {
    return this.resolveEndpoint(anchor)?.point as Vector2 | undefined
  }

  /**
   * Resolve an anchor to a world-space point and outward direction.
   * Direction comes from the connection point's `ang` if present, otherwise it is
   * inferred from which edge the point sits on; a centre fallback has no direction.
   */
  resolveEndpoint(
    anchor: NormalizedConnection['start'],
    target = this._resolveTarget(anchor),
  ): ConnectionEndpoint | undefined {
    if (!anchor?.id || !target)
      return undefined

    const aabb = target.globalAabb
    const bbox = { min: { x: aabb.min.x, y: aabb.min.y }, size: { x: aabb.size.x, y: aabb.size.y } }

    if (anchor.idx !== undefined) {
      const cp = target.shape.connectionPoints?.find(
        (p: ShapeConnectionPoint) => p.idx === anchor.idx,
      )
      if (cp) {
        const point = target.globalTransform.apply(
          new Vector2(cp.x * target.size.x, cp.y * target.size.y),
        )
        let dir: Vector2Like | undefined
        if (cp.ang !== undefined) {
          dir = { x: Math.cos(cp.ang), y: Math.sin(cp.ang) }
        }
        else {
          // infer outward normal from the point's position on the unit shape
          dir = axisDir(cp.x - 0.5, cp.y - 0.5)
        }
        return { point, dir: rotateDir(dir, target.globalRotation), bbox }
      }
    }

    return { point: new Vector2(aabb.min.x + aabb.size.x / 2, aabb.min.y + aabb.size.y / 2), bbox }
  }

  /**
   * World-space point at the configured {@link labelPosition} along the current
   * route — handy for anchoring an external label / badge to the line. Returns
   * `undefined` when the endpoints haven't resolved yet.
   */
  getLabelPoint(): Vector2 | undefined {
    const path = this.route()
    if (!path || !path.getLength())
      return undefined
    const t = Math.max(0, Math.min(1, this.labelPosition ?? 0.5))
    return path.getPointAt(t) as Vector2
  }

  /** Resolve both ends and return the routed world-space path (cached while unchanged). */
  route(): Path2D | undefined {
    // Gate 1: nothing anywhere in the scene moved since we last routed.
    if (this._keyValid && this._keyRevision === geometryRevision() && this._anchorsMatch()) {
      return this._routePath
    }

    this._refreshTargets()
    const sTarget = this._startTarget
    const eTarget = this._endTarget

    // Gate 2: something moved, but not our two endpoints.
    if (
      this._keyValid
      && this._anchorsMatch()
      && sTarget === this._keyTargets[0]
      && eTarget === this._keyTargets[1]
      && this._keyMatches(sTarget, 0)
      && this._keyMatches(eTarget, KEY_SIZE)
    ) {
      this._keyRevision = geometryRevision()
      return this._routePath
    }

    const s = this.resolveEndpoint(this.start, sTarget)
    const e = this.resolveEndpoint(this.end, eTarget)
    this._storeKey(sTarget, eTarget)
    if (!s && !e) {
      this._routeSig = undefined
      this._routePath = undefined
      return undefined
    }
    // The key can change without the resolved points changing (a transform revision
    // bumps on any re-layout), so the signature still guards the expensive re-route —
    // and keeps the Path2D identity stable so callers can skip re-layout.
    const fmt = (p?: ConnectionEndpoint): string =>
      p ? `${p.point.x},${p.point.y},${p.dir?.x ?? ''},${p.dir?.y ?? ''}` : '-'
    const sig = `${this.mode}|${fmt(s)}|${fmt(e)}`
    if (sig !== this._routeSig || !this._routePath) {
      this._routeSig = sig
      this._routePath = routeConnection(this.mode, s ?? e!, e ?? s!)
    }
    return this._routePath
  }
}

function rotateDir(d: Vector2Like, ang: number): Vector2Like {
  if (!ang)
    return d
  const cos = Math.cos(ang)
  const sin = Math.sin(ang)
  return { x: d.x * cos - d.y * sin, y: d.x * sin + d.y * cos }
}
