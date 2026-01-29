export class Projection2D {
  protected _array?: Float32Array<ArrayBuffer>

  x = 0
  y = 0
  width = 0
  height = 0
  flip = false

  flipY(flip: boolean): this {
    this.flip = flip
    return this
  }

  translate(x: number, y: number): this {
    this.x = x
    this.y = y
    return this
  }

  resize(width: number, height: number): this {
    this.width = width
    this.height = height
    return this
  }

  toArray(transpose?: boolean, out?: Float32Array<ArrayBuffer>): Float32Array<ArrayBuffer> {
    if (!this._array) {
      this._array = new Float32Array(9)
    }

    const array = out || this._array

    const sign = !this.flipY ? 1 : -1
    const a = 1 / this.width * 2
    const b = 0
    const c = 0
    const d = sign * (1 / this.height * 2)
    const tx = -1 - (this.x * a)
    const ty = -sign - (this.y * d)

    if (transpose) {
      array[0] = a
      array[1] = b
      array[2] = 0
      array[3] = c
      array[4] = d
      array[5] = 0
      array[6] = tx
      array[7] = ty
      array[8] = 1
    }
    else {
      array[0] = a
      array[1] = c
      array[2] = tx
      array[3] = b
      array[4] = d
      array[5] = ty
      array[6] = 0
      array[7] = 0
      array[8] = 1
    }

    return array
  }
}
