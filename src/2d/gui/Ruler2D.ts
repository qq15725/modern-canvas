import type { Node2DOptions } from '../Node2D'
import { customNode, property, Texture } from '../../core'
import { Transform2D } from '../../math'
import { Node2D } from '../Node2D'

export interface Ruler2DOptions extends Node2DOptions {
  //
}

@customNode('Ruler2D')
export class Ruler2D extends Node2D {
  @property({ default: 2 }) declare pixelRatio: number
  @property({ default: 0 }) declare x: number
  @property({ default: 0 }) declare y: number
  @property({ default: 20 }) declare thickness: number
  @property({ default: 3 }) declare markHeight: number
  @property({ default: '#b2b6bc' }) declare color: string
  @property({ default: '#f9f9fa' }) declare markBackgroundColor: string
  @property({ default: '#b2b6bc' }) declare markColor: string
  @property({ default: 300 }) declare gap: number

  texture = new Texture<HTMLCanvasElement>(document.createElement('canvas'))

  constructor(options?: Ruler2DOptions) {
    super()
    this.setProperties(options)
  }

  protected _enterTree(): void {
    super._enterTree()
    this._tree?.root.on('updateProperty', (key) => {
      switch (key) {
        case 'width':
        case 'height':
          this.requestRedraw()
          break
      }
    })
    this.requestRedraw()
  }

  protected _drawTexture(): void {
    if (!this._tree?.root) {
      return
    }
    const { width, height } = this._tree.root

    this.style.width = width
    this.style.height = height

    const {
      pixelRatio,
      x: _x,
      y: _y,
      thickness,
      markHeight,
      markBackgroundColor,
      markColor,
      color,
      gap: _gap,
    } = this

    const _scale = 1

    const canvas = this.texture.source
    canvas.width = Math.max(1, Math.ceil(width * pixelRatio))
    canvas.height = Math.max(1, Math.ceil(height * pixelRatio))

    const ctx = canvas.getContext('2d')!
    ctx.scale(this.pixelRatio, this.pixelRatio)

    const x = Math.round(_x)
    const y = Math.round(_y)

    ctx.beginPath()

    ctx.fillStyle = markBackgroundColor || '#EEE'
    ctx.fillRect(0, 0, width, thickness)
    ctx.fillRect(0, 0, thickness, height)
    ctx.fill()

    ctx.strokeStyle = markColor || '#000'
    ctx.moveTo(thickness, 0)
    ctx.lineTo(thickness, height)

    ctx.moveTo(0, thickness)
    ctx.lineTo(width, thickness)
    ctx.stroke()

    const originGap = _gap
    const curGap = _gap * _scale
    let scale
    let gap: number
    let markSize
    let axis
    let i

    if (originGap >= curGap) {
      scale = originGap / curGap
      gap = Math.floor(scale) * originGap / 20
      markSize = originGap / 20 * Math.floor(scale) / scale
    }
    else {
      scale = curGap / originGap
      gap = Math.floor(originGap / 20 / scale)

      if (gap >= 2) {
        gap = Math.floor(gap / 2) * 2
      }
      else {
        gap = 1
      }

      markSize = gap * scale
    }

    ctx.fillStyle = ctx.strokeStyle

    for (axis = x, i = 0; axis < width; i++, axis += markSize) {
      ctx.moveTo(axis, thickness - (i % 5 ? markHeight : 2 * markHeight))
      ctx.lineTo(axis, thickness)
    }

    for (axis = x, i = 0; axis > thickness; i++, axis -= markSize) {
      ctx.moveTo(axis, thickness - (i % 5 ? markHeight : 2 * markHeight))
      ctx.lineTo(axis, thickness)
    }

    let textOffset = 0
    for (axis = y, i = 0; axis > thickness; i++, axis -= markSize) {
      ctx.moveTo(thickness - (i % 5 ? markHeight : 2 * markHeight), axis)
      ctx.lineTo(thickness, axis)
    }

    for (axis = y, i = 0; axis < height; i++, axis += markSize) {
      ctx.moveTo(thickness - (i % 5 ? markHeight : 2 * markHeight), axis)
      ctx.lineTo(thickness, axis)
    }

    ctx.save()

    ctx.fillStyle = color
    ctx.scale(0.8, 0.8)
    textOffset = thickness - 8

    for (axis = x, i = 0; axis < width; i++, axis += markSize) {
      if (i % 10 === 0) {
        ctx.fillText(String(Math.ceil(gap * i)), axis * 1.25 - 3, textOffset * 1.25)
      }
    }

    for (axis = x, i = 0; axis > thickness; i++, axis -= markSize) {
      if (i % 10 === 0) {
        ctx.fillText(String(Math.ceil(-gap * i)), axis * 1.25 - 3, textOffset * 1.25)
      }
    }

    textOffset = 0
    for (axis = y, i = 0; axis > thickness; i++, axis -= markSize) {
      if (i % 10 === 0) {
        ctx.fillText(String(Math.ceil(gap * i)), textOffset * 1.25, axis * 1.25 + 3)
      }
    }

    for (axis = y, i = 0; axis < height; i++, axis += markSize) {
      if (i % 10 === 0) {
        ctx.fillText(String(Math.ceil(-gap * i)), textOffset * 1.25, axis * 1.25 + 3)
      }
    }

    ctx.restore()
    ctx.stroke()

    this.texture.requestUpload()
  }

  protected override _drawContent(): void {
    this._drawTexture()
    const texture = this.texture
    if (texture?.valid) {
      this.context.fillStyle = texture
      this.context.textureTransform = new Transform2D().scale(
        this.style.width! / texture.width,
        this.style.height! / texture.height,
      )
      super._drawContent()
    }
  }
}
