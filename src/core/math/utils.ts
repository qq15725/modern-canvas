import { PI } from '../shared'

export const DEG_TO_RAD = PI / 180
export const RAD_TO_DEG = 180 / PI

export function clamp(min: number, val: number, max: number): number {
  return Math.max(min, Math.min(val, max))
}

export function lerp(a: number, b: number, weight: number): number {
  return (1 - weight) * a + weight * b
}

export const curves = {
  adaptive: true,
  maxLength: 10,
  minSegments: 8,
  maxSegments: 2048,
  epsilon: 0.0001,
  _segmentsCount(length: number, defaultSegments = 20) {
    if (!this.adaptive || !length || Number.isNaN(length)) {
      return defaultSegments
    }

    let result = Math.ceil(length / this.maxLength)

    if (result < this.minSegments) {
      result = this.minSegments
    }
    else if (result > this.maxSegments) {
      result = this.maxSegments
    }

    return result
  },
}
