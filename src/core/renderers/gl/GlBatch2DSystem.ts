import type {
  BufferLike,
  BufferLikeObject,
  GeometryAttributeLike,
  GeometryLikeObject,
  ShaderLikeObject, TextureLike,
} from '../shared'
import type { GlDrawOptions } from './geometry'
import type { GlRenderer } from './GlRenderer'
import { instanceId } from '../../shared'
import { BufferUsage } from '../shared'
import { GlProgram } from './shader'
import { GlBlendMode, GlState } from './state'
import { GlSystem } from './system'

export interface Batchable2D {
  vertices: Float32Array
  indices: Uint32Array
  uvs?: Float32Array
  size?: { width: number, height: number }
  texture?: TextureLike
  blendMode?: GlBlendMode
  roundPixels?: boolean
  clipOutsideUv?: boolean
}

type DrawCall = Required<GlDrawOptions> & {
  id: number
  textures: TextureLike[]
  textureLocationMap: Map<TextureLike, number>
  blendMode: GlBlendMode
}

interface Shader {
  update: (bufferData: BufferLike['data'], indexBufferData: BufferLike['data']) => void
  draw: (options?: GlDrawOptions) => void
}

export class GlBatch2DSystem extends GlSystem {
  override install(renderer: GlRenderer): void {
    super.install(renderer)
    renderer.batch2D = this
  }

  protected _state = GlState.for2D()
  protected _batchSize = 4096 * 4

  protected _batchables: Batchable2D[] = []
  protected _vertexCount = 0
  protected _indexCount = 0
  protected _attributeBuffer: ArrayBuffer[] = []
  protected _indexBuffers: Uint32Array<ArrayBuffer>[] = []
  protected _shaders = new Map<number, Shader>()

  protected _attributes: Record<string, Partial<GeometryAttributeLike>> = {
    aPosition: { format: 'float32x2' }, // 2
    aUv: { format: 'float32x2' }, // 2
    aTextureParams: { format: 'uint8x4' }, // 1
  }

  protected _vertexSize = 2 + 2 + 1

  protected _getShader(maxTextureUnits: number): Shader {
    let shader = this._shaders.get(maxTextureUnits)
    if (!shader) {
      this._shaders.set(maxTextureUnits, shader = this._createShader(maxTextureUnits))
    }
    return shader
  }

  protected _createShader(maxTextureUnits: number): Shader {
    const renderer = this._renderer

    const shader: ShaderLikeObject = {
      instanceId: instanceId(),
      glProgram: new GlProgram({
        vertex: `precision highp float;
in vec2 aPosition;
in vec2 aUv;
in vec4 aTextureParams;

uniform vec2 size;
uniform mat3 projectionMatrix;
uniform mat3 viewMatrix;

out float vTextureId;
out float vClipOutsideUv;
out vec2 vUv;

vec2 roundPixels(vec2 position, vec2 targetSize) {
  return (floor(((position * 0.5 + 0.5) * targetSize) + 0.5) / targetSize) * 2.0 - 1.0;
}

void main(void) {
  mat3 modelMatrix = mat3(
    1.0, 0.0, 0.0,
    0.0, 1.0, 0.0,
    0.0, 0.0, 1.0
  );
  mat3 modelViewProjectionMatrix = projectionMatrix * viewMatrix * modelMatrix;
  gl_Position = vec4((modelViewProjectionMatrix * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vTextureId = aTextureParams.x;
  vClipOutsideUv = aTextureParams.y;
  if (aTextureParams.z == 1.) {
    gl_Position.xy = roundPixels(gl_Position.xy, size);
  }
  vUv = aUv;
}`,
        fragment: `precision highp float;
in float vTextureId;
in float vClipOutsideUv;
in vec2 vUv;

uniform sampler2D samplers[${maxTextureUnits}];

void main(void) {
  vec2 uv = vUv;

  vec4 color = vec4(0.0);
${Array.from({ length: maxTextureUnits }, (_, i) => {
  const text = `if (vTextureId < ${i}.5) { color = texture(samplers[${i}], uv); }`
  if (i === 0) {
    return `\n  ${text}`
  }
  return `\n  else ${text}`
}).join('')}

  if (vClipOutsideUv == 1. && (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0)) {
    color.a = 0.0;
  }

  finalColor = color;
}`,
      }),
    }

    const buffer: BufferLikeObject = {
      instanceId: instanceId(),
      usage: BufferUsage.vertex,
      data: new Float32Array(),
    }

    const indexBuffer: BufferLikeObject = {
      instanceId: instanceId(),
      usage: BufferUsage.index,
      data: new Uint32Array(),
    }

    const geometry: GeometryLikeObject = {
      instanceId: instanceId(),
      topology: 'triangle-list',
      attributes: Object.fromEntries(
        Object.entries(this._attributes)
          .map(([key, value]) => [key, { ...value, buffer }]),
      ) as Record<string, GeometryAttributeLike>,
      indexBuffer,
    }

    const samplers = new Int32Array(
      Array.from({ length: maxTextureUnits }, (_, i) => i),
    )

    return {
      update: (bufferData, indexBufferData) => {
        buffer.data = bufferData
        indexBuffer.data = indexBufferData
        renderer.buffer.update(buffer, true)
        renderer.buffer.update(indexBuffer, true)
      },
      draw: (options) => {
        shader.uniforms = {
          samplers,
          size: [
            renderer.gl.drawingBufferWidth / renderer.pixelRatio,
            renderer.gl.drawingBufferHeight / renderer.pixelRatio,
          ],
          ...renderer.shader.uniforms,
        }
        renderer.shader.updateUniforms(shader)
        renderer.geometry.bind(geometry, shader.glProgram)
        renderer.geometry.draw(options)
      },
    } as Shader
  }

  render(batchable: Batchable2D): void {
    const { vertices, indices } = batchable

    const vertexCount = vertices.length / 2

    if (this._vertexCount + vertexCount > this._batchSize) {
      this.flush()
    }

    this._vertexCount += vertexCount
    this._indexCount += indices.length
    this._batchables.push(batchable)
  }

  flush(): void {
    super.flush()
    if (this._vertexCount === 0) {
      return
    }

    const vertexCount = this._vertexCount
    const indexCount = this._indexCount
    const batchables = this._batchables
    this._batchables = []
    this._vertexCount = 0
    this._indexCount = 0

    const textureMaxUnits = this._renderer.texture.maxTextureImageUnits
    const bufferData = this._getBufferData(vertexCount)
    const float32View = new Float32Array(bufferData)
    const uint8View = new Uint8Array(bufferData)
    const indexBufferData = this._getIndexBufferData(indexCount)
    let aIndex = 0
    let iIndex = 0
    const drawCalls: DrawCall[] = []
    let drawCallUid = 0

    for (
      let len = batchables.length,
        drawCall = { id: ++drawCallUid } as DrawCall,
        textures: TextureLike[] = [],
        textureLocationMap = new Map<TextureLike, number>(),
        textureCount = 0,
        start = 0,
        end = 0;
      end < len;
      end++
    ) {
      const texture = batchables[end].texture
      const isLast = end === len - 1
      if (!texture || textureLocationMap.has(texture)) {
        if (!isLast) {
          continue
        }
      }
      else {
        textures.push(texture)
        textureLocationMap.set(texture, textureCount++)
      }

      if (isLast || textureCount >= textureMaxUnits) {
        drawCall.textures = textures
        drawCall.textureLocationMap = textureLocationMap
        textureCount = 0
        drawCall.start = iIndex

        for (let i = start; i <= end; i++) {
          const {
            indices,
            vertices,
            uvs = new Float32Array(0),
            size = { width: 0, height: 0 },
            texture,
            blendMode = GlBlendMode.normal,
            clipOutsideUv,
            roundPixels,
          } = batchables[i]

          if (start < i && drawCall.blendMode !== blendMode) {
            drawCall.size = iIndex - drawCall.start
            drawCalls.push(drawCall)
            start = i
            drawCall = { id: ++drawCallUid } as DrawCall
            drawCall.textures = textures
            drawCall.start = iIndex
          }

          const { width, height } = size
          const iIndexStart = aIndex / this._vertexSize
          const textureLocation = (texture ? textureLocationMap.get(texture) : 255) ?? 255
          const roundPixelsInt = roundPixels ? 1 : 0
          const clipOutsideUvInt = clipOutsideUv ? 1 : 0

          let uvX, uvY
          for (let len = vertices.length, i = 0; i < len; i += 2) {
            uvX = uvs[i]
            uvY = uvs[i + 1]
            if (width > 0 && height > 0) {
              uvX = Math.ceil(uvX * width) / width
              uvY = Math.ceil(uvY * height) / height
            }
            float32View[aIndex++] = vertices[i]
            float32View[aIndex++] = vertices[i + 1]
            float32View[aIndex++] = uvX
            float32View[aIndex++] = uvY
            const aU8Index = aIndex * 4
            uint8View[aU8Index] = textureLocation
            uint8View[aU8Index + 1] = clipOutsideUvInt
            uint8View[aU8Index + 2] = roundPixelsInt
            uint8View[aU8Index + 3] = 0
            aIndex++
          }

          for (let len = indices.length, i = 0; i < len; i++) {
            indexBufferData[iIndex++] = iIndexStart + indices[i]
          }

          drawCall.blendMode = blendMode
        }

        start = end + 1
        drawCall.size = iIndex - drawCall.start
        drawCalls.push(drawCall)
        drawCall = { id: ++drawCallUid } as DrawCall
        textures = []
        textureLocationMap = new Map()
      }
    }

    const shader = this._getShader(textureMaxUnits)

    shader.update(float32View, indexBufferData)

    for (let len = drawCalls.length, i = 0; i < len; i++) {
      const drawCall = drawCalls[i]
      const { start = 0, textures, textureLocationMap } = drawCall

      for (let len = textures.length, i = 0; i < len; i++) {
        const texture = textures[i]
        const location = textureLocationMap.get(texture)
        if (location !== undefined) {
          this._renderer.texture.bind(texture, location)
        }
      }

      this._state.blendMode = drawCall.blendMode
      this._renderer.state.bind(this._state)

      shader.draw({
        size: drawCall.size,
        start,
      })
    }
  }

  protected _getBufferData(size: number): ArrayBuffer {
    // 8 vertices is enough for 2 quads
    const roundedP2 = nextPow2(Math.ceil(size / 8))
    const roundedSizeIndex = log2(roundedP2)
    const roundedSize = roundedP2 * 8

    if (this._attributeBuffer.length <= roundedSizeIndex) {
      this._indexBuffers.length = roundedSizeIndex + 1
    }

    let buffer = this._attributeBuffer[roundedSize]

    if (!buffer) {
      this._attributeBuffer[roundedSize] = buffer = new ArrayBuffer(roundedSize * this._vertexSize * 4)
    }

    return buffer
  }

  protected _getIndexBufferData(size: number): Uint32Array<ArrayBuffer> {
    // 12 indices is enough for 2 quads
    const roundedP2 = nextPow2(Math.ceil(size / 12))
    const roundedSizeIndex = log2(roundedP2)
    const roundedSize = roundedP2 * 12

    if (this._indexBuffers.length <= roundedSizeIndex) {
      this._indexBuffers.length = roundedSizeIndex + 1
    }

    let buffer = this._indexBuffers[roundedSizeIndex]

    if (!buffer) {
      this._indexBuffers[roundedSizeIndex] = buffer = new Uint32Array(roundedSize)
    }

    return buffer
  }
}

export function nextPow2(v: number): number {
  v += v === 0 ? 1 : 0
  --v
  v |= v >>> 1
  v |= v >>> 2
  v |= v >>> 4
  v |= v >>> 8
  v |= v >>> 16

  return v + 1
}

export function log2(v: number): number {
  let r = (v > 0xFFFF ? 1 : 0) << 4

  v >>>= r

  let shift = (v > 0xFF ? 1 : 0) << 3

  v >>>= shift
  r |= shift
  shift = (v > 0xF ? 1 : 0) << 2
  v >>>= shift
  r |= shift
  shift = (v > 0x3 ? 1 : 0) << 1
  v >>>= shift
  r |= shift

  return r | (v >> 1)
}
