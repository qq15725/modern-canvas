import type { Canvas } from './canvas'

export interface Shape {
  name: string
  data: Uint8Array
  | Uint8ClampedArray
  | Uint16Array
  | Uint32Array
  | Int8Array
  | Int16Array
  | Int32Array
  | BigUint64Array
  | BigInt64Array
  | Float32Array
  | Float64Array
}

export interface InternalShape {
  numberPoints: number
  glBuffer: WebGLBuffer | null
}

export function registerShape(canvas: Canvas, shape: Shape) {
  const { gl, shapes } = canvas
  const { name, data } = shape

  const glBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)

  shapes.set(name, {
    numberPoints: data.byteLength / data.BYTES_PER_ELEMENT,
    glBuffer,
  })
}
