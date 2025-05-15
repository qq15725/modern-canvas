import { PI_2 } from '../shared'
import { Matrix3 } from './Matrix3'

export interface Transform2DObject {
  a: number
  c: number
  tx: number
  b: number
  d: number
  ty: number
  tz: number
}

/**
 * Transform
 *
 * | a | c | tx|
 * | b | d | ty|
 * | 0 | 0 | 1 |
 */
export class Transform2D extends Matrix3 {
  private static _t2d = /* @__PURE__ */ new Transform2D()

  premultiply(t2d: Transform2D): this {
    return t2d.multiply(this, this)
  }

  skewX(x: number): this { return this.skew(x, 0) }
  skewY(y: number): this { return this.skew(0, y) }
  skew(x: number, y: number): this { return this.premultiply(Transform2D._t2d.makeSkew(x, y)) }
  makeSkew(x: number, y: number): this {
    const tanX = Math.tan(x)
    const tanY = Math.tan(y)
    this.set([
      1, tanY, 0,
      tanX, 1, 0,
      0, 0, 1,
    ])
    return this
  }

  translateX(x: number): this { return this.translate(x, 0) }
  translateY(y: number): this { return this.translate(0, y) }
  translateZ(z: number): this { return this.translate(0, 0, z) }
  translate3d(x: number, y: number, z: number): this { return this.translate(x, y, z) }
  translate(x: number, y: number, z = 0): this { return this.premultiply(Transform2D._t2d.makeTranslation(x, y, z)) }
  makeTranslation(x: number, y: number, _z = 0): this {
    // TODO tz
    this.set([
      1, 0, x,
      0, 1, y,
      0, 0, 1,
    ])
    return this
  }

  scaleX(x: number): this { return this.scale(x, 1) }
  scaleY(y: number): this { return this.scale(1, y) }
  scale3d(x: number, y: number, z = 1): this { return this.scale(x, y, z) }
  scale(x: number, y: number, z = 1): this { return this.premultiply(Transform2D._t2d.makeScale(x, y, z)) }
  makeScale(x: number, y: number, _z = 1): this {
    // TODO z
    this.set([
      x, 0, 0,
      0, y, 0,
      0, 0, 1,
    ])
    return this
  }

  rotateX(x: number): this { return this.scaleY(this._rotateToScale(x)) }
  rotateY(y: number): this { return this.scaleX(this._rotateToScale(y)) }
  rotateZ(z: number): this { return this.rotate(z) }
  rotate(rad: number): this { return this.premultiply(Transform2D._t2d.makeRotation(rad)) }
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

  makeRotation(theta: number): this {
    const c = Math.cos(theta)
    const s = Math.sin(theta)
    this.set([
      c, -s, 0,
      s, c, 0,
      0, 0, 1,
    ])
    return this
  }

  applyToPoint(x: number, y: number): number[] {
    const { a, c, tx, b, d, ty } = this.toObject()
    return [
      (a * x) + (c * y) + tx,
      (b * x) + (d * y) + ty,
    ]
  }

  inverse(): this {
    return this.clone().invert()
  }

  isIdentity(): boolean {
    const { a, b, c, d, tx, ty } = this.toObject()
    return a === 1 && b === 0 && c === 0 && d === 1 && tx === 0 && ty === 0
  }

  toObject(): Transform2DObject {
    const [a, c, tx, b, d, ty, ,, tz] = this._array
    return { a, c, tx, b, d, ty, tz }
  }
}
