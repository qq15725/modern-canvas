import type { WebGLBufferMeta, WebGLBufferOptions, WebGLBufferTarget } from '../types'
import type { WebGLRenderer } from '../WebGLRenderer'
import { uid } from '../../../shared'
import { WebGLModule } from './WebGLModule'

declare module '../WebGLRenderer' {
  interface WebGLRenderer {
    buffer: WebGLBufferModule
  }
}

export class WebGLBufferModule extends WebGLModule {
  override install(renderer: WebGLRenderer): void {
    super.install(renderer)
    renderer.buffer = this
  }

  boundArrayBuffer: WebGLBuffer | null = null
  boundTarget: WebGLBufferTarget = 'array_buffer'

  create(options?: WebGLBufferOptions): WebGLBuffer {
    const buffer = this.gl.createBuffer()

    if (!buffer) {
      throw new Error('failed to create')
    }

    if (options) {
      this.bind({
        target: options.target,
        value: buffer,
      })
      this.update(options)
    }

    return buffer
  }

  getMeta(buffer: WebGLBuffer): WebGLBufferMeta {
    return this._renderer.getRelated(buffer, () => {
      return {
        id: uid(buffer),
        length: 0,
        byteLength: 0,
        bytesPerElement: 0,
      }
    })
  }

  update(options: WebGLBufferOptions): void
  update(buffer: WebGLBuffer, options: WebGLBufferOptions): void
  update(...args: any[]): void {
    if (args.length > 1) {
      this.bind({
        target: args[1].target,
        value: args[0],
      })
      this.update(args[1])
      return
    }

    const options = args[0] as WebGLBufferOptions

    const buffer = (options.target ?? this.boundTarget) === 'array_buffer'
      ? this.boundArrayBuffer
      : this._renderer.vertexArray.boundVertexArray.elementArrayBuffer

    if (!buffer)
      return

    const meta = this.getMeta(buffer)

    Object.assign(meta, {
      target: options.target,
      usage: options.usage,
    })

    const target = meta.target ?? this.boundTarget
    const usage = meta.usage ?? 'static_draw'
    const data = options.data

    const gl = this.gl

    let source
    if (Array.isArray(data)) {
      if (target === 'array_buffer') {
        source = new Float32Array(data)
      }
      else {
        source = new Uint32Array(data)
      }
    }
    else {
      source = data
    }

    const glTarget = this._renderer.getBindPoint(target)

    if (source && source.byteLength <= meta.byteLength) {
      gl.bufferSubData(glTarget, 0, source)
    }
    else {
      gl.bufferData(glTarget, source, this._renderer.getBindPoint(usage))
      meta.length = (source as any)?.length ?? 0
      meta.byteLength = source?.byteLength ?? 0
      meta.bytesPerElement = meta.length ? meta.byteLength / meta.length : 0
    }
  }

  bind(
    options: {
      target?: WebGLBufferTarget
      value: WebGLBuffer | null
    },
  ): void {
    let { target, value } = options

    if (value) {
      const meta = this.getMeta(value)
      target ??= meta.target ?? this.boundTarget
      meta.target = target
    }
    else {
      target ??= this.boundTarget
    }

    // bind buffer
    const glTarget = this._renderer.getBindPoint(target)
    this._renderer.gl.bindBuffer(glTarget, value)
    if (target === 'array_buffer') {
      this.boundArrayBuffer = value
    }
    else {
      this._renderer.vertexArray.boundVertexArray.elementArrayBuffer = value
    }
    this.boundTarget = target
  }

  unbind(target: WebGLBufferTarget): void {
    return this.bind({ target, value: null })
  }

  override reset(): void {
    super.reset()
    this.boundArrayBuffer = null
    this.boundTarget = 'array_buffer'
  }
}
