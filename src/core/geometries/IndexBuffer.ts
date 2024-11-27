import type { WebGLBufferOptions, WebGLRenderer } from '../../renderer'
import { protectedProperty } from '../decorators'
import { Resource } from '../Resource'

export interface IndexBufferOptions {
  data?: Uint16Array | null
  dynamic?: boolean
}

export class IndexBuffer extends Resource {
  @protectedProperty({ default: null }) declare data: Uint16Array | null
  @protectedProperty({ default: false }) declare dynamic: boolean

  needsUpload = false

  constructor(options?: IndexBufferOptions) {
    super()
    options && this.setProperties(options)
  }

  /** @internal */
  _glBufferOptions(): WebGLBufferOptions {
    return {
      target: 'element_array_buffer',
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

  protected override _onUpdateProperty(key: PropertyKey, value: any, oldValue: any): void {
    super._onUpdateProperty(key, value, oldValue)

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
