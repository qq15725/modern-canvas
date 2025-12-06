import { Geometry } from './Geometry'
import { IndexBuffer } from './IndexBuffer'
import { VertexAttribute } from './VertexAttribute'
import { VertexBuffer } from './VertexBuffer'

export class QuadGeometry extends Geometry {
  constructor() {
    super({
      topology: 'triangle-strip',
      attributes: {
        position: new VertexAttribute({
          format: 'float32x2',
          buffer: new VertexBuffer({
            data: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
          }),
        }),
      },
      indexBuffer: new IndexBuffer({
        data: new Uint32Array([0, 1, 3, 2]),
      }),
    })
  }
}
