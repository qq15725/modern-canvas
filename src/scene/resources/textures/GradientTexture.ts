import type { LinearGradient, RadialGradient } from 'modern-idoc'
import type { Texture2DPixelsSource } from './Texture2D'
import { isGradient } from 'modern-idoc'
import { Texture2D } from './Texture2D'

export class GradientTexture extends Texture2D {
  static test(value: string): boolean {
    return isGradient(value)
  }

  static linearGradient(linearGradient: LinearGradient, width: number, height: number): Texture2DPixelsSource {
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
    const canAng = angle * Math.PI / 180
    const hypt = cy / Math.cos(canAng)
    const fromTopRight = cx - Math.sqrt(hypt * hypt - cy * cy)
    const diag = Math.sin(canAng) * fromTopRight
    const len = hypt + diag
    const x0 = cx + Math.cos(-Math.PI / 2 + canAng) * len
    const y0 = cy + Math.sin(-Math.PI / 2 + canAng) * len
    const x1 = cx + Math.cos(Math.PI / 2 + canAng) * len
    const y1 = cy + Math.sin(Math.PI / 2 + canAng) * len
    const gradient = ctx.createLinearGradient(x0, y0, x1, y1)
    stops.forEach((stop) => {
      gradient.addColorStop(stop.offset, stop.color)
    })
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, w, h)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    return {
      width: imageData.width,
      height: imageData.height,
      pixels: new Uint8Array(imageData.data.buffer),
    }
  }

  constructor(gradient: LinearGradient | RadialGradient, width: number, height: number) {
    super(
      GradientTexture.linearGradient(gradient as any, width, height),
    )
  }
}
