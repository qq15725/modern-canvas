import type { LinearGradient, RadialGradient } from 'modern-idoc'
import type { Texture2DPixelsSource } from './Texture2D'
import { isGradient } from 'modern-idoc'
import { Texture2D } from './Texture2D'

export class GradientTexture extends Texture2D {
  static test(value: string): boolean {
    return isGradient(value)
  }

  static linearGradient(linearGradient: LinearGradient, width: number, height: number): Texture2DPixelsSource {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to parse linear gradient, get canvas context is null.')
    }
    let { angle, stops } = linearGradient
    angle -= Math.PI / 2
    const halfWidth = width / 2
    const halfHeight = height / 2
    const length = Math.sqrt(width * width + height * height) / 2
    const x0 = halfWidth + length * Math.cos(angle + Math.PI)
    const y0 = halfHeight + length * Math.sin(angle + Math.PI)
    const x1 = halfWidth + length * Math.cos(angle)
    const y1 = halfHeight + length * Math.sin(angle)
    const gradient = ctx.createLinearGradient(x0, y0, x1, y1)
    stops.forEach((stop) => {
      gradient.addColorStop(stop.offset, stop.color)
    })
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)
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
