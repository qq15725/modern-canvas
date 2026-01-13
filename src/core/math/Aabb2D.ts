import type { Vector2Like } from './Vector2'
import { Vector2 } from './Vector2'

export interface RectangleLike {
  x: number
  y: number
  width: number
  height: number
}

/**
 * AxisAlignedBoundingBox2D
 */
export class Aabb2D implements RectangleLike {
  get x(): number { return this.min.x }
  set x(val) { this.min.x = val }

  get y(): number { return this.min.y }
  set y(val) { this.min.y = val }

  get left(): number { return this.min.x }
  set left(val) { this.min.x = val }

  get top(): number { return this.min.y }
  set top(val) { this.min.y = val }

  get right(): number { return this.x + this.width }
  set right(val) { this.size.x = Math.max(0, val - this.min.x) }

  get bottom(): number { return this.y + this.height }
  set bottom(val) { this.size.y = Math.max(0, val - this.min.y) }

  get width(): number { return this.size.x }
  set width(val) { this.size.x = Math.max(0, val) }

  get height(): number { return this.size.y }
  set height(val) { this.size.y = Math.max(0, val) }

  readonly max = new Vector2()
  readonly min: Vector2
  readonly size: Vector2

  constructor()
  constructor(rect: RectangleLike)
  constructor(pointArray: Vector2Like[])
  constructor(min: Vector2Like, size: Vector2Like)
  constructor(x: number, y: number, width: number, height: number)
  constructor(...args: any[]) {
    const min = new Vector2()
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
          min.set(minX, minY)
          size.set(maxX - minX, maxY - minY)
        }
        else {
          min.set(arg.x, arg.y)
          size.set(Math.max(0, arg.width), Math.max(0, arg.height))
        }
        break
      }
      case 2:
        min.set(args[0])
        size.set(Math.max(0, args[1]))
        break
      default:
        min.set(args[0], args[1])
        size.set(Math.max(0, args[2]), Math.max(0, args[3]))
        break
    }
    this.update = this.update.bind(this)
    this.min = min.on('update', this.update)
    this.size = size.on('update', this.update)
    this.update()
  }

  update(): this {
    this.max.set(
      this.min.x + this.size.x,
      this.min.y + this.size.y,
    )
    return this
  }

  overlap(rect: Aabb2D, axis?: 'x' | 'y'): boolean {
    switch (axis) {
      case 'x':
        return this.max.x >= rect.min.x
          && rect.max.x >= this.min.x
      case 'y':
        return this.max.y >= rect.min.y
          && rect.max.y >= this.min.y
      default:
        return this.overlap(rect, 'x')
          && this.overlap(rect, 'y')
    }
  }

  contains(value: Aabb2D | Vector2Like): boolean {
    let min, max
    if (value instanceof Aabb2D) {
      min = value.min
      max = value.max
    }
    else {
      min = value
      max = value
    }
    return this.max.x >= max.x
      && this.max.y >= max.y
      && this.min.x <= min.x
      && this.min.y <= min.y
  }

  getIntersectionRect(target: Aabb2D): Aabb2D {
    const a = this.toMinmax()
    const b = target.toMinmax()
    const minX = Math.max(a.min.x, b.min.x)
    const minY = Math.max(a.min.y, b.min.y)
    const maxX = Math.min(a.max.x, b.max.x)
    const maxY = Math.min(a.max.y, b.max.y)
    if (maxX <= minX || maxY <= minY) {
      return new Aabb2D()
    }
    return new Aabb2D(
      minX,
      minY,
      Math.max(0, maxX - minX),
      Math.max(0, maxY - minY),
    )
  }

  getArea(): number {
    return this.width * this.height
  }

  toMinmax(): { min: Vector2, max: Vector2 } {
    return {
      min: this.min.clone(),
      max: this.max.clone(),
    }
  }

  toCssStyle(): { left: string, top: string, width: string, height: string } {
    return {
      left: `${this.left}px`,
      top: `${this.top}px`,
      width: `${this.width}px`,
      height: `${this.height}px`,
    }
  }

  toArray(): number[] {
    return [this.x, this.y, this.width, this.height]
  }

  toJSON(): RectangleLike {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    }
  }

  clone(): Aabb2D {
    return new Aabb2D(this.toJSON())
  }
}
