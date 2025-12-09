import type { Vector2Like } from './Vector2'
import { Vector2 } from './Vector2'

export interface RectangleLike {
  x: number
  y: number
  width: number
  height: number
}

export class Rectangle implements RectangleLike {
  get x(): number { return this.position.x }
  set x(val) { this.position.x = val }

  get y(): number { return this.position.y }
  set y(val) { this.position.y = val }

  get left(): number { return this.position.x }
  set left(val) { this.position.x = val }

  get top(): number { return this.position.y }
  set top(val) { this.position.y = val }

  get right(): number { return this.x + this.width }
  set right(val) { this.size.x = val - this.position.x }

  get bottom(): number { return this.y + this.height }
  set bottom(val) { this.size.y = val - this.position.y }

  get width(): number { return this.size.x }
  set width(val) { this.size.x = val }

  get height(): number { return this.size.y }
  set height(val) { this.size.y = val }

  readonly end = new Vector2()
  readonly position: Vector2
  readonly size: Vector2

  constructor(from: RectangleLike)
  constructor(pointArray: Vector2Like[])
  constructor(position: Vector2Like, size: Vector2Like)
  constructor(x: number, y: number, width: number, height: number)
  constructor(...args: any[]) {
    const position = new Vector2()
    const size = new Vector2()
    switch (args.length) {
      case 0:
        break
      case 1: {
        const arg = args[0]
        if (Array.isArray(arg)) {
          const xx = arg.map((p: Vector2Like) => p.x)
          const yy = arg.map((p: Vector2Like) => p.y)
          const minX = Math.min(...xx)
          const maxX = Math.max(...xx)
          const minY = Math.min(...yy)
          const maxY = Math.max(...yy)
          position.set(minX, minY)
          size.set(maxX - minX, maxY - minY)
        }
        else {
          position.set(arg.x, arg.y)
          size.set(arg.width, arg.height)
        }
        break
      }
      case 2:
        position.set(args[0])
        size.set(args[1])
        break
      default:
        position.set(args[0], args[1])
        size.set(args[2], args[3])
        break
    }
    this.update = this.update.bind(this)
    this.position = position.on('update', this.update)
    this.size = size.on('update', this.update)
    this.update()
  }

  update(): this {
    this.end.set(
      this.position.x + this.size.x,
      this.position.y + this.size.y,
    )
    return this
  }

  toMinmax(): { minX: number, minY: number, maxX: number, maxY: number } {
    return {
      minX: this.position.x,
      minY: this.position.y,
      maxX: this.end.x,
      maxY: this.end.y,
    }
  }

  toArray(): number[] {
    return [this.x, this.y, this.width, this.height]
  }

  toJSON(): { x: number, y: number, width: number, height: number } {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    }
  }
}
