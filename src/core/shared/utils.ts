export const PI = Math.PI
export const PI_2 = PI * 2

export function isPow2(v: number): boolean {
  return !(v & (v - 1)) && (!!v)
}
