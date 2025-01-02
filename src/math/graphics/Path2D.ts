import type { Transform2D } from '../Transform2D'
import type { PointData } from './Point'
import type { Shape } from './shapes'
import { Bounds } from '../Bounds'
import { buildAdaptiveBezier, buildAdaptiveQuadratic, buildArc, buildArcToSvg } from './build'
import { Ellipse, Polygon, Rectangle, RoundedRectangle } from './shapes'
import { SVGPath } from './SVGPath'

export interface Path2DShape {
  shape: Shape
  transform?: Transform2D
}

const tempRectangle = new Rectangle()

export class Path2D {
  protected _polygon?: Polygon
  protected _bounds = new Bounds()
  shapes: Path2DShape[] = []

  get bounds(): Bounds {
    const bounds = this._bounds
    bounds.clear()
    const shapes = this.shapes
    for (let i = 0; i < shapes.length; i++) {
      const shape = shapes[i]
      const boundsRect = shape.shape.getBounds(tempRectangle)
      if (shape.transform) {
        bounds.addRect(boundsRect, shape.transform)
      }
      else {
        bounds.addRect(boundsRect)
      }
    }
    return bounds
  }

  startPolygon(x: number, y: number): this {
    if (this._polygon) {
      this.endPolygon()
    }
    this._polygon = new Polygon([x, y])
    return this
  }

  endPolygon(closePath = false): this {
    const polygon = this._polygon
    if (polygon && polygon.points.length > 2) {
      polygon.closed = closePath
      this.shapes.push({
        shape: polygon,
      })
    }
    this._polygon = undefined
    return this
  }

  ensurePolygon(start = true): void {
    if (this._polygon)
      return
    this._polygon = new Polygon()
    if (start) {
      const lastShape = this.shapes[this.shapes.length - 1]
      if (lastShape) {
        let lx = lastShape.shape.x
        let ly = lastShape.shape.y
        if (!lastShape.transform?.isIdentity()) {
          const t = lastShape.transform!.toObject()
          const tempX = lx
          lx = (t.a * lx) + (t.c * ly) + t.tx
          ly = (t.b * tempX) + (t.d * ly) + t.ty
        }
        this._polygon.points.push(lx, ly)
      }
      else {
        this._polygon.points.push(0, 0)
      }
    }
  }

  beginPath(): this {
    return this
  }

  moveTo(x: number, y: number): this {
    this.startPolygon(x, y)
    return this
  }

  lineTo(x: number, y: number): this {
    this.ensurePolygon()
    const points = this._polygon!.points
    const fromX = points[points.length - 2]
    const fromY = points[points.length - 1]
    if (fromX !== x || fromY !== y) {
      points.push(x, y)
    }
    return this
  }

  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number, smoothness?: number): this {
    this.ensurePolygon()
    // ensure distance from last point to first control point is not too small
    buildAdaptiveBezier(
      this._polygon!.points,
      this._polygon!.lastX,
      this._polygon!.lastY,
      cp1x,
      cp1y,
      cp2x,
      cp2y,
      x,
      y,
      smoothness,
    )
    return this
  }

  quadraticCurveTo(cp1x: number, cp1y: number, x: number, y: number, smoothing?: number): this {
    this.ensurePolygon()
    // ensure distance from last point to first control point is not too small
    buildAdaptiveQuadratic(
      this._polygon!.points,
      this._polygon!.lastX,
      this._polygon!.lastY,
      cp1x,
      cp1y,
      x,
      y,
      smoothing,
    )
    return this
  }

  rect(x: number, y: number, width: number, height: number, transform?: Transform2D): void {
    this.addShape(new Rectangle(x, y, width, height), transform)
  }

  roundRect(x: number, y: number, width: number, height: number, radii: number, transform?: Transform2D): void {
    this.addShape(new RoundedRectangle(x, y, width, height, radii), transform)
  }

  ellipse(x: number, y: number, radiusX: number, radiusY: number, transform?: Transform2D): void {
    this.addShape(new Ellipse(x, y, radiusX, radiusY), transform)
  }

  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise: boolean): this {
    this.ensurePolygon(false)
    const points = this._polygon!.points
    buildArc(points, x, y, radius, startAngle, endAngle, counterclockwise)
    return this
  }

  ellipticalArc(
    rx: number,
    ry: number,
    xAxisRotation: number,
    largeArcFlag: number,
    sweepFlag: number,
    x: number,
    y: number,
  ): this {
    buildArcToSvg(
      this._polygon!.points,
      this._polygon!.lastX,
      this._polygon!.lastY,
      x,
      y,
      rx,
      ry,
      xAxisRotation,
      largeArcFlag,
      sweepFlag,
    )
    return this
  }

  poly(points: number[] | PointData[], close = false, transform?: Transform2D): this {
    const polygon = new Polygon(points)
    polygon.closed = close
    this.addShape(polygon, transform)
    return this
  }

  addShape(shape: Shape, transform?: Transform2D): this {
    this.endPolygon()
    this.shapes.push({ shape, transform })
    return this
  }

  addPath(path2D: Path2D): this {
    this.endPolygon()
    path2D.endPolygon()
    path2D.shapes.forEach((shape) => {
      this.shapes.push(shape)
    })
    return this
  }

  addSVGPath(d: string): this {
    this.addPath(new SVGPath(d).path2D)
    return this
  }

  closePath(): this {
    this.endPolygon(true)
    return this
  }

  buildOutline(points: number[] = []): number[] {
    this.shapes.forEach(item => item.shape.buildOutline(points))
    return points
  }

  buildGeometry(vertices: number[] = [], indices: number[] = []): { vertices: number[], indices: number[] } {
    this.shapes.forEach(item => item.shape.buildGeometry(vertices, indices))
    return {
      vertices,
      indices,
    }
  }
}
