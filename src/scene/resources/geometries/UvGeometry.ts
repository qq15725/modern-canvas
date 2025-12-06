import type { GeometryProperties } from './Geometry'
import { Geometry } from './Geometry'
import { IndexBuffer } from './IndexBuffer'
import { VertexAttribute } from './VertexAttribute'
import { VertexBuffer } from './VertexBuffer'

export interface UvGeometryProperties extends GeometryProperties {
  //
}

export class UvGeometry extends Geometry {
  positionBuffer: VertexBuffer
  uvBuffer: VertexBuffer

  constructor(properties: UvGeometryProperties) {
    const positionBuffer = new VertexBuffer({ data: new Float32Array() })
    const uvBuffer = new VertexBuffer({ data: new Float32Array() })

    super({
      ...properties,
      attributes: {
        position: new VertexAttribute({
          format: 'float32x2',
          buffer: positionBuffer,
        }),
        uv: new VertexAttribute({
          format: 'float32x2',
          buffer: uvBuffer,
        }),
      },
      indexBuffer: new IndexBuffer({ data: new Uint32Array() }),
    })

    this.positionBuffer = positionBuffer
    this.uvBuffer = uvBuffer
  }
}
