import { Matrix } from './Matrix'

/**
 * Matrix2
 *
 * | x0 | y0 |
 * | x1 | y1 |
 */
export class Matrix2 extends Matrix {
  constructor(array?: number[]) {
    super(2, 2, array)
  }
}
