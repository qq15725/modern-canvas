import type { LineCap, LineJoin } from 'modern-path2d'
import type { ColorValue } from '../../core'
import type { Texture2D } from '../resources'
import { customNode, PI_2 } from '../../core'
import { Node2D } from './Node2D'

function proxy(
  options?: {
    method?: boolean
    redraw?: boolean
  },
) {
  return function (target: any, name: any) {
    Object.defineProperty(target.constructor.prototype, name, {
      get() {
        if (options?.method) {
          return (...args: any[]) => {
            (this.context as any)[name].call(this.context, ...args)
            options.redraw && this.requestRedraw()
            return target
          }
        }
        return this.context[name]
      },
      set(value) {
        this.context[name] = value
      },
      configurable: true,
      enumerable: true,
    })
  }
}

@customNode('Graphics2D')
export class Graphics2D extends Node2D {
  protected _resetContext = false

  @proxy() lineCap?: LineCap
  @proxy() lineJoin?: LineJoin
  @proxy() fillStyle?: ColorValue | Texture2D
  @proxy() strokeStyle?: ColorValue | Texture2D
  @proxy() lineWidth?: number
  @proxy() miterLimit?: number
  @proxy({ method: true }) declare rect: (x: number, y: number, width: number, height: number) => this
  @proxy({ method: true, redraw: true }) declare fillRect: (x: number, y: number, width: number, height: number) => this
  @proxy({ method: true, redraw: true }) declare strokeRect: (x: number, y: number, width: number, height: number) => this
  @proxy({ method: true }) declare roundRect: (x: number, y: number, width: number, height: number, radii: number) => this
  @proxy({ method: true }) declare ellipse: (x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number, counterclockwise?: boolean) => this
  @proxy({ method: true }) declare arc: (x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean) => this
  @proxy({ method: true }) declare beginPath: () => this
  @proxy({ method: true }) declare moveTo: (x: number, y: number) => this
  @proxy({ method: true }) declare lineTo: (x: number, y: number) => this
  @proxy({ method: true }) declare closePath: () => this
  @proxy({ method: true, redraw: true }) declare fill: () => this
  @proxy({ method: true, redraw: true }) declare stroke: () => this

  drawCircle(x: number, y: number, radius: number): this {
    this.arc(x + radius, y + radius, radius, 0, PI_2)
    this.fill()
    return this
  }

  drawEllipse(x: number, y: number, width: number, height: number): this {
    const rx = width / 2
    const ry = height / 2
    this.ellipse(x + rx, y + ry, rx, ry, 0, 0, PI_2)
    this.fill()
    return this
  }
}
