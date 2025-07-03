import type { PropertyDeclaration } from 'modern-idoc'
import type { WebGLBufferOptions, WebGLRenderer } from '../../../core'
import { property } from 'modern-idoc'
import { Resource } from '../../../core'

export interface IndexBufferOptions {
  data?: Uint16Array | null
  dynamic?: boolean
}

export class IndexBuffer extends Resource {
  @property({ protected: true, default: null }) declare data: Uint16Array | null
  @property({ protected: true, fallback: false }) declare dynamic: boolean

  needsUpload = false

  constructor(options?: IndexBufferOptions) {
    super()
    this.setProperties(options)
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

  protected override _updateProperty(key: string, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
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
