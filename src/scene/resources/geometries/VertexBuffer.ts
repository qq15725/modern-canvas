import type { WebGLBufferOptions, WebGLRenderer } from '../../../core'
import { property } from 'modern-idoc'
import { Resource } from '../../../core'

export interface VertexBufferOptions {
  data?: BufferSource | null
  dynamic?: boolean
}

export class VertexBuffer extends Resource {
  @property({ internal: true, default: null }) declare data: BufferSource | null
  @property({ internal: true, fallback: false }) declare dynamic: boolean

  needsUpload = false

  constructor(options?: VertexBufferOptions) {
    super()
    this.setProperties(options)
  }

  /** @internal */
  _glBufferOptions(): WebGLBufferOptions {
    return {
      target: 'array_buffer',
      data: this.data,
      usage: this.dynamic ? 'dynamic_draw' : 'static_draw',
    }
  }

  /** @internal */
  _glBuffer(renderer: WebGLRenderer): WebGLBuffer {
    return renderer.getRelated(this, () => {
      return renderer.buffer.create(this._glBufferOptions())
    })
  }

  protected override _updateProperty(key: string, value: any, oldValue: any): void {
    super._updateProperty(key, value, oldValue)

    switch (key) {
      case 'data':
      case 'dynamic':
        this.needsUpload = true
        break
    }
  }

  upload(renderer: WebGLRenderer): boolean {
    const result = this.needsUpload
    if (result) {
      this.needsUpload = false
      renderer.buffer.update(
        this._glBuffer(renderer),
        this._glBufferOptions(),
      )
    }
    return result
  }
}
