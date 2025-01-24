import type { PropertyDeclaration } from '../../core'
import type { Node } from '../main'
import type { ControlProperties } from './Control'
import { customNode, property, Transform2D } from '../../core'
import { CanvasTexture } from '../resources'
import { Control } from './Control'

export interface RulerProperties extends ControlProperties {
  offsetX: number
  offsetY: number
  thickness: number
  markHeight: number
  color: string
  markBackgroundColor: string
  markColor: string
  gap: number
  scale: number
}

@customNode('Ruler')
export class Ruler extends Control {
  @property({ default: 0 }) declare offsetX: number
  @property({ default: 0 }) declare offsetY: number
  @property({ default: 20 }) declare thickness: number
  @property({ default: 3 }) declare markHeight: number
  @property({ default: '#b2b6bc' }) declare color: string
  @property({ default: '#f9f9fa' }) declare markBackgroundColor: string
  @property({ default: '#b2b6bc' }) declare markColor: string
  @property({ default: 300 }) declare gap: number
  @property({ default: 1 }) declare gapScale: number

  texture = new CanvasTexture()

  constructor(properties?: Partial<RulerProperties>, children: Node[] = []) {
    super()
    this.setProperties(properties)
    this.append(children)
  }

  protected override _updateProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'offsetX':
      case 'offsetY':
      case 'thickness':
      case 'markHeight':
      case 'color':
      case 'markBackgroundColor':
      case 'markColor':
      case 'gap':
      case 'scale':
        this.requestRedraw()
        break
    }
  }

  protected override _updateStyleProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateStyleProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'width':
      case 'height':
        this.texture[key] = value
        this.requestRedraw()
        break
    }
  }

  protected _drawTexture(): void {
    const { width, height } = this.size

    const {
      offsetX,
      offsetY,
      thickness,
      markHeight,
      markBackgroundColor,
      markColor,
      color,
      gap: _gap,
      gapScale: _scale,
    } = this

    const canvas = this.texture.source
    const ctx = canvas.getContext('2d')!

    ctx.reset()
    ctx.scale(this.texture.pixelRatio, this.texture.pixelRatio)
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

  protected override _draw(): void {
    this._drawTexture()
    const texture = this.texture
    if (texture?.valid) {
      this.context.fillStyle = texture
      this.context.textureTransform = new Transform2D().scale(
        this.size.width / texture.width,
        this.size.height / texture.height,
      )
      this.context.rect(0, 0, texture.width, texture.height)
      this.context.fill()
    }
  }
}
