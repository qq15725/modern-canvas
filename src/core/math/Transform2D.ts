import type { Vector2Like } from './Vector2'
import { PI_2 } from '../shared'
import { Vector2 } from './Vector2'

export interface TransformableObject {
  position: { x: number, y: number }
  scale: { x: number, y: number }
  skew: { x: number, y: number }
  rotation: number
}

/**
 * Transform
 *
 * | a | c | tx|
 * | b | d | ty|
 * | 0 | 0 | 1 |
 */
export class Transform2D {
  protected _array?: Float32Array<ArrayBuffer>

  constructor(
    public a = 1,
    public b = 0,
    public c = 0,
    public d = 1,
    public tx = 0,
    public ty = 0,
  ) {
    //
  }

  set(a: number, b: number, c: number, d: number, tx: number, ty: number): this {
    this.a = a
    this.b = b
    this.c = c
    this.d = d
    this.tx = tx
    this.ty = ty
    return this
  }

  append(t2d: Transform2D): this {
    const a1 = this.a
    const b1 = this.b
    const c1 = this.c
    const d1 = this.d
    this.a = (t2d.a * a1) + (t2d.b * c1)
    this.b = (t2d.a * b1) + (t2d.b * d1)
    this.c = (t2d.c * a1) + (t2d.d * c1)
    this.d = (t2d.c * b1) + (t2d.d * d1)
    this.tx = (t2d.tx * a1) + (t2d.ty * c1) + this.tx
    this.ty = (t2d.tx * b1) + (t2d.ty * d1) + this.ty
    return this
  }

  appendFrom(a: Transform2D, b: Transform2D): this {
    const a1 = a.a
    const b1 = a.b
    const c1 = a.c
    const d1 = a.d
    const tx = a.tx
    const ty = a.ty

    const a2 = b.a
    const b2 = b.b
    const c2 = b.c
    const d2 = b.d

    this.a = (a1 * a2) + (b1 * c2)
    this.b = (a1 * b2) + (b1 * d2)
    this.c = (c1 * a2) + (d1 * c2)
    this.d = (c1 * b2) + (d1 * d2)
    this.tx = (tx * a2) + (ty * c2) + b.tx
    this.ty = (tx * b2) + (ty * d2) + b.ty

    return this
  }

  setTransform(
    x: number, y: number, pivotX: number, pivotY: number, scaleX: number,
    scaleY: number, rotation: number, skewX: number, skewY: number,
  ): this {
    this.a = Math.cos(rotation + skewY) * scaleX
    this.b = Math.sin(rotation + skewY) * scaleX
    this.c = -Math.sin(rotation - skewX) * scaleY
    this.d = Math.cos(rotation - skewX) * scaleY

    this.tx = x - ((pivotX * this.a) + (pivotY * this.c))
    this.ty = y - ((pivotX * this.b) + (pivotY * this.d))

    return this
  }

  prepend(t2d: Transform2D): this {
    const tx1 = this.tx

    if (t2d.a !== 1 || t2d.b !== 0 || t2d.c !== 0 || t2d.d !== 1) {
      const a1 = this.a
      const c1 = this.c

      this.a = (a1 * t2d.a) + (this.b * t2d.c)
      this.b = (a1 * t2d.b) + (this.b * t2d.d)
      this.c = (c1 * t2d.a) + (this.d * t2d.c)
      this.d = (c1 * t2d.b) + (this.d * t2d.d)
    }

    this.tx = (tx1 * t2d.a) + (this.ty * t2d.c) + t2d.tx
    this.ty = (tx1 * t2d.b) + (this.ty * t2d.d) + t2d.ty

    return this
  }

  protected _skewX?: number
  protected _skewY?: number
  protected _skewXTan = 1
  protected _skewYTan = 1

  skewX(x: number): this { return this.skew(x, 0) }
  skewY(y: number): this { return this.skew(0, y) }
  skew(x: number, y: number): this {
    if (x !== this._skewX) {
      this._skewX = x
      this._skewXTan = Math.tan(x)
    }
    if (y !== this._skewY) {
      this._skewY = y
      this._skewYTan = Math.tan(y)
    }
    this.b *= this._skewXTan
    this.c *= this._skewYTan
    return this
  }

  translateX(x: number): this { return this.translate(x, 0) }
  translateY(y: number): this { return this.translate(0, y) }
  translateZ(z: number): this { return this.translate(0, 0, z) }
  translate3d(x: number, y: number, z: number): this { return this.translate(x, y, z) }
  translate(x: number, y: number, _z = 0): this {
    // TODO z
    this.tx += x
    this.ty += y
    return this
  }

  scaleX(x: number): this { return this.scale(x, 1) }
  scaleY(y: number): this { return this.scale(1, y) }
  scale3d(x: number, y: number, z = 1): this { return this.scale(x, y, z) }
  scale(x: number, y: number, _z = 1): this {
    // TODO z
    this.a *= x
    this.d *= y
    this.c *= x
    this.b *= y
    this.tx *= x
    this.ty *= y
    return this
  }

  rotateX(x: number): this { return this.scaleY(this._rotateToScale(x)) }
  rotateY(y: number): this { return this.scaleX(this._rotateToScale(y)) }
  rotateZ(z: number): this { return this.rotate(z) }
  rotate(angle: number): this {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const a1 = this.a
    const c1 = this.c
    const tx1 = this.tx
    this.a = (a1 * cos) - (this.b * sin)
    this.b = (a1 * sin) + (this.b * cos)
    this.c = (c1 * cos) - (this.d * sin)
    this.d = (c1 * sin) + (this.d * cos)
    this.tx = (tx1 * cos) - (this.ty * sin)
    this.ty = (tx1 * sin) + (this.ty * cos)
    return this
  }

  rotate3d(x: number, y: number, z: number, rad: number): this {
    const [rx, ry, rz] = this._rotate3d(x, y, z, rad)
    rx && (this.rotateX(rx))
    ry && (this.rotateY(ry))
    rz && (this.rotateZ(rz))
    return this
  }

  protected _rotateToScale(rad: number): number {
    const val = rad / PI_2
    return val <= 0.5
      ? val * -4 + 1
      : (val - 1) * 4 + 1
  }

  protected _rotate3d(x: number, y: number, z: number, rad: number): number[] {
    if (x === 1 && y === 0 && z === 0) {
      return [rad, 0, 0]
    }
    else if (x === 0 && y === 1 && z === 0) {
      return [0, rad, 0]
    }
    else if (x === 0 && y === 0) {
      return [0, 0, rad]
    }
    else {
      const cos = Math.cos(rad)
      const sin = Math.sin(rad)
      const m11 = cos + x * x * (1 - cos)
      const m12 = x * y * (1 - cos) - z * sin
      const m13 = x * z * (1 - cos) + y * sin
      const m22 = cos + y * y * (1 - cos)
      const m23 = y * z * (1 - cos) - x * sin
      const m33 = cos + z * z * (1 - cos)
      const rotateX = -Math.atan2(-m23, m22)
      const rotateY = -Math.atan2(m13, Math.sqrt(m23 * m23 + m33 * m33))
      const rotateZ = -Math.atan2(-m12, m11)
      return [rotateX, rotateY, rotateZ]
    }
  }

  decompose(
    pivot = { x: 0, y: 0 },
    output: TransformableObject = {
      position: { x: 0, y: 0 },
      scale: { x: 0, y: 0 },
      skew: { x: 0, y: 0 },
      rotation: 0,
    },
  ): TransformableObject {
    const { a, b, c, d, tx, ty } = this
    const skewX = -Math.atan2(-c, d)
    const skewY = Math.atan2(b, a)
    const delta = Math.abs(skewX + skewY)
    if (delta < 0.00001 || Math.abs(PI_2 - delta) < 0.00001) {
      output.rotation = skewY
      output.skew.x = output.skew.y = 0
    }
    else {
      output.rotation = 0
      output.skew.x = skewX
      output.skew.y = skewY
    }
    output.scale.x = Math.sqrt((a * a) + (b * b))
    output.scale.y = Math.sqrt((c * c) + (d * d))
    output.position.x = tx + ((pivot.x * a) + (pivot.y * c))
    output.position.y = ty + ((pivot.x * b) + (pivot.y * d))
    return output
  }

  apply<P extends Vector2Like = Vector2>(pos: Vector2Like, newPos?: P): P {
    newPos = (newPos || new Vector2()) as P
    const { x, y } = pos
    newPos.x = (this.a * x) + (this.c * y) + this.tx
    newPos.y = (this.b * x) + (this.d * y) + this.ty
    return newPos
  }

  affineInvert(): this {
    const a1 = this.a
    const b1 = this.b
    const c1 = this.c
    const d1 = this.d
    const tx1 = this.tx
    const n = (a1 * d1) - (b1 * c1)
    this.a = d1 / n
    this.b = -b1 / n
    this.c = -c1 / n
    this.d = a1 / n
    this.tx = ((c1 * this.ty) - (d1 * tx1)) / n
    this.ty = -((a1 * this.ty) - (b1 * tx1)) / n
    return this
  }

  affineInverse(): this {
    return this.clone().affineInvert()
  }

  applyAffineInverse<P extends Vector2Like = Vector2>(pos: Vector2Like, newPos?: P): P {
    newPos = (newPos || new Vector2()) as P
    const { a, b, c, d, tx, ty } = this
    const id = 1 / ((a * d) + (c * -b))
    const x = pos.x
    const y = pos.y
    newPos.x = (d * id * x) + (-c * id * y) + (((ty * c) - (tx * d)) * id)
    newPos.y = (a * id * y) + (-b * id * x) + (((-ty * a) + (tx * b)) * id)
    return newPos
  }

  identity(): this {
    this.a = 1
    this.b = 0
    this.c = 0
    this.d = 1
    this.tx = 0
    this.ty = 0
    return this
  }

  isIdentity(): boolean {
    const { a, b, c, d, tx, ty } = this
    return a === 1 && b === 0 && c === 0 && d === 1 && tx === 0 && ty === 0
  }

  copyTo(t2d: Transform2D): Transform2D {
    t2d.a = this.a
    t2d.b = this.b
    t2d.c = this.c
    t2d.d = this.d
    t2d.tx = this.tx
    t2d.ty = this.ty
    return t2d
  }

  copyFrom(t2d: Transform2D): this {
    this.a = t2d.a
    this.b = t2d.b
    this.c = t2d.c
    this.d = t2d.d
    this.tx = t2d.tx
    this.ty = t2d.ty
    return this
  }

  equals(t2d: Transform2D): boolean {
    return t2d.a === this.a && t2d.b === this.b
      && t2d.c === this.c && t2d.d === this.d
      && t2d.tx === this.tx && t2d.ty === this.ty
  }

  clone(): this {
    return new Transform2D(this.a, this.b, this.c, this.d, this.tx, this.ty) as any
  }

  toArray(transpose?: boolean, out?: Float32Array<ArrayBuffer>): Float32Array<ArrayBuffer> {
    if (!this._array) {
      this._array = new Float32Array(9)
    }

    const array = out || this._array

    if (transpose) {
      array[0] = this.a
      array[1] = this.b
      array[2] = 0
      array[3] = this.c
      array[4] = this.d
      array[5] = 0
      array[6] = this.tx
      array[7] = this.ty
      array[8] = 1
    }
    else {
      array[0] = this.a
      array[1] = this.c
      array[2] = this.tx
      array[3] = this.b
      array[4] = this.d
      array[5] = this.ty
      array[6] = 0
      array[7] = 0
      array[8] = 1
    }

    return array
  }

  toString(): string {
    return `[Transform2D a=${this.a} b=${this.b} c=${this.c} d=${this.d} tx=${this.tx} ty=${this.ty}]`
  }
}
