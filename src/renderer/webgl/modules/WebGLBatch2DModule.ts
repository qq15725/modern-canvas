import type { WebGLDrawOptions, WebGLVertexArrayObjectOptions, WebGLVertexAttrib } from '../types'
import type { WebGLRenderer } from '../WebGLRenderer'
import { WebGLBlendMode } from './WebGLBlendMode'
import { WebGLModule } from './WebGLModule'
import { WebGLState } from './WebGLStateModule'

export interface Batchable2D {
  vertices: number[]
  indices: number[]
  uvs?: number[]
  texture?: WebGLTexture
  backgroundColor?: number
  tint?: number
  colorMatrix?: ArrayLike<number>
  colorMatrixOffset?: ArrayLike<number>
  blendMode?: WebGLBlendMode
}

type DrawCall = Required<WebGLDrawOptions> & {
  id: number
  textures: WebGLTexture[]
  textureLocationMap: Map<WebGLTexture, number>
  blendMode: WebGLBlendMode
}

interface Shader {
  update: (attributeBuffer: ArrayBuffer, indexBuffer: Uint16Array) => void
  draw: (options?: WebGLDrawOptions) => void
}

export class WebGLBatch2DModule extends WebGLModule {
  override install(renderer: WebGLRenderer): void {
    super.install(renderer)
    renderer.batch2D = this
  }

  protected _state = WebGLState.for2D()
  protected _batchSize = 4096 * 4
  protected _vertexSize = 1 + 2 + 2 + 1 + 1 + 4 + 16
  protected _drawCallUid = 0

  protected _defaultTint = 0xFFFFFFFF
  protected _defaultBackgroundColor = 0x00000000
  protected _defaultColorMatrixOffset = [0, 0, 0, 0]
  protected _defaultColorMatrix = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]

  protected _batchables: Batchable2D[] = []
  protected _vertexCount = 0
  protected _indexCount = 0
  protected _attributeBuffer: ArrayBuffer[] = []
  protected _indexBuffers: Uint16Array[] = []
  protected _shaders = new Map<number, Shader>()

  protected _attributes: Record<string, Partial<WebGLVertexAttrib>> = {
    aTextureId: { size: 1, normalized: true, type: 'float' }, // 1
    aPosition: { size: 2, normalized: false, type: 'float' }, // 2
    aUv: { size: 2, normalized: false, type: 'float' }, // 2
    aTint: { size: 4, normalized: true, type: 'unsigned_byte' }, // 1
    aBackgroundColor: { size: 4, normalized: true, type: 'unsigned_byte' }, // 1
    aColorMatrixOffset: { size: 4, normalized: false, type: 'float' }, // 4
    aColorMatrix: { size: 4, normalized: false, type: 'float' }, // 16
  }

  protected _getShader(maxTextureUnits: number): Shader {
    let shader = this._shaders.get(maxTextureUnits)
    if (!shader) {
      this._shaders.set(maxTextureUnits, shader = this._createShader(maxTextureUnits))
    }
    return shader
  }

  protected _createShader(maxTextureUnits: number): Shader {
    const renderer = this._renderer

    const program = renderer.program.create({
      vert: `precision highp float;
attribute float aTextureId;
attribute vec2 aPosition;
attribute vec2 aUv;
attribute vec4 aTint;
attribute vec4 aBackgroundColor;
attribute mat4 aColorMatrix;
attribute vec4 aColorMatrixOffset;

uniform mat3 projectionMatrix;
uniform mat3 translationMatrix;
uniform vec4 tint;

varying float vTextureId;
varying vec2 vUv;
varying vec4 vTint;
varying vec4 vBackgroundColor;
varying mat4 vColorMatrix;
varying vec4 vColorMatrixOffset;

void main(void) {
  vTextureId = aTextureId;
  gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vUv = aUv;
  vTint = aTint * tint;
  vBackgroundColor = aBackgroundColor;
  vColorMatrix = aColorMatrix;
  vColorMatrixOffset = aColorMatrixOffset;
}`,
      frag: `precision highp float;
varying float vTextureId;
varying vec2 vUv;
varying vec4 vTint;
varying vec4 vBackgroundColor;
varying mat4 vColorMatrix;
varying vec4 vColorMatrixOffset;

uniform sampler2D samplers[${maxTextureUnits}];

void main(void) {
  vec4 color;
  if (vTextureId < 0.0)
  {
    color = vec4(0.0, 0.0, 0.0, 0.0);
  }${Array.from({ length: maxTextureUnits }, (_, i) => {
    let text = '  '
    if (i >= 0) {
      text += '\n  else '
    }
    if (i < maxTextureUnits - 1) {
      text += `\n  if (vTextureId < ${i}.5)`
    }
    return `${text}\n  {\n    color = texture2D(samplers[${i}], vUv);\n  }`
  }).join('')}

  color += (1.0 - color.a) * vBackgroundColor;
  if (color.a > 0.0) {
    color *= vTint;
    color = vColorMatrix * color;
    color += vColorMatrixOffset;
  }
  gl_FragColor = color;
}`,
    })

    const buffer = renderer.buffer.create({
      target: 'array_buffer',
      data: new Float32Array(1),
      usage: 'dynamic_draw',
    })

    const elementArrayBuffer = renderer.buffer.create({
      target: 'element_array_buffer',
      data: new Uint16Array(1),
      usage: 'dynamic_draw',
    })

    const vertexArray: WebGLVertexArrayObjectOptions = {
      attributes: Object.fromEntries(
        Object.entries(this._attributes)
          .map(([key, value]) => [key, { ...value, buffer }]),
      ),
      elementArrayBuffer,
    }

    const vao = renderer.vertexArray.create(program, vertexArray)

    const samplers = new Int32Array(
      Array.from({ length: maxTextureUnits }, (_, i) => i),
    )

    return {
      update: (attributeBuffer, indexBuffer) => {
        renderer.vertexArray.bind(vao ?? vertexArray)
        renderer.buffer.update(buffer, {
          target: 'array_buffer',
          data: attributeBuffer,
        })
        renderer.buffer.update(elementArrayBuffer, {
          target: 'element_array_buffer',
          data: indexBuffer,
        })
      },
      draw: (options) => {
        const renderer = this._renderer
        renderer.program.bind(program)
        renderer.program.updateUniforms(program, {
          samplers,
          tint: [1, 1, 1, 1],
          translationMatrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
          ...renderer.program.uniforms,
        })
        renderer.vertexArray.bind(vao ?? vertexArray)
        renderer.draw(options)
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

    const textureMaxUnits = this._renderer.texture.maxUnits
    const attributeBuffer = this._getAttributeBuffer(vertexCount)
    const float32View = new Float32Array(attributeBuffer)
    const uint32View = new Uint32Array(attributeBuffer)
    const indexBuffer = this._getIndexBuffer(indexCount)
    let aIndex = 0
    let iIndex = 0
    const drawCalls: DrawCall[] = []

    for (
      let len = batchables.length,
        drawCall = { id: ++this._drawCallUid } as DrawCall,
        textures: WebGLTexture[] = [],
        textureLocationMap = new Map<WebGLTexture, number>(),
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
        drawCall.first = iIndex

        for (let i = start; i <= end; i++) {
          const {
            indices,
            vertices,
            uvs = [],
            texture,
            tint = this._defaultTint,
            backgroundColor = this._defaultBackgroundColor,
            colorMatrix = this._defaultColorMatrix,
            colorMatrixOffset = this._defaultColorMatrixOffset,
            blendMode = WebGLBlendMode.NORMAL,
          } = batchables[i]

          const textureLocation = (texture ? textureLocationMap.get(texture) : -1) ?? -1

          if (start < i && drawCall.blendMode !== blendMode) {
            drawCall.count = iIndex - drawCall.first
            drawCalls.push(drawCall)
            start = i
            drawCall = { id: ++this._drawCallUid } as DrawCall
            drawCall.textures = textures
            drawCall.first = iIndex
          }

          const iIndexStart = aIndex / this._vertexSize

          for (let len = vertices.length, i = 0; i < len; i += 2) {
            float32View[aIndex++] = textureLocation
            float32View[aIndex++] = vertices[i]
            float32View[aIndex++] = vertices[i + 1]
            float32View[aIndex++] = uvs[i] ?? 0
            float32View[aIndex++] = uvs[i + 1] ?? 0
            uint32View[aIndex++] = tint
            uint32View[aIndex++] = backgroundColor
            for (let i = 0; i < 4; i++) {
              float32View[aIndex++] = colorMatrixOffset[i] ?? 0
            }
            for (let i = 0; i < 16; i++) {
              float32View[aIndex++] = colorMatrix[i] ?? 0
            }
          }

          for (let len = indices.length, i = 0; i < len; i++) {
            indexBuffer[iIndex++] = iIndexStart + indices[i]
          }

          drawCall.blendMode = blendMode
        }

        start = end + 1
        drawCall.count = iIndex - drawCall.first
        drawCalls.push(drawCall)
        drawCall = { id: ++this._drawCallUid } as DrawCall
        textures = []
        textureLocationMap = new Map()
      }
    }

    const shader = this._getShader(textureMaxUnits)

    shader.update(attributeBuffer, indexBuffer)

    for (let len = drawCalls.length, i = 0; i < len; i++) {
      const drawCall = drawCalls[i]
      const { first = 0, textures, textureLocationMap } = drawCall

      for (let len = textures.length, i = 0; i < len; i++) {
        const texture = textures[i]
        const location = textureLocationMap.get(texture)
        location !== undefined && this._renderer.texture.bind({
          target: 'texture_2d',
          location,
          value: texture,
        })
      }

      this._state.blendMode = drawCall.blendMode
      this._renderer.state.bind(this._state)

      shader.draw({
        mode: 'triangles',
        count: drawCall.count,
        first,
        bytesPerElement: 2,
      })
    }
  }

  /**
   * Fetches an attribute buffer from `this._attributeBuffer` that can hold atleast `size` floats.
   * @param size - minimum capacity required
   * @returns - buffer than can hold atleast `size` floats
   */
  protected _getAttributeBuffer(size: number): ArrayBuffer {
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

  /**
   * Fetches an index buffer from `this._indexBuffers` that can
   * have at least `size` capacity.
   * @param size - minimum required capacity
   * @returns - buffer that can fit `size` indices.
   */
  protected _getIndexBuffer(size: number): Uint16Array {
    // 12 indices is enough for 2 quads
    const roundedP2 = nextPow2(Math.ceil(size / 12))
    const roundedSizeIndex = log2(roundedP2)
    const roundedSize = roundedP2 * 12

    if (this._indexBuffers.length <= roundedSizeIndex) {
      this._indexBuffers.length = roundedSizeIndex + 1
    }

    let buffer = this._indexBuffers[roundedSizeIndex]

    if (!buffer) {
      this._indexBuffers[roundedSizeIndex] = buffer = new Uint16Array(roundedSize)
    }

    return buffer
  }
}

/**
 * Rounds to next power of two.
 * @param {number} v - input value
 * @returns {number} - next rounded power of two
 */
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

/**
 * Computes ceil of log base 2
 * @param {number} v - input value
 * @returns {number} logarithm base 2
 */
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
