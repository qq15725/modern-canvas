import type { GlDrawModes } from './gl'
import type { Canvas } from './canvas'

export interface Shape {
  name: string
  type?: '2d' | '3d'
  mode?: keyof GlDrawModes
  data?: Uint8Array
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
  mode: GLenum
  count: number
  buffer: WebGLBuffer | null
}

export function registerShape(canvas: Canvas, shape: Shape) {
  const { gl, shapes, glDrawModes } = canvas
  const {
    name,
    type = '2d',
    mode = 'triangles',
    data = new Float32Array([]),
  } = shape

  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)

  shapes.set(name, {
    mode: glDrawModes[mode],
    count: (data.byteLength / data.BYTES_PER_ELEMENT) / (type === '2d' ? 2 : 3),
    buffer,
  })
}
