import type { LineCap, LineJoin, LineStyle } from 'modern-path2d'
import type { Batchable2D, ColorValue, Transform2D } from '../../core'
import { Path2D } from 'modern-path2d'
import { ColorTexture, GradientTexture, Texture2D } from '../resources'

export interface CanvasBatchable extends Batchable2D {
  type: 'stroke' | 'fill'
  texture?: Texture2D
}

export interface StrokeDraw extends Partial<CanvasBatchable> {
  type: 'stroke'
  path: Path2D
  texture?: Texture2D
  textureTransform?: Transform2D
  style: LineStyle
}

export interface FillDraw extends Partial<CanvasBatchable> {
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

  protected _colorToTexture(color: ColorValue | Texture2D, width: number, height: number): Texture2D {
    if (color instanceof Texture2D) {
      return color
    }
    else if (typeof color === 'string' && GradientTexture.test(color)) {
      return new GradientTexture(color, width, height)
    }
    else {
      return new ColorTexture(color)
    }
  }

  stroke(options?: Partial<StrokeDraw>): void {
    const path = new Path2D(this)

    let texture: Texture2D = this._defaultStyle
    if (this.strokeStyle) {
      const { width, height } = path.getBoundingBox()
      texture = this._colorToTexture(this.strokeStyle, width, height)
    }

    if (this.curves.length) {
      this._draws.push({
        ...options,
        type: 'stroke',
        path,
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

  fill(options?: Partial<FillDraw>): void {
    const path = new Path2D(this)

    let texture: Texture2D = this._defaultStyle
    if (this.fillStyle) {
      const { width, height } = path.getBoundingBox()
      texture = this._colorToTexture(this.fillStyle, width, height)
    }

    this._draws.push({
      ...options,
      type: 'fill',
      path,
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

    const push = (draw: FillDraw | StrokeDraw): void => {
      batchables.push({
        vertices,
        indices,
        uvs,
        texture,
        type: draw.type,
        disableWrapMode: draw.disableWrapMode,
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
        push(prev)
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
        push(draw)
        texture = draw.texture
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
      push(last)
    }

    return batchables
  }
}
