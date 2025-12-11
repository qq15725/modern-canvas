import type { RectangleLike } from './Aabb2D'
import type { Vector2Like } from './Vector2'
import { Aabb2D } from './Aabb2D'
import { DEG_TO_RAD } from './utils'

export interface RotatedRectangleLike extends RectangleLike {
  rotation?: number
}

/**
 * OrientedBoundingBox2D
 */
export class Obb2D extends Aabb2D implements RotatedRectangleLike {
  /**
   * Rotation radians
   */
  rotation: number

  get rotationDegrees(): number { return this.rotation / DEG_TO_RAD }

  constructor()
  constructor(rect: RotatedRectangleLike)
  constructor(pointArray: Vector2Like[], rotation?: number)
  constructor(...args: any[]) {
    let rotation
    let rect
    if (args.length === 0) {
      //
    }
    else if (args.length === 1) {
      rect = args[0]
      rotation = args[0].rotation
    }
    else if (args.length === 2) {
      rect = args[0]
      rotation = args[1]
    }
    if (rect) {
      super(rect)
    }
    else {
      super()
    }
    this.rotation = rotation ?? 0
  }

  override overlapsOnAxis(obb: Obb2D | Aabb2D, axis?: 'horizontal' | 'vertical'): boolean {
    if (!this.rotation && (!('rotation' in obb) || !obb.rotation)) {
      return super.overlapsOnAxis(obb, axis)
    }
    else {
      // Separating Axis Theorem
      const dotProduct = (a: Vector2Like, b: Vector2Like): number => Math.abs(a.x * b.x + a.y * b.y)
      // eslint-disable-next-line ts/explicit-function-return-type
      const createSAT = (box: Obb2D | Aabb2D) => {
        const { width, height, rotation = 0 } = box as any
        let rotate = rotation / DEG_TO_RAD
        rotate = -rotate % 180
        const deg = (rotate / 180) * Math.PI
        const axisX = { x: Math.cos(deg), y: -Math.sin(deg) }
        const axisY = { x: Math.sin(deg), y: Math.cos(deg) }
        return {
          axis: [axisX, axisY],
          projectionRadius: (axis: Vector2Like) =>
            (width / 2) * dotProduct(axis, axisX) + (height / 2) * dotProduct(axis, axisY),
        }
      }
      const data1 = createSAT(this)
      const data2 = createSAT(obb)
      const center = {
        x: this.left + this.width / 2 - (obb.left + obb.width / 2),
        y: this.top + this.height / 2 - (obb.top + obb.height / 2),
      }
      for (const axis of [...data1.axis, ...data2.axis]) {
        if (
          data1.projectionRadius(axis) + data2.projectionRadius(axis)
          < dotProduct(axis, center)
        ) {
          return false
        }
      }
      return true
    }
  }

  override toCssStyle(): { left: string, top: string, width: string, height: string, transform: string } {
    return {
      ...super.toCssStyle(),
      transform: `rotate(${this.rotationDegrees}deg)`,
    }
  }

  override toArray(): number[] {
    return [...super.toArray(), this.rotation]
  }

  override toJSON(): Required<RotatedRectangleLike> {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      rotation: this.rotation,
    }
  }

  override clone(): Obb2D {
    return new Obb2D(this.toJSON())
  }
}
