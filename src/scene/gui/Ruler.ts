import type { ControlProperties } from './Control'
import { customNode, property, Transform2D } from '../../core'
import { Viewport } from '../main'
import { Texture } from '../resources'
import { Control } from './Control'

export interface RulerProperties extends ControlProperties {
  pixelRatio: number
  offsetX: number
  offsetY: number
  thickness: number
  markHeight: number
  color: string
  markBackgroundColor: string
  markColor: string
  gap: number
}

@customNode('Ruler')
export class Ruler extends Control {
  @property({ default: 2 }) declare pixelRatio: number
  @property({ default: 0 }) declare offsetX: number
  @property({ default: 0 }) declare offsetY: number
  @property({ default: 20 }) declare thickness: number
  @property({ default: 3 }) declare markHeight: number
  @property({ default: '#b2b6bc' }) declare color: string
  @property({ default: '#f9f9fa' }) declare markBackgroundColor: string
  @property({ default: '#b2b6bc' }) declare markColor: string
  @property({ default: 300 }) declare gap: number

  texture = new Texture<HTMLCanvasElement>(document.createElement('canvas'))

  constructor(properties?: Partial<RulerProperties>) {
    super()
    this.setProperties(properties)
  }

  protected _parented(): void {
    super._parented()
    this._parent?.on('updateProperty', (key) => {
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
    if (!(this._parent instanceof Viewport)) {
      return
    }
    const { width, height } = this._parent

    this.style.width = width
    this.style.height = height

    const {
      pixelRatio,
      offsetX,
      offsetY,
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

    const x = Math.round(offsetX)
    const y = Math.round(offsetY)

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
