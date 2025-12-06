import type { GeometryLikeObject, GeometryLikeReactiveObject, GlRenderer, Topology } from '../../../core'
import type { Material } from '../materials/Material'
import type { VertexAttribute } from './VertexAttribute'
import { property } from 'modern-idoc'
import { Resource } from '../../../core'
import { IndexBuffer } from './IndexBuffer'

export interface GeometryProperties extends Partial<Omit<GeometryLikeObject, 'instanceId'>> {
  //
}

export class Geometry extends Resource implements GeometryLikeReactiveObject {
  @property({ fallback: 'triangle-list' }) declare topology: Topology
  @property({ default: () => ({}) }) declare attributes: Record<string, VertexAttribute>
  @property({ default: () => new IndexBuffer() }) declare indexBuffer: IndexBuffer
  @property({ fallback: 1 }) declare instanceCount: number

  constructor(properties: GeometryProperties = {}) {
    super()

    this.setProperties(properties)
  }

  draw(renderer: GlRenderer, material: Material, uniforms?: Record<string, any>): void {
    renderer.flush()
    material.activate(renderer, uniforms)
    renderer.geometry.bind(this, material.glProgram)
    renderer.geometry.draw()
    renderer.geometry.unbind()
  }
}
