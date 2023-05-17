import type { App } from './app'

export interface UserShape {
  type?: '2d' | '3d'
  mode?: keyof App['drawModes']
  buffer?: Uint8Array
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

export interface Shape {
  mode: GLenum
  count: number
  buffer: WebGLBuffer | null
}

export function registerShape(app: App, name: string, userShape: UserShape) {
  const { context, shapes, drawModes } = app
  const {
    type = '2d',
    mode = 'triangles',
    buffer = new Float32Array([]),
  } = userShape

  const glBuffer = context.createBuffer()
  context.bindBuffer(context.ARRAY_BUFFER, glBuffer)
  context.bufferData(context.ARRAY_BUFFER, buffer, context.STATIC_DRAW)

  shapes.set(name, {
    mode: drawModes[mode],
    count: (buffer.byteLength / buffer.BYTES_PER_ELEMENT) / (type === '2d' ? 2 : 3),
    buffer: glBuffer,
  })
}
