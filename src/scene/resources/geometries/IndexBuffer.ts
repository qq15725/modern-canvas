import type { BufferLikeObject, BufferLikeReactiveObject } from '../../../core'
import { property } from 'modern-idoc'
import { BufferUsage, Resource } from '../../../core'

export interface IndexBufferProperties extends Partial<Omit<BufferLikeObject, 'instanceId'>> {
  //
}

export class IndexBuffer extends Resource implements BufferLikeReactiveObject {
  @property({ fallback: BufferUsage.index }) declare usage: BufferUsage
  @property({ default: () => new Uint32Array() }) declare data: BufferLikeObject['data']

  constructor(properties?: IndexBufferProperties) {
    super()
    this.setProperties(properties)
  }
}
