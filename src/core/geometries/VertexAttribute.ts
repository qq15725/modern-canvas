import { protectedProperty } from '../decorators'
import { Resource } from '../Resource'
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
  @protectedProperty() declare buffer: VertexBuffer
  @protectedProperty({ default: 0 }) declare size: number
  @protectedProperty({ default: false }) declare normalized: boolean
  @protectedProperty({ default: 'float' }) declare type: 'float' | 'unsigned_byte' | 'unsigned_short'
  @protectedProperty() stride?: number
  @protectedProperty() offset?: number
  @protectedProperty() divisor?: number

  needsUpload = false

  constructor(options?: VertexAttributeOptions) {
    super()
    this.setProperties({
      buffer: new VertexBuffer(),
      ...options,
    })
  }

  protected override _onUpdateProperty(key: PropertyKey, value: any, oldValue: any): void {
    super._onUpdateProperty(key, value, oldValue)

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
