import type { Canvas } from './canvas'

export interface RegisterBufferOptions {
  name: string
  target?: keyof Canvas['glBufferTargets']
  value: Uint8Array
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

export interface Buffer {
  numberPoints: number
  glBuffer: WebGLBuffer | null
}

export function registerBuffer(canvas: Canvas, options: RegisterBufferOptions) {
  const { gl, buffers, glBufferTargets } = canvas
  const {
    name,
    target = 'arrayBuffer',
    value,
  } = options

  const glBuffer = gl.createBuffer()
  if (glBuffer) {
    const glTarget = glBufferTargets[target]
    gl.bindBuffer(glTarget, glBuffer)
    gl.bufferData(glTarget, value, gl.STATIC_DRAW)
  }

  buffers.set(name, {
    numberPoints: value.byteLength / value.BYTES_PER_ELEMENT,
    glBuffer,
  })
}
