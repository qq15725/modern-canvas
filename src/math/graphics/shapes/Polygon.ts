import type { PointData } from '../Point'
import type { Shape } from './Shape'
import { buildPolygon } from '../build'
import { Rectangle } from './Rectangle'
import { squaredDistanceToLineSegment } from './Triangle'

export class Polygon implements Shape {
  points: number[]
  closed: boolean

  get lastX(): number { return this.points[this.points.length - 2] }
  get lastY(): number { return this.points[this.points.length - 1] }
  get x(): number { return this.points[this.points.length - 2] }
  get y(): number { return this.points[this.points.length - 1] }

  constructor(points: PointData[] | number[])
  constructor(...points: PointData[] | number[])
  constructor(...points: (PointData[] | number[])[] | PointData[] | number[]) {
    let flat = Array.isArray(points[0]) ? points[0] : points
    // if this is an array of points, convert it to a flat array of numbers
    if (typeof flat[0] !== 'number') {
      const p: number[] = []
      for (let i = 0, il = flat.length; i < il; i++) {
        p.push((flat[i] as PointData).x, (flat[i] as PointData).y)
      }
      flat = p
    }
    this.points = flat as number[]
    this.closed = true
  }

  reset(): this {
    this.points.length = 0
    return this
  }

  contains(x: number, y: number): boolean {
    let inside = false
    // use some raycasting to test hits
    // https://github.com/substack/point-in-polygon/blob/master/index.js
    const length = this.points.length / 2
    for (let i = 0, j = length - 1; i < length; j = i++) {
      const xi = this.points[i * 2]
      const yi = this.points[(i * 2) + 1]
      const xj = this.points[j * 2]
      const yj = this.points[(j * 2) + 1]
      const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * ((y - yi) / (yj - yi))) + xi)
      if (intersect) {
        inside = !inside
      }
    }
    return inside
  }

  strokeContains(x: number, y: number, strokeWidth: number): boolean {
    const halfStrokeWidth = strokeWidth / 2
    const halfStrokeWidthSqrd = halfStrokeWidth * halfStrokeWidth
    const { points } = this
    const iterationLength = points.length - (this.closed ? 0 : 2)
    for (let i = 0; i < iterationLength; i += 2) {
      const x1 = points[i]
      const y1 = points[i + 1]
      const x2 = points[(i + 2) % points.length]
      const y2 = points[(i + 3) % points.length]
      const distanceSqrd = squaredDistanceToLineSegment(x, y, x1, y1, x2, y2)
      if (distanceSqrd <= halfStrokeWidthSqrd) {
        return true
      }
    }
    return false
  }

  clone(): Polygon {
    const points = this.points.slice()
    const polygon = new Polygon(points)
    polygon.closed = this.closed
    return polygon
  }

  copyFrom(polygon: Polygon): this {
    this.points = polygon.points.slice()
    this.closed = polygon.closed
    return this
  }

  copyTo(polygon: Polygon): Polygon {
    polygon.copyFrom(this)
    return polygon
  }

  getBounds(out?: Rectangle): Rectangle {
    out = out || new Rectangle()
    const points = this.points
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (let i = 0, n = points.length; i < n; i += 2) {
      const x = points[i]
      const y = points[i + 1]
      minX = x < minX ? x : minX
      maxX = x > maxX ? x : maxX
      minY = y < minY ? y : minY
      maxY = y > maxY ? y : maxY
    }
    out.x = minX
    out.width = maxX - minX
    out.y = minY
    out.height = maxY - minY
    return out
  }

  buildOutline(points: number[]): void {
    buildPolygon.build(this, points)
  }

  buildGeometry(
    vertices: number[],
    indices: number[],
  ): void {
    const points: number[] = []
    this.buildOutline(points)
    buildPolygon.triangulate(points, vertices, 2, 0, indices, 0)
  }
}
