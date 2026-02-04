import { PI } from '../shared'

export const DEG_TO_RAD = PI / 180
export const RAD_TO_DEG = 180 / PI

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(val, max))
}

export function lerp(a: number, b: number, weight: number): number {
  return (1 - weight) * a + weight * b
}
