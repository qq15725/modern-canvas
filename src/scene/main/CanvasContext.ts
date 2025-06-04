import type { LineCap, LineJoin, LineStyle } from 'modern-path2d'
import type { Batchable2D, ColorValue, Transform2D } from '../../core'
import { Path2D } from 'modern-path2d'
import { ColorTexture, Texture2D } from '../resources'

export type UVTransform = Transform2D | ((x: number, y: number) => [number, number])
export type VertTransform = Transform2D | (() => Transform2D)

export interface CanvasBatchable extends Batchable2D {
  type: 'stroke' | 'fill'
  texture?: Texture2D
  vertTransform?: VertTransform
}

export interface StrokeDraw extends Partial<CanvasBatchable> {
  type: 'stroke'
  path: Path2D
  style: LineStyle
  uvTransform?: UVTransform
}

export interface FillDraw extends Partial<CanvasBatchable> {
  type: 'fill'
  path: Path2D
  uvTransform?: UVTransform
}

export class CanvasContext extends Path2D {
  fillStyle?: ColorValue | Texture2D
  strokeStyle?: ColorValue | Texture2D
  lineCap?: LineCap
  lineJoin?: LineJoin
  lineWidth?: number
  miterLimit?: number

  // custom
  uvTransform?: UVTransform
  vertTransform?: VertTransform

  protected _defaultStyle = Texture2D.EMPTY
  protected _draws: (StrokeDraw | FillDraw)[] = []

  protected _toTexture(source: ColorValue | Texture2D): Texture2D {
    if (source instanceof Texture2D) {
      return source
    }
    else {
      return new ColorTexture(source)
    }
  }

  stroke(options?: Partial<StrokeDraw>): void {
    const path = new Path2D(this)

    let texture: Texture2D = this._defaultStyle
    if (this.strokeStyle) {
      texture = this._toTexture(this.strokeStyle)
    }

    if (this.curves.length) {
      this._draws.push({
        ...options,
        type: 'stroke',
        path,
        texture,
        uvTransform: this.uvTransform,
        vertTransform: this.vertTransform,
        style: {
          alignment: 0.5,
          cap: this.lineCap ?? 'butt',
          join: this.lineJoin ?? 'miter',
          width: this.lineWidth ?? 1,
          miterLimit: this.miterLimit ?? 10,
        },
      })
      super.reset()
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

  fill(options?: Partial<FillDraw>): void {
    const path = new Path2D(this)

    let texture: Texture2D = this._defaultStyle
    if (this.fillStyle) {
      texture = this._toTexture(this.fillStyle)
    }

    this._draws.push({
      ...options,
      type: 'fill',
      path,
      texture,
      uvTransform: this.uvTransform,
      vertTransform: this.vertTransform,
    })

    super.reset()
  }

  override copy(source: CanvasContext): this {
    super.copy(source)
    this.strokeStyle = source.strokeStyle
    this.fillStyle = source.fillStyle
    this.uvTransform = source.uvTransform
    this.vertTransform = source.vertTransform
    this.lineCap = source.lineCap
    this.lineJoin = source.lineJoin
    this.lineWidth = source.lineWidth
    this.miterLimit = source.miterLimit
    this._draws = source._draws.slice()
    return this
  }

  override reset(): this {
    super.reset()
    this.strokeStyle = undefined
    this.fillStyle = undefined
    this.uvTransform = undefined
    this.vertTransform = undefined
    this.lineCap = undefined
    this.lineJoin = undefined
    this.lineWidth = undefined
    this.miterLimit = undefined
    this._draws.length = 0
    return this
  }

  buildUvs(
    start: number,
    vertices: number[],
    uvs: number[],
    texture?: Texture2D,
    uvTransform?: UVTransform,
  ): void {
    if (texture) {
      const _uvTransform = uvTransform
        ? typeof uvTransform === 'function'
          ? uvTransform
          : (x: number, y: number) => uvTransform.applyToPoint(x, y)
        : uvTransform

      const w = texture.width
      const h = texture.height
      for (let len = vertices.length, i = start; i < len; i += 2) {
        const x = vertices[i]
        const y = vertices[i + 1]
        let uvX
        let uvY
        if (_uvTransform) {
          [uvX, uvY] = _uvTransform(x, y)
        }
        else {
          [uvX, uvY] = [x / w, y / h]
        }
        uvs.push(uvX, uvY)
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

    for (let len = this._draws.length, i = 0; i < len; i++) {
      const current = this._draws[i]
      const vertices: number[] = []
      const indices: number[] = []
      const uvs: number[] = []

      if (current.type === 'fill') {
        current.path.fillTriangulate({
          vertices,
          indices,
        })
      }
      else {
        current.path.strokeTriangulate({
          vertices,
          indices,
          lineStyle: current.style,
          flipAlignment: false,
          closed: true,
        })
      }

      this.buildUvs(0, vertices, uvs, current.texture, current.uvTransform)

      batchables.push({
        vertices,
        indices,
        uvs,
        texture: current.texture,
        type: current.type,
        disableWrapMode: current.disableWrapMode,
        vertTransform: current.vertTransform,
      })
    }

    return batchables
  }
}
