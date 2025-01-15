import type { LineCap, LineJoin, LineStyle } from 'modern-path2d'
import type { Batchable2D, ColorValue, Transform2D } from '../../core'
import { CurvePath, Path2D } from 'modern-path2d'
import { ColorTexture, Texture2D } from '../resources'

export interface CanvasBatchable extends Batchable2D {
  type: 'stroke' | 'fill'
  texture?: Texture2D
}

export interface StrokedGraphics {
  path: Path2D
  texture?: Texture2D
  textureTransform?: Transform2D
  style: LineStyle
}

export interface FilledGraphics {
  path: Path2D
  texture?: Texture2D
  textureTransform?: Transform2D
}

export class CanvasContext extends Path2D {
  textureTransform?: Transform2D

  fillStyle?: ColorValue | Texture2D
  strokeStyle?: ColorValue | Texture2D
  lineCap?: LineCap
  lineJoin?: LineJoin
  lineWidth?: number
  miterLimit?: number

  _defaultStyle = Texture2D.EMPTY
  _stroke: StrokedGraphics[] = []
  _fille: FilledGraphics[] = []

  stroke(): void {
    let texture: Texture2D = this._defaultStyle
    if (this.strokeStyle) {
      if (this.strokeStyle instanceof Texture2D) {
        texture = this.strokeStyle
      }
      else {
        texture = new ColorTexture(this.strokeStyle)
      }
    }

    if (this.curves.length) {
      this._stroke.push({
        path: new Path2D(this),
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
      this.currentCurve = new CurvePath()
      this.curves = [this.currentCurve]
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
    let texture: Texture2D = this._defaultStyle
    if (this.fillStyle) {
      if (this.fillStyle instanceof Texture2D) {
        texture = this.fillStyle
      }
      else {
        texture = new ColorTexture(this.fillStyle)
      }
    }
    this._fille.push({
      path: new Path2D(this),
      texture,
      textureTransform: this.textureTransform,
    })
    this.currentCurve = new CurvePath()
    this.curves = [this.currentCurve]
  }

  override copy(source: CanvasContext): this {
    super.copy(source)
    this.strokeStyle = source.strokeStyle
    this.fillStyle = source.fillStyle
    this.textureTransform = source.textureTransform
    this.lineCap = source.lineCap
    this.lineJoin = source.lineJoin
    this.lineWidth = source.lineWidth
    this.miterLimit = source.miterLimit
    this._stroke = source._stroke.slice()
    this._fille = source._fille.slice()
    return this
  }

  override reset(): this {
    super.reset()
    this.strokeStyle = undefined
    this.fillStyle = undefined
    this.textureTransform = undefined
    this.lineCap = undefined
    this.lineJoin = undefined
    this.lineWidth = undefined
    this.miterLimit = undefined
    this._stroke.length = 0
    this._fille.length = 0
    return this
  }

  buildUvs(
    start: number,
    vertices: number[],
    uvs: number[],
    texture?: Texture2D,
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
    let texture: Texture2D | undefined

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

    let verticesLen = vertices.length

    for (let len = this._fille.length, i = 0; i < len; i++) {
      const graphics = this._fille[i]
      texture ??= graphics.texture
      if (texture !== graphics.texture) {
        push('fill')
      }
      startUv = vertices.length
      graphics.path.fillTriangulate({
        vertices,
        indices,
      })
      this.buildUvs(startUv, vertices, uvs, graphics.texture, graphics.textureTransform)
    }

    if (vertices.length - verticesLen > 0) {
      push('fill')
    }

    verticesLen = vertices.length

    for (let len = this._stroke.length, i = 0; i < len; i++) {
      startUv = vertices.length
      const graphics = this._stroke[i]
      texture ??= graphics.texture
      graphics.path.strokeTriangulate({
        vertices,
        indices,
        lineStyle: graphics.style,
        flipAlignment: false,
        closed: true,
      })
      this.buildUvs(startUv, vertices, uvs, graphics.texture, graphics.textureTransform)
      push('stroke')
    }

    if (vertices.length - verticesLen > 0) {
      push('stroke')
    }

    return batchables
  }
}
