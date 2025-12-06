import type { BufferLikeObject, BufferLikeReactiveObject } from '../../../core'
import { property } from 'modern-idoc'
import { BufferUsage, Resource } from '../../../core'

export interface VertexBufferProperties extends Partial<Omit<BufferLikeObject, 'instanceId'>> {
  //
}

export class VertexBuffer extends Resource implements BufferLikeReactiveObject {
  @property({ fallback: BufferUsage.vertex }) declare usage: BufferUsage
  @property({ default: () => new Float32Array() }) declare data: BufferLikeObject['data']

  constructor(properties?: VertexBufferProperties) {
    super()
    this.setProperties(properties)
  }
}
