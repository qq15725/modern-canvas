import { Geometry } from './Geometry'
import { IndexBuffer } from './IndexBuffer'
import { VertexAttribute } from './VertexAttribute'
import { VertexBuffer } from './VertexBuffer'

export class UvGeometry extends Geometry {
  positionBuffer: VertexBuffer
  uvBuffer: VertexBuffer

  constructor() {
    const positionBuffer = new VertexBuffer({ data: new Float32Array(), dynamic: true })
    const uvBuffer = new VertexBuffer({ data: new Float32Array(), dynamic: true })

    super({
      vertexAttributes: {
        position: new VertexAttribute({
          buffer: positionBuffer,
          size: 2,
          normalized: false,
          type: 'float',
        }),
        uv: new VertexAttribute({
          buffer: uvBuffer,
          size: 2,
          normalized: false,
          type: 'float',
        }),
      },
      indexBuffer: new IndexBuffer({
        data: new Uint16Array(),
        dynamic: true,
      }),
    })

    this.positionBuffer = positionBuffer
    this.uvBuffer = uvBuffer
  }

  update(vertices: Float32Array, uvs: Float32Array, indices: Uint16Array): this {
    this.positionBuffer.data = vertices
    this.uvBuffer.data = uvs
    this.indexBuffer!.data = indices
    return this
  }
}
