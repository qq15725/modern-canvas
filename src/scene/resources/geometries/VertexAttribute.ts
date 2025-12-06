import type { GeometryAttributeLike, VertexFormat } from '../../../core'
import { property } from 'modern-idoc'
import { Resource } from '../../../core'
import { VertexBuffer } from './VertexBuffer'

export interface VertexAttributeProperties extends Partial<GeometryAttributeLike> {
  //
}

export class VertexAttribute extends Resource implements GeometryAttributeLike {
  @property({ default: () => new VertexBuffer() }) declare buffer: VertexBuffer
  @property({ fallback: 'float32' }) declare format: VertexFormat
  @property() declare instance?: boolean
  @property() declare stride?: number
  @property() declare offset?: number
  @property() declare start?: number
  @property() declare divisor?: number

  constructor(properties?: VertexAttributeProperties) {
    super()
    this.setProperties(properties)
  }
}
