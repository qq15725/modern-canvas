import { Vector, type VectorLike } from './Vector'

/**
 * Vector2
 */
export class Vector2 extends Vector {
  get x() { return this._array[0] }
  set x(val) {
    const [x, y] = this._array
    if (x !== val) {
      this.set(val, y)
    }
  }

  get y() { return this._array[1] }
  set y(val) {
    const [x, y] = this._array
    if (y !== val) {
      this.set(x, val)
    }
  }

  get width() { return this.x }
  set width(val) { this.x = val }

  get height() { return this.y }
  set height(val) { this.y = val }

  constructor(x: VectorLike = 0, y?: number) {
    super(2)
    this.set(typeof x === 'number' ? [x, y ?? x] : x)
  }

  update(x: number, y: number) {
    const [oldX, oldY] = this._array
    if (oldX !== x || oldY !== y) {
      this.set(x, y)
    }
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
      .sub(new Vector2(a))
      .multiply(t)
      .add(new Vector2(a))
  }
}
