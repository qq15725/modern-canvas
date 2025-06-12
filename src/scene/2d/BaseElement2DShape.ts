import type { NormalizedShape, PropertyDeclaration, Shape } from 'modern-idoc'
import type { BaseElement2D } from './BaseElement2D'
import { isNone, normalizeShape } from 'modern-idoc'
import { property } from 'modern-idoc'
import {
  Matrix3,
  Path2D,
  Path2DSet,
  svgToDOM,
  svgToPath2DSet,
} from 'modern-path2d'
import { CoreObject } from '../../core'

export class BaseElement2DShape extends CoreObject {
  @property() declare preset?: Required<NormalizedShape>['preset']
  @property() declare svg?: Required<NormalizedShape>['svg']
  @property() declare viewBox?: Required<NormalizedShape>['viewBox']
  @property({ default: () => [] }) declare paths: Required<NormalizedShape>['paths']

  protected _path2DSet: Path2DSet = new Path2DSet()

  constructor(
    public parent: BaseElement2D,
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

  protected _updateProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'svg':
      case 'paths':
      case 'viewBox':
        this._updatePath2DSet()
        this.parent.requestRedraw()
        break
    }
  }

  protected _updatePath2DSet(): void {
    let viewBox: number[] | undefined
    if (this.svg) {
      const dom = svgToDOM(this.svg)
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
        ? [bbox.x, bbox.y, bbox.width, bbox.height]
        : [0, 0, 1, 1]
    }
    const [x, y, w, h] = viewBox
    this._path2DSet.paths.forEach((path) => {
      path.applyTransform(new Matrix3().translate(-x, -y).scale(1 / w, 1 / h))
    })
  }

  draw(): void {
    if (this._path2DSet.paths.length) {
      const ctx = this.parent.context
      const { width, height } = this.parent.size
      this._path2DSet.paths.forEach((path) => {
        ctx.addPath(path.clone().applyTransform(new Matrix3().scale(width, height)))
      })
    }
    else {
      this.drawRect()
    }
  }

  drawRect(): void {
    const ctx = this.parent.context
    const { width, height } = this.parent.size
    const { borderRadius } = this.parent.style
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
