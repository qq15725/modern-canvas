import type { BufferLike } from '../../shared'
import type { GlRenderer } from '../GlRenderer'
import { BufferUsage } from '../../shared'
import { GlSystem } from '../system'
import { GlBufferTarget } from './const'
import { GlBuffer } from './GlBuffer'

export class GlBufferSystem extends GlSystem {
  override install(renderer: GlRenderer): void {
    super.install(renderer)
    renderer.buffer = this
  }

  readonly buffers = new Map<number, BufferLike>()
  readonly glBuffers = new Map<number, GlBuffer>()

  getGlBuffer(source: BufferLike): GlBuffer {
    return this.glBuffers.get(source.instanceId)
      || this._createGlBuffer(source)
  }

  protected _createGlBuffer(buffer: BufferLike): GlBuffer {
    const gl = this._gl
    const glBuffer = new GlBuffer(gl.createBuffer())
    let target = GlBufferTarget.arrayBuffer
    if ((buffer.usage & BufferUsage.index)) {
      target = GlBufferTarget.elementArrayBuffer
    }
    else if ((buffer.usage & BufferUsage.uniform)) {
      target = GlBufferTarget.uniformBuffer
    }
    glBuffer.target = target
    this.glBuffers.set(buffer.instanceId, glBuffer)
    if (!this.buffers.get(buffer.instanceId)) {
      if ('on' in buffer) {
        buffer.on('updateProperty', (key) => {
          switch (key) {
            case 'usage':
            case 'data':
              glBuffer.dirty = true
              break
          }
        })
        buffer.on('destroy', () => {
          this.buffers.delete(buffer.instanceId)
        })
      }
      this.buffers.set(buffer.instanceId, buffer)
    }
    return glBuffer
  }

  bind(buffer: BufferLike): void {
    const gl = this._gl
    const glBuffer = this.getGlBuffer(buffer)
    gl.bindBuffer(glBuffer.target, glBuffer.native)
  }

  update(buffer: BufferLike, force = false): GlBuffer {
    const glBuffer = this.getGlBuffer(buffer)

    if (!force && !glBuffer.dirty) {
      return glBuffer
    }

    glBuffer.dirty = false

    const { _gl: gl } = this
    const { usage, data } = buffer

    gl.bindBuffer(glBuffer.target, glBuffer.native)

    const drawType = (usage & BufferUsage.static)
      ? gl.STATIC_DRAW
      : gl.DYNAMIC_DRAW

    if (data) {
      if (glBuffer.byteLength >= data.byteLength) {
        const updateSize = (data.length * data.BYTES_PER_ELEMENT)
        gl.bufferSubData(glBuffer.target, 0, data, 0, updateSize / data.BYTES_PER_ELEMENT)
      }
      else {
        glBuffer.byteLength = data.byteLength
        gl.bufferData(glBuffer.target, data, drawType)
      }
    }
    else {
      glBuffer.byteLength = 0
      gl.bufferData(glBuffer.target, glBuffer.byteLength, drawType)
    }

    return glBuffer
  }

  override reset(): void {
    super.reset()
    this.buffers.clear()
    this.glBuffers.clear()
  }
}
