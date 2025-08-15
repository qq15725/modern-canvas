import { Vector2 } from './Vector2'

export class Rect2 {
  get x(): number { return this.position.x }
  get y(): number { return this.position.y }
  get left(): number { return this.position.x }
  get top(): number { return this.position.y }
  get right(): number { return this.x + this.width }
  get bottom(): number { return this.y + this.height }
  get width(): number { return this.size.x }
  get height(): number { return this.size.y }

  readonly end = new Vector2()
  readonly position: Vector2
  readonly size: Vector2

  constructor(from: Rect2)
  constructor(pointArray: [number, number][])
  constructor(position: Vector2, size: Vector2)
  constructor(x: number, y: number, width: number, height: number)
  constructor(...args: any[]) {
    const position = new Vector2()
    const size = new Vector2()
    switch (args.length) {
      case 0:
        break
      case 1: {
        const arg = args[0]
        if (arg instanceof Rect2) {
          position.set(arg.position)
          size.set(arg.size)
        }
        else {
          const xx = arg.map((p: [number, number]) => p[0])
          const yy = arg.map((p: [number, number]) => p[1])
          const minX = Math.min(...xx)
          const maxX = Math.max(...xx)
          const minY = Math.min(...yy)
          const maxY = Math.max(...yy)
          position.set(minX, minY)
          size.set(maxX - minX, maxY - minY)
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
