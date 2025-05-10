import type { LinearGradientNode } from './libs'
import { parseGradient } from './libs'

export interface ColorStop {
  offset: number
  color: string
}

export interface ParsedGradient {
  width: number
  height: number
  pixels: Uint8Array
}

export class LinearGradient {
  constructor(
    public x0: number,
    public y0: number,
    public x1: number,
    public y1: number,
    public stops: ColorStop[],
  ) {
    //
  }

  static from(css: string): LinearGradient {
    let angleDeg = 0
    const stops: ColorStop[] = []

    const ast = parseGradient(css)[0] as LinearGradientNode

    if (ast.type === 'linear-gradient') {
      switch (ast?.orientation?.type) {
        case 'angular':
          angleDeg = Number(ast.orientation.value)
          break
      }

      ast.colorStops.forEach((stop) => {
        let offset = 0
        let color = 'rgba(0, 0, 0, 0)'
        switch (stop.type) {
          case 'rgb':
            color = `rgb(${stop.value[0]}, ${stop.value[1]}, ${stop.value[2]})`
            break
          case 'rgba':
            color = `rgba(${stop.value[0]}, ${stop.value[1]}, ${stop.value[2]}, ${stop.value[3]})`
            break
          case 'literal':
            color = stop.value
            break
          case 'hex':
            color = stop.value
            break
        }
        switch (stop.length?.type) {
          case '%':
            offset = Number(stop.length.value) / 100
            break
        }
        stops.push({ offset, color })
      })
    }

    const angleRad = ((angleDeg + 90) * Math.PI) / 180

    const width = 1
    const height = 1
    const halfWidth = width / 2
    const halfHeight = height / 2
    const length = Math.sqrt(width * width + height * height) / 2
    const x0 = halfWidth + length * Math.cos(angleRad + Math.PI)
    const y0 = halfHeight + length * Math.sin(angleRad + Math.PI)
    const x1 = halfWidth + length * Math.cos(angleRad)
    const y1 = halfHeight + length * Math.sin(angleRad)

    return new LinearGradient(x0, y0, x1, y1, stops)
  }

  parse(width: number, height: number): ParsedGradient {
    return this._parseByCanvas(width, height)
  }

  protected _parseByCanvas(width: number, height: number): ParsedGradient {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to parse linear gradient, get canvas context is null.')
    }
    const gradient = ctx.createLinearGradient(
      this.x0 * width,
      this.y0 * height,
      this.x1 * width,
      this.y1 * height,
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
