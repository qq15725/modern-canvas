import { Matrix } from './Matrix'

/**
 * Matrix3
 *
 * | x0 | y0 | z0 |
 * | x1 | y1 | z1 |
 * | x2 | y2 | z2 |
 */
export class Matrix3 extends Matrix {
  constructor(array?: number[]) {
    super(3, 3, array)
  }

  affineInvert(): this {
    const [
      n11, n21, n31,
      n12, n22, n32,
      n13, n23, n33,
    ] = this._typedArray
    const t11 = n33 * n22 - n32 * n23
    const t12 = n32 * n13 - n33 * n12
    const t13 = n23 * n12 - n22 * n13
    const det = n11 * t11 + n21 * t12 + n31 * t13
    if (det === 0) {
      return this.set([
        0, 0, 0,
        0, 0, 0,
        0, 0, 0,
      ])
    }
    const detInv = 1 / det
    return this.set([
      t11 * detInv, (n31 * n23 - n33 * n21) * detInv, (n32 * n21 - n31 * n22) * detInv,
      t12 * detInv, (n33 * n11 - n31 * n13) * detInv, (n31 * n12 - n32 * n11) * detInv,
      t13 * detInv, (n21 * n13 - n23 * n11) * detInv, (n22 * n11 - n21 * n12) * detInv,
    ])
  }
}
