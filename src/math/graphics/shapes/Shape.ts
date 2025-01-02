import type { Rectangle } from './Rectangle'

export interface Shape {
  x: number
  y: number

  contains: (x: number, y: number) => boolean
  strokeContains: (x: number, y: number, strokeWidth: number) => boolean
  getBounds: (out?: Rectangle) => Rectangle

  buildOutline: (points: number[]) => void
  buildGeometry: (vertices: number[], indices: number[]) => void
}
