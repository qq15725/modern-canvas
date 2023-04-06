export class Matrix3 extends Float32Array {
  public static identity() {
    return new Matrix3([
      1, 0, 0,
      0, 1, 0,
      0, 0, 1,
    ])
  }

  public static translation(tx: number, ty: number) {
    return new Matrix3([
      1, 0, 0,
      0, 1, 0,
      tx, ty, 1,
    ])
  }

  public static rotation(radians: number) {
    const c = Math.cos(radians)
    const s = Math.sin(radians)
    return new Matrix3([
      c, -s, 0,
      s, c, 0,
      0, 0, 1,
    ])
  }

  public static scaling(sx: number, sy: number) {
    return new Matrix3([
      sx, 0, 0,
      0, sy, 0,
      0, 0, 1,
    ])
  }

  public multiply(matrix3: Matrix3) {
    const a00 = this[0]
    const a01 = this[1]
    const a02 = this[2]
    const a10 = this[3]
    const a11 = this[4]
    const a12 = this[5]
    const a20 = this[6]
    const a21 = this[7]
    const a22 = this[8]
    const b00 = matrix3[0]
    const b01 = matrix3[1]
    const b02 = matrix3[2]
    const b10 = matrix3[3]
    const b11 = matrix3[4]
    const b12 = matrix3[5]
    const b20 = matrix3[6]
    const b21 = matrix3[7]
    const b22 = matrix3[8]
    this[0] = b00 * a00 + b01 * a10 + b02 * a20
    this[1] = b00 * a01 + b01 * a11 + b02 * a21
    this[2] = b00 * a02 + b01 * a12 + b02 * a22
    this[3] = b10 * a00 + b11 * a10 + b12 * a20
    this[4] = b10 * a01 + b11 * a11 + b12 * a21
    this[5] = b10 * a02 + b11 * a12 + b12 * a22
    this[6] = b20 * a00 + b21 * a10 + b22 * a20
    this[7] = b20 * a01 + b21 * a11 + b22 * a21
    this[8] = b20 * a02 + b21 * a12 + b22 * a22
    return this
  }
}
