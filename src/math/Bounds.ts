import { Rectangle } from './graphics/shapes/Rectangle'
import { Transform2D } from './Transform2D'

export interface BoundsData {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

const defaultMatrix = new Transform2D()

export class Bounds {
  matrix = defaultMatrix
  protected _rectangle?: Rectangle

  get x(): number { return this.minX }
  set x(value: number) {
    const width = this.maxX - this.minX
    this.minX = value
    this.maxX = value + width
  }

  get y(): number { return this.minY }
  set y(value: number) {
    const height = this.maxY - this.minY
    this.minY = value
    this.maxY = value + height
  }

  get width(): number { return this.maxX - this.minX }
  set width(value: number) { this.maxX = this.minX + value }
  get height(): number { return this.maxY - this.minY }
  set height(value: number) { this.maxY = this.minY + value }
  get left(): number { return this.minX }
  get right(): number { return this.maxX }
  get top(): number { return this.minY }
  get bottom(): number { return this.maxY }
  get isPositive(): boolean { return (this.maxX - this.minX > 0) && (this.maxY - this.minY > 0) }
  get isValid(): boolean { return (this.minX + this.minY !== Infinity) }

  constructor(
    public minX = Infinity,
    public minY = Infinity,
    public maxX = -Infinity,
    public maxY = -Infinity,
  ) {
    //
  }

  isEmpty(): boolean {
    return this.minX > this.maxX || this.minY > this.maxY
  }

  get rectangle(): Rectangle {
    if (!this._rectangle) {
      this._rectangle = new Rectangle()
    }
    const rectangle = this._rectangle
    if (this.minX > this.maxX || this.minY > this.maxY) {
      rectangle.x = 0
      rectangle.y = 0
      rectangle.width = 0
      rectangle.height = 0
    }
    else {
      rectangle.copyFromBounds(this)
    }
    return rectangle
  }

  clear(): this {
    this.minX = Infinity
    this.minY = Infinity
    this.maxX = -Infinity
    this.maxY = -Infinity
    this.matrix = defaultMatrix
    return this
  }

  set(x0: number, y0: number, x1: number, y1: number) {
    this.minX = x0
    this.minY = y0
    this.maxX = x1
    this.maxY = y1
  }

  addFrame(x0: number, y0: number, x1: number, y1: number, matrix?: Transform2D): void {
    matrix ||= this.matrix
    const { a, b, c, d, tx, ty } = matrix.toObject()
    let minX = this.minX
    let minY = this.minY
    let maxX = this.maxX
    let maxY = this.maxY
    let x = (a * x0) + (c * y0) + tx
    let y = (b * x0) + (d * y0) + ty
    if (x < minX)
      minX = x
    if (y < minY)
      minY = y
    if (x > maxX)
      maxX = x
    if (y > maxY)
      maxY = y
    x = (a * x1) + (c * y0) + tx
    y = (b * x1) + (d * y0) + ty
    if (x < minX)
      minX = x
    if (y < minY)
      minY = y
    if (x > maxX)
      maxX = x
    if (y > maxY)
      maxY = y
    x = (a * x0) + (c * y1) + tx
    y = (b * x0) + (d * y1) + ty
    if (x < minX)
      minX = x
    if (y < minY)
      minY = y
    if (x > maxX)
      maxX = x
    if (y > maxY)
      maxY = y
    x = (a * x1) + (c * y1) + tx
    y = (b * x1) + (d * y1) + ty
    if (x < minX)
      minX = x
    if (y < minY)
      minY = y
    if (x > maxX)
      maxX = x
    if (y > maxY)
      maxY = y
    this.minX = minX
    this.minY = minY
    this.maxX = maxX
    this.maxY = maxY
  }

  addRect(rect: Rectangle, matrix?: Transform2D) {
    this.addFrame(rect.x, rect.y, rect.x + rect.width, rect.y + rect.height, matrix)
  }

  addBounds(bounds: BoundsData, matrix?: Transform2D) {
    this.addFrame(bounds.minX, bounds.minY, bounds.maxX, bounds.maxY, matrix)
  }

  addBoundsMask(mask: Bounds): void {
    this.minX = this.minX > mask.minX ? this.minX : mask.minX
    this.minY = this.minY > mask.minY ? this.minY : mask.minY
    this.maxX = this.maxX < mask.maxX ? this.maxX : mask.maxX
    this.maxY = this.maxY < mask.maxY ? this.maxY : mask.maxY
  }

  applyMatrix(matrix: Transform2D): void {
    const minX = this.minX
    const minY = this.minY
    const maxX = this.maxX
    const maxY = this.maxY
    // multiple bounds by matrix
    const { a, b, c, d, tx, ty } = matrix.toObject()
    let x = (a * minX) + (c * minY) + tx
    let y = (b * minX) + (d * minY) + ty
    this.minX = x
    this.minY = y
    this.maxX = x
    this.maxY = y
    x = (a * maxX) + (c * minY) + tx
    y = (b * maxX) + (d * minY) + ty
    this.minX = x < this.minX ? x : this.minX
    this.minY = y < this.minY ? y : this.minY
    this.maxX = x > this.maxX ? x : this.maxX
    this.maxY = y > this.maxY ? y : this.maxY
    x = (a * minX) + (c * maxY) + tx
    y = (b * minX) + (d * maxY) + ty
    this.minX = x < this.minX ? x : this.minX
    this.minY = y < this.minY ? y : this.minY
    this.maxX = x > this.maxX ? x : this.maxX
    this.maxY = y > this.maxY ? y : this.maxY
    x = (a * maxX) + (c * maxY) + tx
    y = (b * maxX) + (d * maxY) + ty
    this.minX = x < this.minX ? x : this.minX
    this.minY = y < this.minY ? y : this.minY
    this.maxX = x > this.maxX ? x : this.maxX
    this.maxY = y > this.maxY ? y : this.maxY
  }

  fit(rect: Rectangle): this {
    if (this.minX < rect.left)
      this.minX = rect.left
    if (this.maxX > rect.right)
      this.maxX = rect.right
    if (this.minY < rect.top)
      this.minY = rect.top
    if (this.maxY > rect.bottom)
      this.maxY = rect.bottom
    return this
  }

  fitBounds(left: number, right: number, top: number, bottom: number): this {
    if (this.minX < left)
      this.minX = left
    if (this.maxX > right)
      this.maxX = right
    if (this.minY < top)
      this.minY = top
    if (this.maxY > bottom)
      this.maxY = bottom
    return this
  }

  pad(paddingX: number, paddingY: number = paddingX): this {
    this.minX -= paddingX
    this.maxX += paddingX
    this.minY -= paddingY
    this.maxY += paddingY
    return this
  }

  ceil(): this {
    this.minX = Math.floor(this.minX)
    this.minY = Math.floor(this.minY)
    this.maxX = Math.ceil(this.maxX)
    this.maxY = Math.ceil(this.maxY)
    return this
  }

  clone(): Bounds {
    return new Bounds(this.minX, this.minY, this.maxX, this.maxY)
  }

  scale(x: number, y: number = x): this {
    this.minX *= x
    this.minY *= y
    this.maxX *= x
    this.maxY *= y
    return this
  }

  addVertexData(vertexData: Float32Array, beginOffset: number, endOffset: number, matrix?: Transform2D): void {
    let minX = this.minX
    let minY = this.minY
    let maxX = this.maxX
    let maxY = this.maxY
    matrix ||= this.matrix
    const { a, b, c, d, tx, ty } = matrix.toObject()
    for (let i = beginOffset; i < endOffset; i += 2) {
      const localX = vertexData[i]
      const localY = vertexData[i + 1]
      const x = (a * localX) + (c * localY) + tx
      const y = (b * localX) + (d * localY) + ty
      minX = x < minX ? x : minX
      minY = y < minY ? y : minY
      maxX = x > maxX ? x : maxX
      maxY = y > maxY ? y : maxY
    }
    this.minX = minX
    this.minY = minY
    this.maxX = maxX
    this.maxY = maxY
  }

  containsPoint(x: number, y: number): boolean {
    if (this.minX <= x && this.minY <= y && this.maxX >= x && this.maxY >= y) {
      return true
    }
    return false
  }
}
