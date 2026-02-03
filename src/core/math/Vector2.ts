export interface Vector2Like {
  x: number
  y: number
}

export class Vector2 implements Vector2Like {
  get width(): number { return this.x }
  set width(val) { this.x = val }

  get height(): number { return this.y }
  set height(val) { this.y = val }

  get left(): number { return this.x }
  set left(val) { this.x = val }

  get top(): number { return this.y }
  set top(val) { this.y = val }

  get x(): number { return this._x }
  set x(value: number) {
    if (this._x !== value) {
      this._x = value
      this._onUpdate?.(this)
    }
  }

  get y(): number { return this._y }
  set y(value: number) {
    if (this._y !== value) {
      this._y = value
      this._onUpdate?.(this)
    }
  }

  constructor(
    protected _x = 0,
    protected _y = 0,
    protected _onUpdate?: (vec: Vector2) => void,
  ) {
    //
  }

  set(x = 0, y = x): this {
    if (this._x !== x || this._y !== y) {
      this._x = x
      this._y = y
      this._onUpdate?.(this)
    }

    return this
  }

  add(vec: Vector2Like): this {
    this.set(this._x + vec.x, this._y + vec.y)
    return this
  }

  sub(vec: Vector2Like): this {
    this.set(this._x - vec.x, this._y - vec.y)
    return this
  }

  multiply(x = 0, y = x): this {
    this.set(this._x * x, this._y * y)
    return this
  }

  getLength(): number {
    const x = this.x
    const y = this.y
    return Math.sqrt(x * x + y * y)
  }

  getAngle(): number {
    return Math.atan2(-this.x, -this.y) + Math.PI
  }

  distanceTo(point: Vector2Like): number {
    return Math.hypot(point.x - this.x, point.y - this.y)
  }

  normalize(): this {
    const scalar = 1 / (this.getLength() || 1)
    this.set(this.x * scalar, this.y * scalar)
    return this
  }

  copyFrom(p: Vector2Like): this {
    if (this._x !== p.x || this._y !== p.y) {
      this._x = p.x
      this._y = p.y
      this._onUpdate?.(this)
    }
    return this
  }

  copyTo<T extends Vector2>(p: T): T {
    p.set(this._x, this._y)
    return p
  }

  static lerp(a: Vector2Like, b: Vector2Like, t: number): Vector2 {
    return new Vector2(b.x, b.y)
      .clone()
      .sub(a)
      .multiply(t)
      .add(a)
  }

  clone(_onUpdate?: (vec: Vector2) => void): Vector2 {
    return new Vector2(this._x, this._y, _onUpdate ?? this._onUpdate)
  }

  toJSON(): Vector2Like {
    return {
      x: this.x,
      y: this.y,
    }
  }

  destroy(): void {
    this._onUpdate = undefined
  }
}
