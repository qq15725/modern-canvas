import type { Bounds } from '../../Bounds'
import type { Transform2D } from '../../Transform2D'
import type { Shape } from './Shape'
import { buildRectangle } from '../build'
import { Point } from '../Point'

const tempPoints = [new Point(), new Point(), new Point(), new Point()]

export class Rectangle implements Shape {
  get left(): number { return this.x }
  get right(): number { return this.x + this.width }
  get top(): number { return this.y }
  get bottom(): number { return this.y + this.height }

  isEmpty(): boolean { return this.left === this.right || this.top === this.bottom }

  constructor(
    public x = 0,
    public y = 0,
    public width = 0,
    public height = 0,
  ) {
    //
  }

  copyFromBounds(bounds: Bounds): this {
    this.x = bounds.minX
    this.y = bounds.minY
    this.width = bounds.maxX - bounds.minX
    this.height = bounds.maxY - bounds.minY
    return this
  }

  contains(x: number, y: number): boolean {
    if (this.width <= 0 || this.height <= 0) {
      return false
    }

    if (x >= this.x && x < this.x + this.width) {
      if (y >= this.y && y < this.y + this.height) {
        return true
      }
    }

    return false
  }

  strokeContains(x: number, y: number, strokeWidth: number): boolean {
    const { width, height } = this

    if (width <= 0 || height <= 0)
      return false

    const _x = this.x
    const _y = this.y

    const outerLeft = _x - (strokeWidth / 2)
    const outerRight = _x + width + (strokeWidth / 2)
    const outerTop = _y - (strokeWidth / 2)
    const outerBottom = _y + height + (strokeWidth / 2)
    const innerLeft = _x + (strokeWidth / 2)
    const innerRight = _x + width - (strokeWidth / 2)
    const innerTop = _y + (strokeWidth / 2)
    const innerBottom = _y + height - (strokeWidth / 2)

    return (x >= outerLeft && x <= outerRight && y >= outerTop && y <= outerBottom)
      && !(x > innerLeft && x < innerRight && y > innerTop && y < innerBottom)
  }

  clone(): Rectangle {
    return new Rectangle(this.x, this.y, this.width, this.height)
  }

  copyFrom(rectangle: Rectangle): void {
    this.x = rectangle.x
    this.y = rectangle.y
    this.width = rectangle.width
    this.height = rectangle.height
  }

  copyTo(rectangle: Rectangle): void {
    rectangle.copyFrom(this)
  }

  intersects(other: Rectangle, transform?: Transform2D): boolean {
    if (!transform) {
      const x0 = this.x < other.x ? other.x : this.x
      const x1 = this.right > other.right ? other.right : this.right

      if (x1 <= x0) {
        return false
      }

      const y0 = this.y < other.y ? other.y : this.y
      const y1 = this.bottom > other.bottom ? other.bottom : this.bottom

      return y1 > y0
    }

    const x0 = this.left
    const x1 = this.right
    const y0 = this.top
    const y1 = this.bottom

    if (x1 <= x0 || y1 <= y0) {
      return false
    }

    const lt = tempPoints[0].set(other.left, other.top)
    const lb = tempPoints[1].set(other.left, other.bottom)
    const rt = tempPoints[2].set(other.right, other.top)
    const rb = tempPoints[3].set(other.right, other.bottom)

    if (rt.x <= lt.x || lb.y <= lt.y) {
      return false
    }

    const { a, d, b, c } = transform.toObject()

    const s = Math.sign((a * d) - (b * c))

    if (s === 0) {
      return false
    }

    ([lt.x, lt.y] = transform.applyToPoint(lt.x, lt.y));
    ([lb.x, lb.y] = transform.applyToPoint(lb.x, lb.y));
    ([rt.x, rt.y] = transform.applyToPoint(rt.x, rt.y));
    ([rb.x, rb.y] = transform.applyToPoint(rb.x, lt.y))

    if (Math.max(lt.x, lb.x, rt.x, rb.x) <= x0
      || Math.min(lt.x, lb.x, rt.x, rb.x) >= x1
      || Math.max(lt.y, lb.y, rt.y, rb.y) <= y0
      || Math.min(lt.y, lb.y, rt.y, rb.y) >= y1) {
      return false
    }

    const nx = s * (lb.y - lt.y)
    const ny = s * (lt.x - lb.x)
    const n00 = (nx * x0) + (ny * y0)
    const n10 = (nx * x1) + (ny * y0)
    const n01 = (nx * x0) + (ny * y1)
    const n11 = (nx * x1) + (ny * y1)

    if (Math.max(n00, n10, n01, n11) <= (nx * lt.x) + (ny * lt.y)
      || Math.min(n00, n10, n01, n11) >= (nx * rb.x) + (ny * rb.y)) {
      return false
    }

    const mx = s * (lt.y - rt.y)
    const my = s * (rt.x - lt.x)
    const m00 = (mx * x0) + (my * y0)
    const m10 = (mx * x1) + (my * y0)
    const m01 = (mx * x0) + (my * y1)
    const m11 = (mx * x1) + (my * y1)

    if (Math.max(m00, m10, m01, m11) <= (mx * lt.x) + (my * lt.y)
      || Math.min(m00, m10, m01, m11) >= (mx * rb.x) + (my * rb.y)) {
      return false
    }

    return true
  }

  pad(paddingX = 0, paddingY = paddingX): this {
    this.x -= paddingX
    this.y -= paddingY

    this.width += paddingX * 2
    this.height += paddingY * 2

    return this
  }

  fit(rectangle: Rectangle): this {
    const x1 = Math.max(this.x, rectangle.x)
    const x2 = Math.min(this.x + this.width, rectangle.x + rectangle.width)
    const y1 = Math.max(this.y, rectangle.y)
    const y2 = Math.min(this.y + this.height, rectangle.y + rectangle.height)

    this.x = x1
    this.width = Math.max(x2 - x1, 0)
    this.y = y1
    this.height = Math.max(y2 - y1, 0)

    return this
  }

  ceil(resolution = 1, eps = 0.001): this {
    const x2 = Math.ceil((this.x + this.width - eps) * resolution) / resolution
    const y2 = Math.ceil((this.y + this.height - eps) * resolution) / resolution

    this.x = Math.floor((this.x + eps) * resolution) / resolution
    this.y = Math.floor((this.y + eps) * resolution) / resolution

    this.width = x2 - this.x
    this.height = y2 - this.y

    return this
  }

  enlarge(rectangle: Rectangle): this {
    const x1 = Math.min(this.x, rectangle.x)
    const x2 = Math.max(this.x + this.width, rectangle.x + rectangle.width)
    const y1 = Math.min(this.y, rectangle.y)
    const y2 = Math.max(this.y + this.height, rectangle.y + rectangle.height)

    this.x = x1
    this.width = x2 - x1
    this.y = y1
    this.height = y2 - y1

    return this
  }

  getBounds(out?: Rectangle): Rectangle {
    out = out || new Rectangle()
    out.copyFrom(this)

    return out
  }

  buildOutline(points: number[]): void {
    buildRectangle.build(this, points)
  }

  buildGeometry(
    vertices: number[],
    indices: number[],
  ): void {
    const points: number[] = []
    this.buildOutline(points)
    buildRectangle.triangulate(points, vertices, 2, 0, indices, 0)
  }
}
