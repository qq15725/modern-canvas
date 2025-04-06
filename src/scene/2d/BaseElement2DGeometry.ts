import type { GeometryPathDeclaration, GeometryProperty } from 'modern-idoc'
import type { PropertyDeclaration } from '../../core'
import type { BaseElement2D } from './BaseElement2D'
import { normalizeGeometry } from 'modern-idoc'
import {
  Matrix3,
  Path2D,
  Path2DSet,
  svgToDOM,
  svgToPath2DSet,
} from 'modern-path2d'
import { CoreObject, property } from '../../core'

export class BaseElement2DGeometry extends CoreObject {
  @property() declare name?: string
  @property() declare svg?: string
  @property({ default: [0, 0, 1, 1] }) declare viewBox: number[]
  @property({ default: [] }) declare data: GeometryPathDeclaration[]

  protected _path2DSet: Path2DSet = new Path2DSet()

  constructor(
    public parent: BaseElement2D,
  ) {
    super()

    this._updatePath2DSet()
  }

  override setProperties(properties?: GeometryProperty): this {
    return super.setProperties(normalizeGeometry(properties))
  }

  protected _updateProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'svg':
      case 'data':
      case 'viewBox':
        this._updatePath2DSet()
        this.parent.requestRedraw()
        break
    }
  }

  protected _updatePath2DSet(): void {
    let viewBox: number[]
    if (this.svg) {
      const dom = svgToDOM(this.svg)
      this._path2DSet = svgToPath2DSet(dom)
      viewBox = this._path2DSet.viewBox ?? this.viewBox
    }
    else {
      viewBox = this.viewBox
      this.data.forEach((path, i) => {
        const { data, ...style } = path
        const path2D = new Path2D()
        path2D.style = style as any
        path2D.addData(data)
        this._path2DSet.paths[i] = path2D
      })
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
