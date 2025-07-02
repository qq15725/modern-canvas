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
  @property({ protected: true }) accessor buffer!: VertexBuffer
  @property() accessor size: number = 0
  @property() accessor normalized: boolean = false
  @property() accessor type: 'float' | 'unsigned_byte' | 'unsigned_short' = 'float'
  @property() accessor stride: number | undefined
  @property() accessor offset: number | undefined
  @property() accessor divisor: number | undefined

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
