import type { LineCap, LineJoin, LineStyle } from 'modern-path2d'
import type { Batchable2D, ColorValue, Transform2D } from '../../core'
import { Path2D } from 'modern-path2d'
import { ColorTexture, Texture2D } from '../resources'

export interface CanvasBatchable extends Batchable2D {
  type: 'stroke' | 'fill'
  texture?: Texture2D
}

export interface StrokeDraw {
  type: 'stroke'
  path: Path2D
  texture?: Texture2D
  textureTransform?: Transform2D
  style: LineStyle
}

export interface FillDraw {
  type: 'fill'
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
  _draws: (StrokeDraw | FillDraw)[] = []

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
      this._draws.push({
        type: 'stroke',
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
    this._draws.push({
      type: 'fill',
      path: new Path2D(this),
      texture,
      textureTransform: this.textureTransform,
    })
    super.reset()
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
    this._draws = source._draws.slice()
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
    this._draws.length = 0
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
      const w = texture.width
      const h = texture.height
      for (let len = vertices.length, i = start; i < len; i += 2) {
        const x = vertices[i]
        const y = vertices[i + 1]
        let uvX
        let uvY
        if (textureTransform) {
          [uvX, uvY] = textureTransform?.applyToPoint(x, y)
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
    let vertices: number[] = []
    let indices: number[] = []
    let uvs: number[] = []
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

    for (let len = this._draws.length, i = 0; i < len; i++) {
      const draw = this._draws[i]
      const prev = this._draws[i - 1]
      if (vertices.length && prev && prev?.type !== draw.type) {
        push(prev.type)
      }
      const oldTexture = texture
      if (!oldTexture) {
        texture = draw.texture
      }
      if (
        vertices.length
        && oldTexture !== draw.texture
        && !oldTexture?.is(draw.texture)
      ) {
        push(draw.type)
      }
      const start = vertices.length
      if (draw.type === 'fill') {
        draw.path.fillTriangulate({
          vertices,
          indices,
        })
        this.buildUvs(start, vertices, uvs, draw.texture, draw.textureTransform)
      }
      else {
        draw.path.strokeTriangulate({
          vertices,
          indices,
          lineStyle: draw.style,
          flipAlignment: false,
          closed: true,
        })
        this.buildUvs(start, vertices, uvs, draw.texture, draw.textureTransform)
      }
    }

    const last = this._draws[this._draws.length - 1]
    if (last && vertices.length) {
      push(last.type)
    }

    return batchables
  }
}
