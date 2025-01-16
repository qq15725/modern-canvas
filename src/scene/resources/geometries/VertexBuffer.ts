import type { PropertyDeclaration, WebGLBufferOptions, WebGLRenderer } from '../../../core'
import { protectedProperty, Resource } from '../../../core'

export interface VertexBufferOptions {
  data?: BufferSource | null
  dynamic?: boolean
}

export class VertexBuffer extends Resource {
  @protectedProperty({ default: null }) declare data: BufferSource | null
  @protectedProperty({ default: false }) declare dynamic: boolean

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

  protected override _updateProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateProperty(key, value, oldValue, declaration)

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
