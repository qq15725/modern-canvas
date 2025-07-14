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
  constructor(position: Vector2, size: Vector2)
  constructor(x: number, y: number, width: number, height: number)
  constructor(...args: any[]) {
    const position = new Vector2()
    const size = new Vector2()
    switch (args.length) {
      case 0:
        break
      case 1:
        position.set(args[0].position)
        size.set(args[0].size)
        break
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
