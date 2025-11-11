import type { LineCap, LineJoin, LineStyle } from 'modern-path2d'
import type { Batchable2D, ColorValue, Transform2D } from '../../core'
import { isColorFillObject } from 'modern-idoc'
import { Path2D } from 'modern-path2d'
import { Color } from '../../core'
import { Texture2D } from '../resources'

export interface CanvasBatchable extends Batchable2D {
  type: 'stroke' | 'fill'
  texture?: Texture2D
  uvTransform?: Transform2D
  vertTransform?: Transform2D
}

export interface StrokeDraw extends Partial<CanvasBatchable> {
  type: 'stroke'
  path: Path2D
  lineStyle: LineStyle
  uvTransform?: Transform2D
}

export interface FillDraw extends Partial<CanvasBatchable> {
  type: 'fill'
  path: Path2D
  uvTransform?: Transform2D
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
  uvTransform?: Transform2D
  vertTransform?: Transform2D

  protected _draws: (StrokeDraw | FillDraw)[] = []

  protected _parseDrawStyle(source?: ColorValue | Texture2D): { texture?: Texture2D, backgroundColor?: number[] } {
    if (source) {
      if (source instanceof Texture2D) {
        return {
          texture: source,
        }
      }
      else {
        return {
          backgroundColor: new Color(source).toInt8Array(),
        }
      }
    }
    return {}
  }

  stroke(options?: Partial<StrokeDraw>): void {
    if (!this.curves.length) {
      return
    }

    let strokeStyle = this.strokeStyle
    if (!strokeStyle && this.style.stroke) {
      switch (typeof this.style.stroke) {
        case 'string':
          strokeStyle = this.style.stroke
          break
        case 'object':
          if (isColorFillObject(this.style.stroke)) {
            strokeStyle = this.style.stroke.color
          }
          break
      }
    }

    this._draws.push({
      ...options,
      ...this._parseDrawStyle(strokeStyle),
      type: 'stroke',
      path: new Path2D(this),
      uvTransform: this.uvTransform,
      vertTransform: this.vertTransform,
      lineStyle: {
        alignment: this.strokeAlignment ?? 0.5,
        cap: this.lineCap ?? 'butt',
        join: this.lineJoin ?? 'miter',
        width: this.lineWidth ?? 1,
        miterLimit: this.miterLimit ?? 10,
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
      uvTransform: this.uvTransform,
      vertTransform: this.vertTransform,
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
    this.uvTransform = source.uvTransform
    this.vertTransform = source.vertTransform
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
    this.uvTransform = undefined
    this.vertTransform = undefined
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

  buildUvs(
    start: number,
    vertices: number[],
    uvs: number[],
    texture?: Texture2D,
    uvTransform?: Transform2D,
  ): void {
    if (texture) {
      const w = texture.width
      const h = texture.height
      for (let len = vertices.length, i = start; i < len; i += 2) {
        const x = vertices[i]
        const y = vertices[i + 1]
        let uvX
        let uvY
        if (uvTransform) {
          [uvX, uvY] = uvTransform.apply({ x, y }).toArray()
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
          lineStyle: current.lineStyle,
          flipAlignment: false,
          closed: true,
        })
      }

      if (current.texture) {
        this.buildUvs(0, vertices, uvs, current.texture, current.uvTransform)
      }

      batchables.push({
        vertices: new Float32Array(vertices),
        indices: new Float32Array(indices),
        uvs: new Float32Array(uvs),
        size: current.size,
        texture: current.texture,
        backgroundColor: current.backgroundColor,
        type: current.type,
        disableWrapMode: current.disableWrapMode,
        uvTransform: current.uvTransform,
        vertTransform: current.vertTransform,
      })
    }

    return batchables
  }
}
