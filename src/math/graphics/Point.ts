export interface PointData {
  x: number
  y: number
}

export interface PointLike extends PointData {
  copyFrom: (p: PointData) => this
  copyTo: <T extends PointLike>(p: T) => T
  equals: (p: PointData) => boolean
  set: (x?: number, y?: number) => void
}

export class Point {
  protected static _shared?: Point
  static get shared(): Point {
    const point = this._shared ?? new Point()
    point.x = 0
    point.y = 0
    return point
  }

  constructor(
    public x = 0,
    public y = 0,
  ) {
    //
  }

  copyFrom(p: PointData): this {
    this.set(p.x, p.y)
    return this
  }

  copyTo<T extends PointLike>(p: T): T {
    p.set(this.x, this.y)
    return p
  }

  equals(p: PointData): boolean {
    return (p.x === this.x) && (p.y === this.y)
  }

  set(x = 0, y = x): this {
    this.x = x
    this.y = y
    return this
  }
}
