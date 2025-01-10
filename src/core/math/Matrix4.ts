import { Matrix } from './Matrix'

/**
 * Matrix4
 *
 * | x0 | y0 | z0 | m0 |
 * | x1 | y1 | z1 | m1 |
 * | x2 | y2 | z2 | m2 |
 */
export class Matrix4 extends Matrix {
  constructor(array?: number[]) {
    super(4, 4, array)
  }
}
