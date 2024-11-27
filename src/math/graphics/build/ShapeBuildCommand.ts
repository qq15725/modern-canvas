import type { Shape } from '../shapes'

export interface ShapeBuildCommand<T extends Shape = Shape> {
  build: (shape: T, points: number[]) => void
  triangulate: (
    points: number[],
    vertices: number[],
    verticesStride: number,
    verticesOffset: number,
    indices: number[],
    indicesOffset: number
  ) => void
}
