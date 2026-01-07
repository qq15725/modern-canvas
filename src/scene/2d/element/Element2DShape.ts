import type { NormalizedShape, Shape } from 'modern-idoc'
import type { Element2D } from './Element2D'
import { isNone, normalizeShape, property } from 'modern-idoc'
import {
  Matrix3,
  Path2D,
  Path2DSet,
  svgToDom,
  svgToPath2DSet,
} from 'modern-path2d'
import { CoreObject } from '../../../core'

export class Element2DShape extends CoreObject {
  @property({ fallback: true }) declare enabled: boolean
  @property() declare preset: NormalizedShape['preset']
  @property() declare svg: NormalizedShape['svg']
  @property() declare viewBox: NormalizedShape['viewBox']
  @property() declare paths: NormalizedShape['paths']

  protected _path2DSet: Path2DSet = new Path2DSet()

  constructor(
    protected _parent: Element2D,
  ) {
    super()
    this._updatePath2DSet()
  }

  override setProperties(properties?: Shape): this {
    return super.setProperties(
      isNone(properties)
        ? undefined
        : normalizeShape(properties),
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
      path.applyTransform(new Matrix3().translate(-x, -y).scale(1 / w, 1 / h))
    })
  }

  draw(rect = false): void {
    if (!rect && this.isValid()) {
      const ctx = this._parent.context
      const { width, height } = this._parent.size
      this._path2DSet.paths.forEach((path) => {
        ctx.addPath(path.clone().applyTransform(new Matrix3().scale(width, height)))
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
