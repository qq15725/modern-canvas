import { Matrix3 } from './Matrix3'

export class Projection2D extends Matrix3 {
  constructor(
    protected _x = 0,
    protected _y = 0,
    protected _width = 0,
    protected _height = 0,
    protected _flipY = false,
  ) {
    super()
    this._performUpdateArray()
  }

  flipY(flipY: boolean): this {
    if (this._flipY !== flipY) {
      this._flipY = flipY
      this._performUpdateArray()
    }
    return this
  }

  translate(x: number, y: number): this {
    if (this._x !== x || this._y !== y) {
      this._x = x
      this._y = y
      this._performUpdateArray()
    }
    return this
  }

  resize(width: number, height: number): this {
    if (this._width !== width || this._height !== height) {
      this._width = width
      this._height = height
      this._performUpdateArray()
    }
    return this
  }

  protected _performUpdateArray(): void {
    const width = this._width
    const height = this._height

    if (!width || !height) {
      return
    }

    const x = this._x
    const y = this._y

    const sign = !this._flipY ? 1 : -1
    const a = 1 / width * 2
    const d = sign * (1 / height * 2)
    const tx = -1 - (x * a)
    const ty = -sign - (y * d)

    this.set([
      a, 0, tx,
      0, d, ty,
      0, 0, 1,
    ])
  }
}
