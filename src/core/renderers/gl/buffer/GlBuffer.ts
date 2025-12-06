import { GlBufferTarget } from './const'

export class GlBuffer {
  target = GlBufferTarget.arrayBuffer
  byteLength = 0
  dirty = true

  constructor(
    public native: WebGLBuffer,
  ) {
    //
  }
}
