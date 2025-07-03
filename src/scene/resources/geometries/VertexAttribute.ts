import type { PropertyDeclaration } from 'modern-idoc'
import { property } from 'modern-idoc'
import { Resource } from '../../../core'
import { VertexBuffer } from './VertexBuffer'

export interface VertexAttributeOptions {
  buffer?: VertexBuffer
  size?: number
  normalized?: boolean
  type?: 'float' | 'unsigned_byte' | 'unsigned_short'
  stride?: number
  offset?: number
  divisor?: number
}

export class VertexAttribute extends Resource {
  @property({ protected: true }) declare buffer: VertexBuffer
  @property({ fallback: 0 }) declare size: number
  @property({ fallback: false }) declare normalized: boolean
  @property({ fallback: 'float' }) declare type: 'float' | 'unsigned_byte' | 'unsigned_short'
  @property() declare stride: number | undefined
  @property() declare offset: number | undefined
  @property() declare divisor: number | undefined

  needsUpload = false

  constructor(options?: VertexAttributeOptions) {
    super()
    this.setProperties({
      buffer: new VertexBuffer(),
      ...options,
    })
  }

  protected override _updateProperty(key: string, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'buffer':
      case 'size':
      case 'normalized':
      case 'type':
      case 'stride':
      case 'offset':
      case 'divisor':
        this.needsUpload = true
        break
    }
  }

  upload(): boolean {
    const result = this.needsUpload
    if (result) {
      this.needsUpload = false
    }
    return result
  }
}
