import type { Shape } from './Shape'
import { buildCircle } from '../build'
import { Rectangle } from './Rectangle'

export class Ellipse implements Shape {
  constructor(
    public x = 0,
    public y = 0,
    public halfWidth = 0,
    public halfHeight = 0,
  ) {
    //
  }

  contains(x: number, y: number): boolean {
    if (this.halfWidth <= 0 || this.halfHeight <= 0) {
      return false
    }
    // normalize the coords to an ellipse with center 0,0
    let normx = ((x - this.x) / this.halfWidth)
    let normy = ((y - this.y) / this.halfHeight)
    normx *= normx
    normy *= normy
    return (normx + normy <= 1)
  }

  strokeContains(x: number, y: number, width: number): boolean {
    const { halfWidth, halfHeight } = this
    if (halfWidth <= 0 || halfHeight <= 0) {
      return false
    }
    const halfStrokeWidth = width / 2
    const innerA = halfWidth - halfStrokeWidth
    const innerB = halfHeight - halfStrokeWidth
    const outerA = halfWidth + halfStrokeWidth
    const outerB = halfHeight + halfStrokeWidth
    const normalizedX = x - this.x
    const normalizedY = y - this.y
    const innerEllipse = ((normalizedX * normalizedX) / (innerA * innerA))
      + ((normalizedY * normalizedY) / (innerB * innerB))
    const outerEllipse = ((normalizedX * normalizedX) / (outerA * outerA))
      + ((normalizedY * normalizedY) / (outerB * outerB))
    return innerEllipse > 1 && outerEllipse <= 1
  }

  clone(): Ellipse {
    return new Ellipse(this.x, this.y, this.halfWidth, this.halfHeight)
  }

  copyFrom(ellipse: Ellipse): this {
    this.x = ellipse.x
    this.y = ellipse.y
    this.halfWidth = ellipse.halfWidth
    this.halfHeight = ellipse.halfHeight
    return this
  }

  copyTo(ellipse: Ellipse): Ellipse {
    ellipse.copyFrom(this)
    return ellipse
  }

  getBounds(): Rectangle {
    return new Rectangle(this.x - this.halfWidth, this.y - this.halfHeight, this.halfWidth * 2, this.halfHeight * 2)
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
