import type { Shape } from './Shape'
import { buildTriangle } from '../build'
import { Rectangle } from './Rectangle'

export function squaredDistanceToLineSegment(
  x: number,
  y: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const a = x - x1
  const b = y - y1
  const c = x2 - x1
  const d = y2 - y1
  const dot = (a * c) + (b * d)
  const lenSq = (c * c) + (d * d)
  let param = -1
  if (lenSq !== 0) {
    param = dot / lenSq
  }
  let xx
  let yy
  if (param < 0) {
    xx = x1
    yy = y1
  }
  else if (param > 1) {
    xx = x2
    yy = y2
  }
  else {
    xx = x1 + (param * c)
    yy = y1 + (param * d)
  }
  const dx = x - xx
  const dy = y - yy
  return (dx * dx) + (dy * dy)
}

export class Triangle implements Shape {
  constructor(
    public x = 0,
    public y = 0,
    public x2 = 0,
    public y2 = 0,
    public x3 = 0,
    public y3 = 0,
  ) {
    //
  }

  contains(x: number, y: number): boolean {
    const s = ((this.x - this.x3) * (y - this.y3)) - ((this.y - this.y3) * (x - this.x3))
    const t = ((this.x2 - this.x) * (y - this.y)) - ((this.y2 - this.y) * (x - this.x))
    if ((s < 0) !== (t < 0) && s !== 0 && t !== 0)
      return false
    const d = ((this.x3 - this.x2) * (y - this.y2)) - ((this.y3 - this.y2) * (x - this.x2))
    return d === 0 || (d < 0) === (s + t <= 0)
  }

  strokeContains(pointX: number, pointY: number, strokeWidth: number): boolean {
    const halfStrokeWidth = strokeWidth / 2
    const halfStrokeWidthSquared = halfStrokeWidth * halfStrokeWidth
    const { x, x2, x3, y, y2, y3 } = this
    if (
      squaredDistanceToLineSegment(pointX, pointY, x, y, x2, y3) <= halfStrokeWidthSquared
      || squaredDistanceToLineSegment(pointX, pointY, x2, y2, x3, y3) <= halfStrokeWidthSquared
      || squaredDistanceToLineSegment(pointX, pointY, x3, y3, x, y) <= halfStrokeWidthSquared
    ) {
      return true
    }
    return false
  }

  clone(): Triangle {
    return new Triangle(
      this.x,
      this.y,
      this.x2,
      this.y2,
      this.x3,
      this.y3,
    )
  }

  copyFrom(triangle: Triangle): this {
    this.x = triangle.x
    this.y = triangle.y
    this.x2 = triangle.x2
    this.y2 = triangle.y2
    this.x3 = triangle.x3
    this.y3 = triangle.y3
    return this
  }

  copyTo(triangle: Triangle): Triangle {
    triangle.copyFrom(this)
    return triangle
  }

  getBounds(out?: Rectangle): Rectangle {
    out = out || new Rectangle()
    const minX = Math.min(this.x, this.x2, this.x3)
    const maxX = Math.max(this.x, this.x2, this.x3)
    const minY = Math.min(this.y, this.y2, this.y3)
    const maxY = Math.max(this.y, this.y2, this.y3)
    out.x = minX
    out.y = minY
    out.width = maxX - minX
    out.height = maxY - minY
    return out
  }

  buildOutline(points: number[]): void {
    buildTriangle.build(this, points)
  }

  buildGeometry(vertices: number[], indices: number[]): void {
    const points: number[] = []
    this.buildOutline(points)
    buildTriangle.triangulate(points, vertices, 2, 0, indices, 0)
  }
}
