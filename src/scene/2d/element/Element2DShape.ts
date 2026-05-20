import type { NormalizedShape, Shape } from 'modern-idoc'
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
