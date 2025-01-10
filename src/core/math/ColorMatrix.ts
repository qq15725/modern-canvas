import { Matrix } from './Matrix'
import { Matrix4 } from './Matrix4'
import { clamp, lerp } from './utils'
import { Vector4 } from './Vector4'

/**
 * Matrix4(4x5)
 *
 * | r0 | g0 | b0 | a0 | tr |
 * | r1 | g1 | b1 | a1 | tg |
 * | r2 | g2 | b2 | a2 | tb |
 * | r3 | g3 | b3 | a3 | ta |
 */
export class ColorMatrix extends Matrix {
  constructor(array?: number[]) {
    super(4, 5, array)
  }

  hueRotate(angle = 0): this {
    const sin = Math.sin(angle)
    const cos = Math.cos(angle)
    const lumR = 0.213
    const lumG = 0.715
    const lumB = 0.072
    return this.multiply([
      lumR + cos * (1 - lumR) + sin * (-lumR),
      lumG + cos * (-lumG) + sin * (-lumG),
      lumB + cos * (-lumB) + sin * (1 - lumB),
      0,
      0,
      lumR + cos * (-lumR) + sin * (0.143),
      lumG + cos * (1 - lumG) + sin * (0.140),
      lumB + cos * (-lumB) + sin * (-0.283),
      0,
      0,
      lumR + cos * (-lumR) + sin * (-(1 - lumR)),
      lumG + cos * (-lumG) + sin * (lumG),
      lumB + cos * (1 - lumB) + sin * (lumB),
      0,
      0,
      0,
      0,
      0,
      1,
      0,
    ])
  }

  saturate(amount = 1): this {
    const x = ((amount - 1) * 2 / 3) + 1
    const y = ((x - 1) * -0.5)
    return this.multiply([
      x, y, y, 0, 0,
      y, x, y, 0, 0,
      y, y, x, 0, 0,
      0, 0, 0, 1, 0,
    ])
  }

  brightness(amount = 1): this {
    const v = amount
    return this.multiply([
      v, 0, 0, 0, 0,
      0, v, 0, 0, 0,
      0, 0, v, 0, 0,
      0, 0, 0, 1, 0,
    ])
  }

  contrast(amount = 1): this {
    const v = amount
    const o = -128 * (v - 1)
    return this.multiply([
      v, 0, 0, 0, o,
      0, v, 0, 0, o,
      0, 0, v, 0, o,
      0, 0, 0, 1, 0,
    ])
  }

  invert(amount = 1): this {
    const v = lerp(1, -1, amount)
    const o = lerp(0, 255, amount)
    return this.multiply([
      v, 0, 0, 0, o,
      0, v, 0, 0, o,
      0, 0, v, 0, o,
      0, 0, 0, 1, 0,
    ])
  }

  sepia(amount = 1): this {
    const v = clamp(0, amount, 1)
    return this.multiply([
      lerp(1, 0.393, v),
      lerp(0, 0.7689999, v),
      lerp(0, 0.18899999, v),
      0,
      0,
      lerp(0, 0.349, v),
      lerp(1, 0.6859999, v),
      lerp(0, 0.16799999, v),
      0,
      0,
      lerp(0, 0.272, v),
      lerp(0, 0.5339999, v),
      lerp(1, 0.13099999, v),
      0,
      0,
      0,
      0,
      0,
      1,
      0,
    ])
  }

  opacity(amount = 1): this {
    return this.multiply([
      1, 0, 0, 0, 0,
      0, 1, 0, 0, 0,
      0, 0, 1, 0, 0,
      0, 0, 0, amount, 0,
    ])
  }

  grayscale(amount = 1): this {
    const v = clamp(0, amount, 1)
    const r = lerp(1, 0.3, v)
    const rr = lerp(0, 0.3, v)
    const g = lerp(1, 0.59, v)
    const gg = lerp(0, 0.59, v)
    const b = lerp(1, 0.11, v)
    const bb = lerp(0, 0.11, v)
    return this.multiply([
      r, gg, bb, 0, 0,
      rr, g, bb, 0, 0,
      rr, gg, b, 0, 0,
      0, 0, 0, 1, 0,
    ])
  }

  override multiply(target: number[]): this {
    const b = target
    const a = this._array
    return this.set([
      // Red Channel
      (a[0] * b[0]) + (a[1] * b[5]) + (a[2] * b[10]) + (a[3] * b[15]),
      (a[0] * b[1]) + (a[1] * b[6]) + (a[2] * b[11]) + (a[3] * b[16]),
      (a[0] * b[2]) + (a[1] * b[7]) + (a[2] * b[12]) + (a[3] * b[17]),
      (a[0] * b[3]) + (a[1] * b[8]) + (a[2] * b[13]) + (a[3] * b[18]),
      (a[0] * b[4]) + (a[1] * b[9]) + (a[2] * b[14]) + (a[3] * b[19]) + a[4],
      // Green Channel
      (a[5] * b[0]) + (a[6] * b[5]) + (a[7] * b[10]) + (a[8] * b[15]),
      (a[5] * b[1]) + (a[6] * b[6]) + (a[7] * b[11]) + (a[8] * b[16]),
      (a[5] * b[2]) + (a[6] * b[7]) + (a[7] * b[12]) + (a[8] * b[17]),
      (a[5] * b[3]) + (a[6] * b[8]) + (a[7] * b[13]) + (a[8] * b[18]),
      (a[5] * b[4]) + (a[6] * b[9]) + (a[7] * b[14]) + (a[8] * b[19]) + a[9],
      // Blue Channel
      (a[10] * b[0]) + (a[11] * b[5]) + (a[12] * b[10]) + (a[13] * b[15]),
      (a[10] * b[1]) + (a[11] * b[6]) + (a[12] * b[11]) + (a[13] * b[16]),
      (a[10] * b[2]) + (a[11] * b[7]) + (a[12] * b[12]) + (a[13] * b[17]),
      (a[10] * b[3]) + (a[11] * b[8]) + (a[12] * b[13]) + (a[13] * b[18]),
      (a[10] * b[4]) + (a[11] * b[9]) + (a[12] * b[14]) + (a[13] * b[19]) + a[14],
      // Alpha Channel
      (a[15] * b[0]) + (a[16] * b[5]) + (a[17] * b[10]) + (a[18] * b[15]),
      (a[15] * b[1]) + (a[16] * b[6]) + (a[17] * b[11]) + (a[18] * b[16]),
      (a[15] * b[2]) + (a[16] * b[7]) + (a[17] * b[12]) + (a[18] * b[17]),
      (a[15] * b[3]) + (a[16] * b[8]) + (a[17] * b[13]) + (a[18] * b[18]),
      (a[15] * b[4]) + (a[16] * b[9]) + (a[17] * b[14]) + (a[18] * b[19]) + a[19],
    ])
  }

  toMatrix4(): Matrix4 {
    const array = this._array
    return new Matrix4([
      array[0], array[1], array[2], array[3],
      array[5], array[6], array[7], array[8],
      array[10], array[11], array[12], array[13],
      array[15], array[16], array[17], array[18],
    ])
  }

  toVector4(): Vector4 {
    const array = this._array
    return new Vector4(array[4] / 255, array[9] / 255, array[14] / 255, array[19] / 255)
  }
}
