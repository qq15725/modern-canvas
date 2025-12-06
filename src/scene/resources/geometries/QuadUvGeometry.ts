import type { GlRenderer } from '../../../core'
import type { Material } from '../materials'
import { UvMaterial } from '../materials'
import { Geometry } from './Geometry'
import { IndexBuffer } from './IndexBuffer'
import { VertexAttribute } from './VertexAttribute'
import { VertexBuffer } from './VertexBuffer'

export class QuadUvGeometry extends Geometry {
  protected static _instance: QuadUvGeometry
  static get instance(): QuadUvGeometry { return this._instance ??= new this() }

  static draw(
    renderer: GlRenderer,
    material: Material = UvMaterial.instance,
    uniforms?: Record<string, any>,
  ): void {
    this.instance.draw(renderer, material, uniforms)
  }

  constructor() {
    super({
      attributes: {
        position: new VertexAttribute({
          format: 'float32x2',
          buffer: new VertexBuffer({
            data: new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]),
          }),
        }),
        uv: new VertexAttribute({
          format: 'float32x2',
          buffer: new VertexBuffer({
            data: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
          }),
        }),
      },
      indexBuffer: new IndexBuffer({
        data: new Uint32Array([0, 1, 2, 0, 2, 3]),
      }),
    })
  }
}
