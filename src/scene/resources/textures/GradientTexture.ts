import type { LinearGradient, RadialGradient } from 'modern-idoc'
import type { Texture2DProperties } from './Texture2D'
import { isGradient } from 'modern-idoc'
import { Texture2D } from './Texture2D'

export class GradientTexture extends Texture2D {
  static test(value: string): boolean {
    return isGradient(value)
  }

  static linearGradient(linearGradient: LinearGradient, width: number, height: number): Texture2DProperties {
    width = width || 1
    height = height || 1
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to parse linear gradient, get canvas context is null.')
    }
    const { angle = 0, stops } = linearGradient
    const w = width
    const h = height
    const cx = w / 2
    const cy = h / 2
    const rad = (angle + 90) * Math.PI / 180
    const dx = Math.sin(rad)
    const dy = -Math.cos(rad)
    const l = Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad))
    const x0 = cx - dx * (l / 2)
    const y0 = cy - dy * (l / 2)
    const x1 = cx + dx * (l / 2)
    const y1 = cy + dy * (l / 2)
    const g = ctx.createLinearGradient(x0, y0, x1, y1)
    for (const s of stops) g.addColorStop(s.offset, s.color)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    return {
      width: imageData.width,
      height: imageData.height,
      source: new Uint8Array(imageData.data.buffer),
      uploadMethodId: 'buffer',
    }
  }

  constructor(gradient: LinearGradient | RadialGradient, width: number, height: number) {
    super(
      GradientTexture.linearGradient(gradient as any, width, height),
    )
  }
}
