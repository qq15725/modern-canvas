import type { Rectangle } from './Rectangle'

export interface Shape {
  readonly x: number
  readonly y: number

  contains: (x: number, y: number) => boolean
  strokeContains: (x: number, y: number, strokeWidth: number) => boolean
  clone: () => Shape
  copyFrom: (source: Shape) => void
  copyTo: (destination: Shape) => void
  getBounds: (out?: Rectangle) => Rectangle

  buildOutline: (points: number[]) => void
  buildGeometry: (vertices: number[], indices: number[]) => void
}
