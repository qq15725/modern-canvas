import type { ColorValue } from '../color'
import type { LineCap, LineJoin, LineStyle, Path2DShape, PointData, Shape, Transform2D } from '../math'
import type { Batchable2D } from '../renderer'
import { ColorTexture } from '../color'
import { Texture } from '../core'
import { buildLine, Path2D } from '../math'

export interface CanvasBatchable extends Batchable2D {
  type: 'stroke' | 'fill'
  texture?: Texture
}

export interface StrokedGraphics {
  shapes: Path2DShape[]
  texture?: Texture
  textureTransform?: Transform2D
  style: LineStyle
}

export interface FilledGraphics {
  shapes: Path2DShape[]
  texture?: Texture
  textureTransform?: Transform2D
}

function proxy() {
  return function (target: CanvasContext, method: string) {
    Object.defineProperty(target.constructor.prototype, method, {
      get() {
        return (...args: any[]) => {
          this._path2D[method](...args)
          return this
        }
      },
      configurable: true,
      enumerable: true,
    })
  }
}

export class CanvasContext {
  @proxy() declare moveTo: (x: number, y: number) => this
  @proxy() declare lineTo: (x: number, y: number) => this
  @proxy() declare bezierCurveTo: (cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number, smoothness?: number) => this
  @proxy() declare quadraticCurveTo: (cp1x: number, cp1y: number, x: number, y: number, smoothing?: number) => this
  @proxy() declare ellipticalArc: (rx: number, ry: number, xAxisRotation: number, largeArcFlag: number, sweepFlag: number, x: number, y: number) => this
  @proxy() declare rect: (x: number, y: number, width: number, height: number, transform?: Transform2D) => this
  @proxy() declare roundRect: (x: number, y: number, width: number, height: number, radii: number, transform?: Transform2D) => this
  @proxy() declare ellipse: (x: number, y: number, radiusX: number, radiusY: number, transform?: Transform2D) => this
  @proxy() declare arc: (x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise: boolean) => this
  @proxy() declare poly: (points: number[] | PointData[], close?: boolean, transform?: Transform2D) => this
  @proxy() declare addShape: (shape: Shape, transform?: Transform2D) => this
  @proxy() declare addPath: (path2D: Path2D) => this
  @proxy() declare addSvgPath: (d: string) => this
  @proxy() declare closePath: () => this

  textureTransform?: Transform2D

  fillStyle?: ColorValue | Texture
  strokeStyle?: ColorValue | Texture
  lineCap?: LineCap
  lineJoin?: LineJoin
  lineWidth?: number
  miterLimit?: number

  protected _path2D = new Path2D()
  protected _defaultStyle = Texture.EMPTY
  protected _stroked: StrokedGraphics[] = []
  protected _filled: FilledGraphics[] = []

  stroke(): void {
    let texture: Texture = this._defaultStyle
    if (this.strokeStyle) {
      if (this.strokeStyle instanceof Texture) {
        texture = this.strokeStyle
      }
      else {
        texture = new ColorTexture(this.strokeStyle)
      }
    }

    this._path2D.endPolygon()

    if (this._path2D.shapes.length) {
      this._stroked.push({
        shapes: this._path2D.shapes.slice(),
        texture,
        textureTransform: this.textureTransform,
        style: {
          alignment: 0.5,
          cap: this.lineCap ?? 'butt',
          join: this.lineJoin ?? 'miter',
          width: this.lineWidth ?? 1,
          miterLimit: this.miterLimit ?? 10,
        },
      })
      this._path2D.shapes.length = 0
    }
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    this
      .rect(x, y, width, height)
      .fill()
  }

  strokeRect(x: number, y: number, width: number, height: number): void {
    this
      .rect(x, y, width, height)
      .stroke()
  }

  fill(): void {
    let texture: Texture = this._defaultStyle
    if (this.fillStyle) {
      if (this.fillStyle instanceof Texture) {
        texture = this.fillStyle
      }
      else {
        texture = new ColorTexture(this.fillStyle)
      }
    }

    this._filled.push({
      shapes: this._path2D.shapes.slice(),
      texture,
      textureTransform: this.textureTransform,
    })
    this._path2D.shapes.length = 0
  }

  reset(): void {
    this.strokeStyle = undefined
    this.fillStyle = undefined
    this.textureTransform = undefined
    this.lineCap = undefined
    this.lineJoin = undefined
    this.lineWidth = undefined
    this.miterLimit = undefined
    this._path2D.endPolygon()
    this._path2D.shapes.length = 0
    this._stroked.length = 0
    this._filled.length = 0
  }

  buildUvs(
    start: number,
    vertices: number[],
    uvs: number[],
    texture?: Texture,
    textureTransform?: Transform2D,
  ): void {
    if (texture) {
      let w = texture.width
      let h = texture.height
      if (textureTransform) {
        [w, h] = textureTransform.applyToPoint(w, h)
      }
      for (let len = vertices.length, i = start; i < len; i += 2) {
        uvs.push(vertices[i] / w, vertices[i + 1] / h)
      }
    }
    else {
      for (let len = vertices.length, i = start; i < len; i += 2) {
        uvs.push(0, 0)
      }
    }
  }

  toBatchables(): CanvasBatchable[] {
    const batchables: CanvasBatchable[] = []
    let vertices: number[] = []
    let indices: number[] = []
    let uvs: number[] = []
    let startUv = 0
    let texture: Texture | undefined

    const push = (type: CanvasBatchable['type']): void => {
      batchables.push({
        type,
        vertices,
        indices,
        uvs,
        texture,
      })
      vertices = []
      indices = []
      uvs = []
      texture = undefined
    }

    for (let len = this._stroked.length, i = 0; i < len; i++) {
      const graphics = this._stroked[i]
      texture ??= graphics.texture
      const points: number[] = []
      for (let len = graphics.shapes.length, i = 0; i < len; i++) {
        graphics.shapes[i].shape.buildOutline(points)
      }
      startUv = vertices.length
      buildLine(points, graphics.style, false, true, vertices, 0, 0, indices, 0)
      this.buildUvs(startUv, vertices, uvs, graphics.texture, graphics.textureTransform)
      push('stroke')
    }

    for (let len = this._filled.length, i = 0; i < len; i++) {
      const graphics = this._filled[i]
      texture ??= graphics.texture
      if (texture !== graphics.texture) {
        push('fill')
      }
      startUv = vertices.length
      for (let len = graphics.shapes.length, i = 0; i < len; i++) {
        graphics.shapes[i].shape.buildGeometry(vertices, indices)
      }
      this.buildUvs(startUv, vertices, uvs, graphics.texture, graphics.textureTransform)
    }

    if (vertices.length) {
      push('fill')
    }

    return batchables
  }
}
