import type { Shape } from './Shape'
import { buildCircle } from '../build'
import { Rectangle } from './Rectangle'

// Check corner within stroke width
function isCornerWithinStroke(pX: number, pY: number, cornerX: number, cornerY: number, radius: number, halfStrokeWidth: number): boolean {
  const dx = pX - cornerX
  const dy = pY - cornerY
  const distance = Math.sqrt((dx * dx) + (dy * dy))

  return distance >= radius - halfStrokeWidth && distance <= radius + halfStrokeWidth
}

export class RoundedRectangle implements Shape {
  constructor(
    public x = 0,
    public y = 0,
    public width = 0,
    public height = 0,
    public radius = width / 4,
  ) {
    //
  }

  getBounds(out?: Rectangle): Rectangle {
    out = out || new Rectangle()

    out.x = this.x
    out.y = this.y
    out.width = this.width
    out.height = this.height

    return out
  }

  clone(): RoundedRectangle {
    return new RoundedRectangle(this.x, this.y, this.width, this.height, this.radius)
  }

  copyFrom(rectangle: RoundedRectangle): this {
    this.x = rectangle.x
    this.y = rectangle.y
    this.width = rectangle.width
    this.height = rectangle.height

    return this
  }

  copyTo(rectangle: RoundedRectangle): RoundedRectangle {
    rectangle.copyFrom(this)

    return rectangle
  }

  contains(x: number, y: number): boolean {
    if (this.width <= 0 || this.height <= 0) {
      return false
    }
    if (x >= this.x && x <= this.x + this.width) {
      if (y >= this.y && y <= this.y + this.height) {
        const radius = Math.max(0, Math.min(this.radius, Math.min(this.width, this.height) / 2))

        if ((y >= this.y + radius && y <= this.y + this.height - radius)
          || (x >= this.x + radius && x <= this.x + this.width - radius)) {
          return true
        }
        let dx = x - (this.x + radius)
        let dy = y - (this.y + radius)
        const radius2 = radius * radius

        if ((dx * dx) + (dy * dy) <= radius2) {
          return true
        }
        dx = x - (this.x + this.width - radius)
        if ((dx * dx) + (dy * dy) <= radius2) {
          return true
        }
        dy = y - (this.y + this.height - radius)
        if ((dx * dx) + (dy * dy) <= radius2) {
          return true
        }
        dx = x - (this.x + radius)
        if ((dx * dx) + (dy * dy) <= radius2) {
          return true
        }
      }
    }

    return false
  }

  strokeContains(pX: number, pY: number, strokeWidth: number): boolean {
    const { x, y, width, height, radius } = this

    const halfStrokeWidth = strokeWidth / 2
    const innerX = x + radius
    const innerY = y + radius
    const innerWidth = width - (radius * 2)
    const innerHeight = height - (radius * 2)
    const rightBound = x + width
    const bottomBound = y + height

    // Check if point is within the vertical edges (excluding corners)
    if (((pX >= x - halfStrokeWidth && pX <= x + halfStrokeWidth)
      || (pX >= rightBound - halfStrokeWidth && pX <= rightBound + halfStrokeWidth))
    && pY >= innerY && pY <= innerY + innerHeight) {
      return true
    }

    // Check if point is within the horizontal edges (excluding corners)
    if (((pY >= y - halfStrokeWidth && pY <= y + halfStrokeWidth)
      || (pY >= bottomBound - halfStrokeWidth && pY <= bottomBound + halfStrokeWidth))
    && pX >= innerX && pX <= innerX + innerWidth) {
      return true
    }

    // Top-left, top-right, bottom-right, bottom-left corners
    return (
      // Top-left
      (pX < innerX && pY < innerY
        && isCornerWithinStroke(pX, pY, innerX, innerY, radius, halfStrokeWidth))
      //  top-right
      || (pX > rightBound - radius && pY < innerY
        && isCornerWithinStroke(pX, pY, rightBound - radius, innerY, radius, halfStrokeWidth))
      // bottom-right
      || (pX > rightBound - radius && pY > bottomBound - radius
        && isCornerWithinStroke(pX, pY, rightBound - radius, bottomBound - radius, radius, halfStrokeWidth))
      // bottom-left
      || (pX < innerX && pY > bottomBound - radius
        && isCornerWithinStroke(pX, pY, innerX, bottomBound - radius, radius, halfStrokeWidth)))
  }

  buildOutline(points: number[]): void {
    buildCircle.build(this, points)
  }

  buildGeometry(vertices: number[], indices: number[]): void {
    const points: number[] = []
    this.buildOutline(points)
    buildCircle.triangulate(points, vertices, 2, 0, indices, 0)
  }
}
