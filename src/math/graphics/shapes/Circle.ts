import type { Shape } from './Shape'
import { buildCircle } from '../build'
import { Rectangle } from './Rectangle'

export class Circle implements Shape {
  constructor(
    public x = 0,
    public y = 0,
    public radius = 0,
  ) {
    //
  }

  contains(x: number, y: number): boolean {
    if (this.radius <= 0)
      return false
    const r2 = this.radius * this.radius
    let dx = (this.x - x)
    let dy = (this.y - y)
    dx *= dx
    dy *= dy
    return (dx + dy <= r2)
  }

  strokeContains(x: number, y: number, width: number): boolean {
    if (this.radius === 0)
      return false
    const dx = (this.x - x)
    const dy = (this.y - y)
    const r = this.radius
    const w2 = width / 2
    const distance = Math.sqrt((dx * dx) + (dy * dy))
    return (distance < r + w2 && distance > r - w2)
  }

  clone(): Circle {
    return new Circle(this.x, this.y, this.radius)
  }

  copyFrom(circle: Circle): this {
    this.x = circle.x
    this.y = circle.y
    this.radius = circle.radius
    return this
  }

  copyTo(circle: Circle): Circle {
    circle.copyFrom(this)
    return circle
  }

  getBounds(out?: Rectangle): Rectangle {
    out = out || new Rectangle()
    out.x = this.x - this.radius
    out.y = this.y - this.radius
    out.width = this.radius * 2
    out.height = this.radius * 2
    return out
  }

  buildOutline(points: number[]): void {
    buildCircle.build(this, points)
  }

  buildGeometry(vertices: number[], indices: number[]): void {
    const points: number[] = []
    this.buildOutline(points)
    buildCircle.triangulate(points, vertices, 2, 0, indices, 0)
  }
}
