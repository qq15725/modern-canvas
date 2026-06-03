import type { NormalizedShape, Shape } from 'modern-idoc'
import type { Vector2Like } from 'modern-path2d'
import type { Element2D } from './Element2D'
import { isNone, normalizeShape, property } from 'modern-idoc'
import {
  Path2D,
  Path2DSet,
  svgToDom,
  svgToPath2DSet,
  Transform2D,
} from 'modern-path2d'
import { CoreObject } from '../../../core'

export class Element2DShape extends CoreObject implements NormalizedShape {
  @property({ fallback: true }) declare enabled: boolean
  @property() declare preset: NormalizedShape['preset']
  @property() declare svg: NormalizedShape['svg']
  @property() declare viewBox: NormalizedShape['viewBox']
  @property() declare paths: NormalizedShape['paths']
  @property() declare connectionPoints: NormalizedShape['connectionPoints']

  protected _path2DSet: Path2DSet = new Path2DSet()

  /**
   * A derived path in the element's local pixel space (NOT normalized to the unit
   * box). Used by connections so the routed polyline is drawn 1:1 — going through
   * the normalize→size scaling would distort the stroke width non-uniformly.
   */
  protected _localPath?: Path2D

  /**
   * Pixel-space copy of `_path2DSet` (scaled to the element size), used for hit
   * testing so fill/stroke slack stay in pixel units. Rebuilt when the size
   * changes; cleared by `_updatePath2DSet` when the paths themselves change.
   */
  protected _hitPath2DSet?: Path2DSet
  protected _hitWidth = 0
  protected _hitHeight = 0

  constructor(
    protected _parent: Element2D,
  ) {
    super()
    this._updatePath2DSet()
  }

  /** Set/clear the local-space derived path (e.g. a connection route). */
  setLocalPath(path: Path2D | undefined): void {
    this._localPath = path
    this._parent.requestDraw()
  }

  get localPath(): Path2D | undefined { return this._localPath }

  override setProperties(properties?: Record<string, any>): this {
    return super.setProperties(
      isNone(properties)
        ? undefined
        : normalizeShape(properties as Shape),
    )
  }

  protected _updateProperty(key: string, value: any, oldValue: any): void {
    super._updateProperty(key, value, oldValue)

    switch (key) {
      case 'svg':
      case 'paths':
      case 'viewBox':
      case 'enabled':
        this._updatePath2DSet()
        this._parent.requestDraw()
        break
    }
  }

  isValid(): boolean {
    return Boolean(
      this.enabled && (
        this._path2DSet.paths.some(p => p.getLength())
      ),
    )
  }

  /**
   * Hit-test a point given in the element's local pixel space against the real
   * geometry, mirroring {@link draw}'s path selection:
   *
   * - a connection route (`_localPath`, already in pixel space) → stroke hit
   * - a normalized shape (`_path2DSet`) → fill hit, falling back to stroke for
   *   `fill: none` outlines (handled by {@link Path2DSet.hitTest})
   *
   * `strokeWidth` should be the element's outline width (pixels) so line/stroke
   * hits line up with what's drawn. Returns `false` when there's no valid geometry
   * — callers then fall back to the element's rectangle.
   */
  isPointInside(localPos: Vector2Like, options?: { strokeWidth?: number, tolerance?: number }): boolean {
    const strokeWidth = options?.strokeWidth ?? 1
    const tolerance = options?.tolerance ?? 0
    const local = this._localPath
    if (local && local.getLength()) {
      return local.isPointInStroke(localPos, { strokeWidth, tolerance, closed: false })
    }
    const set = this._getHitPath2DSet()
    if (!set) {
      return false
    }
    // fill hits are exact; the stroke slack covers the outline's outer half + tolerance
    return Boolean(set.hitTest(localPos, { stroke: true, tolerance: tolerance + strokeWidth / 2 }))
  }

  /**
   * Lazily build the pixel-space path set. `_path2DSet` is normalized to the unit
   * box, so it's scaled to the element size here. Rebuilt only on size change.
   */
  protected _getHitPath2DSet(): Path2DSet | undefined {
    if (!this.isValid()) {
      return undefined
    }
    const { width, height } = this._parent.size
    if (!width || !height) {
      return undefined
    }
    if (!this._hitPath2DSet || this._hitWidth !== width || this._hitHeight !== height) {
      const transform = new Transform2D().scale(width, height)
      this._hitPath2DSet = new Path2DSet(
        this._path2DSet.paths.map(path => path.clone().applyTransform(transform)),
      )
      this._hitWidth = width
      this._hitHeight = height
    }
    return this._hitPath2DSet
  }

  protected _updatePath2DSet(): void {
    let viewBox: number[] | undefined
    if (this.svg) {
      const dom = svgToDom(this.svg)
      this._path2DSet = svgToPath2DSet(dom)
      viewBox = this._path2DSet.viewBox
    }
    else {
      this._path2DSet.paths.length = 0
      this.paths?.forEach((path, i) => {
        const { data, ...style } = path
        const path2D = new Path2D()
        path2D.style = style as any
        path2D.addData(data)
        this._path2DSet.paths[i] = path2D
      })
    }
    if (!viewBox) {
      const bbox = this._path2DSet.getBoundingBox()
      viewBox = bbox
        ? [bbox.x, bbox.y, bbox.width || 1, bbox.height || 1]
        : [0, 0, 1, 1]
    }
    const [x, y, w, h] = viewBox
    this._path2DSet.paths.forEach((path) => {
      path.applyTransform(new Transform2D().translate(-x, -y).scale(1 / w, 1 / h))
    })
    this._hitPath2DSet = undefined
  }

  draw(rect = false): void {
    if (!rect && this._localPath && this._localPath.getLength()) {
      // already in local pixel space — add as-is (no normalize/size scaling)
      this._parent.context.addPath(this._localPath.clone())
    }
    else if (!rect && this.isValid()) {
      const ctx = this._parent.context
      const { width, height } = this._parent.size
      this._path2DSet.paths.forEach((path) => {
        // `ctx.addPath` only copies the path's curves, so any per-path style
        // (currently just `fillRule`, set by svgToPath2DSet from a `fill-rule`
        // attribute) has to be promoted onto the ctx explicitly — otherwise
        // the subsequent fill always triangulates as 'nonzero'.
        if (path.style?.fillRule) {
          ctx.fillRule = path.style.fillRule
        }
        ctx.addPath(path.clone().applyTransform(new Transform2D().scale(width, height)))
      })
    }
    else {
      this._drawRect()
    }
  }

  protected _drawRect(): void {
    const ctx = this._parent.context
    const { width, height } = this._parent.size
    const { borderRadius } = this._parent.style
    if (width && height) {
      if (borderRadius) {
        ctx.roundRect(0, 0, width, height, borderRadius)
      }
      else {
        ctx.rect(0, 0, width, height)
      }
    }
  }
}
