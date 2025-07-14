import type { VectorLike } from './Vector'
import { Vector } from './Vector'

/**
 * Vector2
 */
export class Vector2 extends Vector {
  get x(): number { return this._array[0] }
  set x(val) {
    const [x, y] = this._array
    if (x !== val) {
      this.set(val, y)
    }
  }

  get y(): number { return this._array[1] }
  set y(val) {
    const [x, y] = this._array
    if (y !== val) {
      this.set(x, val)
    }
  }

  get width(): number { return this.x }
  set width(val) { this.x = val }

  get height(): number { return this.y }
  set height(val) { this.y = val }

  get left(): number { return this.x }
  set left(val) { this.x = val }

  get top(): number { return this.y }
  set top(val) { this.y = val }

  constructor(x: VectorLike = 0, y?: number) {
    super(2)
    this.set(typeof x === 'number' ? [x, y ?? x] : x)
  }

  update(x: number, y: number): this {
    const [oldX, oldY] = this._array
    if (oldX !== x || oldY !== y) {
      this.set(x, y)
    }
    return this
  }

  getLength(): number {
    const [x, y] = this._array
    return Math.sqrt(x * x + y * y)
  }

  getAngle(): number {
    const [x, y] = this._array
    return Math.atan2(-x, -y) + Math.PI
  }

  distanceTo(point: Vector2): number {
    return Math.hypot(point.x - this.x, point.y - this.y)
  }

  normalize(): this {
    const [x, y] = this._array
    const scalar = 1 / (this.getLength() || 1)
    this.set(x * scalar, y * scalar)
    return this
  }

  static lerp(a: VectorLike, b: VectorLike, t: number): Vector2 {
    return new Vector2(b)
      .clone()
      .sub(a)
      .multiply(t)
      .add(a)
  }
}
