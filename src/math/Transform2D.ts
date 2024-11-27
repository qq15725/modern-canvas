import { PI_2 } from '../shared'
import { Matrix3 } from './Matrix3'

/**
 * Transform
 *
 * | a | c | tx|
 * | b | d | ty|
 * | 0 | 0 | 1 |
 */
export class Transform2D extends Matrix3 {
  protected _cx = 1
  protected _sx = 0
  protected _cy = 0
  protected _sy = 1
  protected _translateX = 0
  protected _translateY = 0
  protected _translateZ = 1
  protected _scaleX = 1
  protected _scaleY = 1
  protected _skewX = 0
  protected _skewY = 0
  protected _rotate = 0

  dirtyId = 0
  protected _needsUpdateArray = false
  protected _needsUpdateFields = false

  constructor(
    public autoUpdate = true,
  ) {
    super()
  }

  protected override _onUpdate(array: number[]): void {
    super._onUpdate(array)
    this._requestUpdateFields()
  }

  protected _updateSkew(): void {
    this._cx = Math.cos(this._rotate + this._skewY)
    this._sx = Math.sin(this._rotate + this._skewY)
    this._cy = -Math.sin(this._rotate - this._skewX) // cos, added PI/2
    this._sy = Math.cos(this._rotate - this._skewX) // sin, added PI/2
  }

  protected _requestUpdateArray(): void {
    if (this.autoUpdate) {
      this._performUpdateArray()
    }
    else {
      this._needsUpdateArray = true
    }
  }

  protected _requestUpdateFields(): void {
    if (this.autoUpdate) {
      this._performUpdateFields()
    }
    else {
      this._needsUpdateFields = true
    }
  }

  protected _performUpdateArray(): void {
    const a = this._cx * this._scaleX
    const b = this._sx * this._scaleX
    const c = this._cy * this._scaleY
    const d = this._sy * this._scaleY
    const tx = this._translateX
    const ty = this._translateY
    const tz = this._translateZ
    const array = this._array
    this._array = [
      a,
      c,
      tx,
      b,
      d,
      ty,
      array[6],
      array[7],
      tz,
    ]
    this.dirtyId++
  }

  protected _performUpdateFields(): void {
    const {
      a,
      c,
      tx,
      b,
      d,
      ty,
      tz,
    } = this.toObject()
    const skewX = -Math.atan2(-c, d)
    const skewY = Math.atan2(b, a)
    const delta = Math.abs(skewX + skewY)
    if (delta < 0.00001 || Math.abs(PI_2 - delta) < 0.00001) {
      this._rotate = skewY
      this._skewX = this._skewY = 0
    }
    else {
      this._rotate = 0
      this._skewX = skewX
      this._skewY = skewY
    }
    this._scaleX = Math.sqrt((a * a) + (b * b))
    this._scaleY = Math.sqrt((c * c) + (d * d))
    this._translateX = tx
    this._translateY = ty
    this._translateZ = tz
    this.dirtyId++
  }

  skew(x: number, y: number): this {
    this._skewX = x
    this._skewY = y
    this._updateSkew()
    this._requestUpdateArray()
    return this
  }

  skewX(x: number): this { return this.skew(x, this._skewY) }
  skewY(y: number): this { return this.skew(this._skewX, y) }

  translate(x: number, y: number, z = 1): this {
    this._translateX = x
    this._translateY = y
    this._translateZ = z
    this._requestUpdateArray()
    return this
  }

  translateX(x: number): this { return this.translate(x, this._translateY) }
  translateY(y: number): this { return this.translate(this._translateX, y) }
  translateZ(z: number): this { return this.translate(this._translateX, this._translateY, z) }
  translate3d(x: number, y: number, z: number): this { return this.translate(x, y, z) }

  scale(x: number, y: number, _z = 1): this {
    this._scaleX = x
    this._scaleY = y
    this._requestUpdateArray()
    return this
  }

  scaleX(x: number): this { return this.scale(x, this._scaleY) }
  scaleY(y: number): this { return this.scale(this._scaleX, y) }
  scale3d(x: number, y: number, z: number): this { return this.scale(x, y, z) }

  rotate(rad: number): this {
    this._rotate = rad
    this._updateSkew()
    this._requestUpdateArray()
    return this
  }

  rotateX(x: number): this { return this.scaleY(this._rotateToScale(x)) }
  rotateY(y: number): this { return this.scaleX(this._rotateToScale(y)) }
  rotateZ(z: number): this { return this.rotate(z) }
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

  update(): boolean {
    let updated = false

    if (this._needsUpdateArray) {
      this._needsUpdateArray = false
      this._performUpdateArray()
      updated = true
    }

    if (this._needsUpdateFields) {
      this._needsUpdateFields = false
      this._performUpdateFields()
      updated = true
    }

    return updated
  }

  isIdentity(): boolean {
    const { a, b, c, d, tx, ty } = this.toObject()
    return a === 1 && b === 0 && c === 0 && d === 1 && tx === 0 && ty === 0
  }

  toObject() {
    const [a, c, tx, b, d, ty, ,, tz] = this._array
    return { a, c, tx, b, d, ty, tz }
  }
}
