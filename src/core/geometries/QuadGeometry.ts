import { Geometry } from './Geometry'
import { IndexBuffer } from './IndexBuffer'
import { VertexAttribute } from './VertexAttribute'
import { VertexBuffer } from './VertexBuffer'

export class QuadGeometry extends Geometry {
  constructor() {
    super({
      vertexAttributes: {
        position: new VertexAttribute({
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
        data: new Uint16Array([0, 1, 3, 2]),
        dynamic: false,
      }),
      mode: 'triangle_strip',
    })
  }
}
