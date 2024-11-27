import type { Polygon } from '../shapes'
import type { ShapeBuildCommand } from './ShapeBuildCommand'
import { triangulateWithHoles } from '../utils'

const emptyArray: number[] = []

export const buildPolygon: ShapeBuildCommand<Polygon> = {
  build(shape: Polygon, points: number[]): number[] {
    for (let i = 0; i < shape.points.length; i++) {
      points[i] = shape.points[i]
    }
    return points
  },
  triangulate(
    points: number[],
    //  holes: number[],
    vertices: number[],
    verticesStride: number,
    verticesOffset: number,
    indices: number[],
    indicesOffset: number,
  ) {
    triangulateWithHoles(points, emptyArray, vertices, verticesStride, verticesOffset, indices, indicesOffset)
  },
}
