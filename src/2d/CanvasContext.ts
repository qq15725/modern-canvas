import type { CurvePath, LineCap, LineJoin, LineStyle } from 'modern-path2d'
import type { ColorValue } from '../color'
import type { Transform2D } from '../math'
import type { Batchable2D } from '../renderer'
import { Path2D, strokeTriangulate } from 'modern-path2d'
import { ColorTexture } from '../color'
import { Texture } from '../core'

export interface CanvasBatchable extends Batchable2D {
  type: 'stroke' | 'fill'
  texture?: Texture
}

export interface StrokedGraphics {
  shapes: CurvePath[]
  texture?: Texture
  textureTransform?: Transform2D
  style: LineStyle
}

export interface FilledGraphics {
  shapes: CurvePath[]
  texture?: Texture
  textureTransform?: Transform2D
}

export class CanvasContext extends Path2D {
  textureTransform?: Transform2D

  fillStyle?: ColorValue | Texture
  strokeStyle?: ColorValue | Texture
  lineCap?: LineCap
  lineJoin?: LineJoin
  lineWidth?: number
  miterLimit?: number

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

    if (this.curves.length) {
      this._stroked.push({
        shapes: this.curves.slice(),
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
      this.curves.length = 0
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
      shapes: this.curves.slice(),
      texture,
      textureTransform: this.textureTransform,
    })
    this.curves.length = 0
  }

  reset(): void {
    this.strokeStyle = undefined
    this.fillStyle = undefined
    this.textureTransform = undefined
    this.lineCap = undefined
    this.lineJoin = undefined
    this.lineWidth = undefined
    this.miterLimit = undefined
    this.curves.length = 0
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
      startUv = vertices.length
      const graphics = this._stroked[i]
      texture ??= graphics.texture
      const points: number[] = []
      for (let len = graphics.shapes.length, i = 0; i < len; i++) {
        graphics.shapes[i].getAdaptivePointArray(points)
      }
      strokeTriangulate(points, {
        vertices,
        indices,
        lineStyle: graphics.style,
        flipAlignment: false,
        closed: true,
      })
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
        graphics.shapes[i].fillTriangulate({
          vertices,
          indices,
        })
      }
      this.buildUvs(startUv, vertices, uvs, graphics.texture, graphics.textureTransform)
    }

    if (vertices.length) {
      push('fill')
    }

    return batchables
  }
}
