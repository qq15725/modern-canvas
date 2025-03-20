import type { Path2DDeclaration } from 'modern-idoc'
import type { PropertyDeclaration } from '../../core'
import type { BaseElement2D } from './BaseElement2D'
import {
  Matrix3,
  Path2D,
  Path2DSet,
  svgPathCommandsAddToPath2D,
  svgToDOM, svgToPath2DSet,
} from 'modern-path2d'
import { CoreObject, property } from '../../core'

export interface BaseElement2DGeometryProperties {
  name?: string
  svg?: string
  viewBox?: number[]
  data?: Path2DDeclaration[]
}

export class BaseElement2DGeometry extends CoreObject {
  @property() declare name?: string
  @property() declare svg?: string
  @property({ default: [0, 0, 1, 1] }) declare viewBox: number[]
  @property({ default: [{ data: 'M0,0L0,1L1,1L1,0Z' }] }) declare data: Path2DDeclaration[]

  protected _path2DSet: Path2DSet = new Path2DSet()

  constructor(
    public parent: BaseElement2D,
    properties?: Partial<BaseElement2DGeometryProperties>,
  ) {
    super()

    this.setProperties(properties)
    this._updatePath2DSet()
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
        path2D.style = style
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
    const ctx = this.parent.context
    const { width, height } = this.parent.size

    this._path2DSet.paths.forEach((path) => {
      svgPathCommandsAddToPath2D(
        path.clone().applyTransform(new Matrix3().scale(width, height)).toCommands(),
        ctx,
      )
    })
  }
}
