import type { WebGLRenderer } from '../../renderer'
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
    renderer: WebGLRenderer,
    material: Material = UvMaterial.instance,
    uniforms?: Record<string, any>,
  ): void {
    this.instance.draw(renderer, material, uniforms)
  }

  constructor() {
    super({
      vertexAttributes: {
        position: new VertexAttribute({
          buffer: new VertexBuffer({
            data: new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]),
            dynamic: false,
          }),
          size: 2,
          normalized: false,
          type: 'float',
        }),
        uv: new VertexAttribute({
          buffer: new VertexBuffer({
            data: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
            dynamic: false,
          }),
          size: 2,
          normalized: false,
          type: 'float',
        }),
      },
      indexBuffer: new IndexBuffer({
        data: new Uint16Array([0, 1, 2, 0, 2, 3]),
        dynamic: false,
      }),
    })
  }
}
