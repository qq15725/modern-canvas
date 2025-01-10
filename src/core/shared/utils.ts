export const PI = Math.PI
export const PI_2 = PI * 2

let UID = 0
export function uid(object?: Record<string, any>): number {
  return object?.__SPECTOR_Object_TAG?.id ?? ++UID
}

export function isPow2(v: number): boolean {
  return !(v & (v - 1)) && (!!v)
}
