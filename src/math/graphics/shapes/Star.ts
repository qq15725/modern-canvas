import { PI_2 } from '../../../shared'
import { Polygon } from './Polygon'

export class Star extends Polygon {
  constructor(
    x = 0,
    y = 0,
    points = 5,
    radius = 1,
    innerRadius?: number,
    rotation = 0,
  ) {
    innerRadius = innerRadius || radius / 2
    const startAngle = (-1 * Math.PI / 2) + rotation
    const len = points * 2
    const delta = PI_2 / len
    const polygon = []
    for (let i = 0; i < len; i++) {
      const r = i % 2 ? innerRadius : radius
      const angle = (i * delta) + startAngle
      polygon.push(
        x + (r * Math.cos(angle)),
        y + (r * Math.sin(angle)),
      )
    }
    super(polygon)
  }
}
