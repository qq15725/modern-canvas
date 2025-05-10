import type { ColorStop, ParsedGradient } from './LinearGradient'

export class RadialGradient {
  constructor(
    public x0: number,
    public y0: number,
    public r0: number,
    public x1: number,
    public y1: number,
    public r1: number,
    public stops: ColorStop[],
  ) {
    //
  }

  parse(width: number, height: number): ParsedGradient {
    return this._parseByCanvas(width, height)
  }

  protected _parseByCanvas(width: number, height: number): ParsedGradient {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to parse radial gradient, get canvas context is null.')
    }
    const gradient = ctx.createRadialGradient(
      this.x0 * width,
      this.y0 * height,
      this.r0,
      this.x1 * width,
      this.y1 * height,
      this.r1,
    )
    this.stops.forEach((stop) => {
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
}
