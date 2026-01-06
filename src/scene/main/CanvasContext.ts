import type { LineCap, LineJoin, LineStyle } from 'modern-path2d'
import type { Batchable2D, ColorValue } from '../../core'
import { isColorFillObject } from 'modern-idoc'
import { Path2D } from 'modern-path2d'
import { ColorTexture, Texture2D } from '../resources'

export type TransformUv = (uvs: Float32Array, index: number) => void
export type TransformVertex = (vertices: Float32Array, index: number) => void

export interface CanvasBatchable extends Batchable2D {
  type: 'stroke' | 'fill'
  texture?: Texture2D
  transformUv?: TransformUv
  transformVertex?: TransformVertex
  size?: { width: number, height: number }
}

export interface StrokeDraw extends Partial<CanvasBatchable> {
  type: 'stroke'
  path: Path2D
  lineStyle: LineStyle
}

export interface FillDraw extends Partial<CanvasBatchable> {
  type: 'fill'
  path: Path2D
}

export class CanvasContext extends Path2D {
  fillStyle?: ColorValue | Texture2D
  strokeStyle?: ColorValue | Texture2D
  strokeAlignment?: number
  lineCap?: LineCap
  lineJoin?: LineJoin
  lineWidth?: number
  miterLimit?: number

  // custom
  transformUv?: TransformUv
  transformVertex?: TransformVertex

  protected _draws: (StrokeDraw | FillDraw)[] = []

  protected _parseDrawStyle(source?: ColorValue | Texture2D): { texture?: Texture2D } {
    if (source) {
      if (source instanceof Texture2D) {
        return {
          texture: source,
        }
      }
      else {
        return {
          texture: ColorTexture.get(source),
        }
      }
    }
    return {}
  }

  stroke(options?: Partial<StrokeDraw>): void {
    if (!this.curves.length) {
      return
    }

    const styleStroke = this.style.stroke
    let stroke = this.strokeStyle
    if (!stroke && styleStroke) {
      switch (typeof styleStroke) {
        case 'string':
          stroke = styleStroke
          break
        case 'object':
          if (isColorFillObject(styleStroke)) {
            stroke = styleStroke.color
          }
          break
      }
    }

    this._draws.push({
      ...options,
      ...this._parseDrawStyle(stroke),
      type: 'stroke',
      path: new Path2D(this),
      transformUv: this.transformUv,
      transformVertex: this.transformVertex,
      lineStyle: {
        alignment: this.strokeAlignment ?? 0.5,
        cap: this.lineCap ?? 'butt',
        join: this.lineJoin ?? 'miter',
        width: this.lineWidth ?? this.style.strokeWidth ?? 1,
        miterLimit: this.miterLimit ?? this.style.strokeMiterlimit ?? 10,
      },
    })

    this.resetStatus()
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
    if (!this.curves.length) {
      return
    }

    let fillStyle = this.fillStyle
    if (!fillStyle && this.style.fill) {
      switch (typeof this.style.fill) {
        case 'string':
          fillStyle = this.style.fill
          break
        case 'object':
          if (isColorFillObject(this.style.fill)) {
            fillStyle = this.style.fill.color
          }
          break
      }
    }

    this._draws.push({
      transformUv: this.transformUv,
      transformVertex: this.transformVertex,
      ...options,
      ...this._parseDrawStyle(fillStyle),
      type: 'fill',
      path: new Path2D(this),
    })

    this.resetStatus()
  }

  override copy(source: CanvasContext): this {
    super.copy(source)
    this.strokeStyle = source.strokeStyle
    this.fillStyle = source.fillStyle
    this.transformUv = source.transformUv
    this.transformVertex = source.transformVertex
    this.strokeAlignment = source.strokeAlignment
    this.lineCap = source.lineCap
    this.lineJoin = source.lineJoin
    this.lineWidth = source.lineWidth
    this.miterLimit = source.miterLimit
    this._draws = source._draws.slice()
    return this
  }

  resetStatus(): void {
    super.reset()
    this.strokeStyle = undefined
    this.fillStyle = undefined
    this.transformUv = undefined
    this.transformVertex = undefined
    this.strokeAlignment = undefined
    this.lineCap = undefined
    this.lineJoin = undefined
    this.lineWidth = undefined
    this.miterLimit = undefined
  }

  override reset(): this {
    this.resetStatus()
    this._draws.length = 0
    return this
  }

  toBatchables(): CanvasBatchable[] {
    const batchables: CanvasBatchable[] = []

    for (let len = this._draws.length, i = 0; i < len; i++) {
      const current = this._draws[i]
      const vertices: number[] = []
      const indices: number[] = []

      const { path, ...batchable } = current

      if (batchable.type === 'fill') {
        path.fillTriangulate({
          vertices,
          indices,
        })
      }
      else {
        path.strokeTriangulate({
          vertices,
          indices,
          lineStyle: batchable.lineStyle,
          flipAlignment: false,
          closed: path.getPoint(0).equals(path.getPoint(1)),
        })
      }

      batchables.push({
        ...batchable,
        vertices: new Float32Array(vertices),
        indices: new Uint32Array(indices),
      })
    }

    return batchables
  }
}
