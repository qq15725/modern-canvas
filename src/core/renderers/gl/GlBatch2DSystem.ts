import type {
  BufferLikeObject,
  GeometryAttributeLike,
  GeometryLikeObject,
  ShaderLikeObject, TextureLike,
} from '../shared'
import type { Batch2DEffect } from './Batch2DEffect'
import type { GlDrawOptions } from './geometry'
import type { WebGLRenderer } from './WebGLRenderer'
import { instanceId } from '../../shared'
import { BufferUsage } from '../shared'
import { flowStreakEffect, strokeFeatherEffect } from './Batch2DEffect'
import { GlProgram } from './shader'
import { GlBlendMode, GlState } from './state'
import { GlSystem } from './system'

export interface Batchable2D {
  vertices: Float32Array
  indices: Uint32Array
  uvs?: Float32Array
  size?: { width: number, height: number }
  texture?: TextureLike
  modulate?: number[]
  blendMode?: GlBlendMode
  roundPixels?: boolean
  clipOutsideUv?: boolean
  /**
   * Effect flag bits (bit 1+ of the aTextureParams.y byte; bit 0 is reserved
   * for clipOutsideUv). Semantics are defined by the registered
   * {@link Batch2DEffect}s — e.g. {@link FLAG_STROKE_AA}. 0/undefined = none.
   */
  effectFlags?: number
  /**
   * Effect scalar parameter (the spare aTextureParams.w byte, 0-255; 0 = off).
   * Encoding is defined by the effect that consumes it — e.g. the flow streak
   * effect's {@link encodeFlowSpeed}. Costs no extra vertex attribute.
   */
  effectParam?: number
}

type DrawCall = Required<GlDrawOptions> & {
  id: number
  textures: TextureLike[]
  textureLocationMap: Map<TextureLike, number>
  blendMode: GlBlendMode
}

interface BatchProgram {
  shader: ShaderLikeObject
  samplers: Int32Array
  /** merged `uniformDefaults` of the effects compiled into this program */
  uniformDefaults: Record<string, any>
}

/**
 * Per-flush GPU + staging resources, addressed by flush ordinal within a frame.
 * Dedicated (not pooled/shared) so an unchanged flush can skip both the CPU
 * vertex rewrite and the GPU upload and just re-issue its draw calls — the GL
 * buffers still hold exactly this flush's data. `refs` snapshots what the
 * buffer content was built from (see {@link GlBatch2DSystem.flush}).
 */
interface BatchSlot {
  buffer: BufferLikeObject
  indexBuffer: BufferLikeObject
  geometry: GeometryLikeObject
  attrData?: ArrayBuffer
  f32?: Float32Array
  u8?: Uint8Array
  indexData?: Uint32Array<ArrayBuffer>
  refs: any[]
  drawCalls: DrawCall[]
  /** 上次重建时的效果修订号；效果注册变更（含 flow uv 归一化模式）后强制失效。 */
  effectsRevision?: number
}

/** REF_STRIDE entries per batchable in {@link BatchSlot.refs}. */
const REF_STRIDE = 5

/** Slots beyond this share the last one and never reuse (defensive cap). */
const MAX_SLOTS = 64

export class GlBatch2DSystem extends GlSystem {
  override install(renderer: WebGLRenderer): void {
    super.install(renderer)
    renderer.batch2D = this
  }

  protected _state = GlState.for2D()
  protected _batchSize = 4096 * 4

  protected _batchables: Batchable2D[] = []
  protected _vertexCount = 0
  protected _indexCount = 0
  protected _programs = new Map<string, BatchProgram>()

  /**
   * Registered shader effects, composed into the batch program at compile time
   * (see {@link Batch2DEffect}). Re-registering by name replaces and triggers a
   * program rebuild on the next flush.
   */
  protected _effects: Batch2DEffect[] = [strokeFeatherEffect, flowStreakEffect]
  protected _effectsRevision = 0

  /**
   * Host-written uniform values for effect snippets (e.g. `uFlowColor`).
   * Merged over each effect's `uniformDefaults` on every draw.
   */
  effectUniforms: Record<string, any> = {}

  registerEffect(effect: Batch2DEffect): void {
    const index = this._effects.findIndex(e => e.name === effect.name)
    if (index >= 0) {
      this._effects[index] = effect
    }
    else {
      this._effects.push(effect)
    }
    this._effectsRevision++
  }

  protected _slots: BatchSlot[] = []
  protected _slotIndex = 0

  /**
   * Marks the start of a frame: flush ordinals restart so each flush lines up
   * with the slot holding its previous content. Without this call slots keep
   * advancing and simply never reuse (capped at {@link MAX_SLOTS}).
   */
  beginFrame(): void {
    this._slotIndex = 0
  }

  protected _attributes: Record<string, Partial<GeometryAttributeLike>> = {
    aPosition: { format: 'float32x2' }, // 2
    aUv: { format: 'float32x2' }, // 2
    aTextureParams: { format: 'uint8x4' }, // 1
    aModulate: { format: 'unorm8x4' }, // 1
  }

  protected _vertexSize = 2 + 2 + 1 + 1

  protected _getProgram(maxTextureUnits: number): BatchProgram {
    const key = `${maxTextureUnits}:${this._effectsRevision}`
    let program = this._programs.get(key)
    if (!program) {
      this._programs.set(key, program = this._createProgram(maxTextureUnits))
    }
    return program
  }

  protected _createProgram(maxTextureUnits: number): BatchProgram {
    const renderer = this._renderer

    // WebGL2 compiles the batch shader as real ES 300 so effect snippets can
    // use derivatives (fwidth). WebGL1 keeps the ES 100 define-mapped path and
    // composes each effect's `fragmentGl1` fallback (or omits the effect).
    const es3 = renderer.version === 2
    const header = es3 ? '#version 300 es\n' : ''

    const effects = this._effects
    const effectDecls = effects
      .map(e => e.uniformDecls ?? '')
      .filter(Boolean)
      .join('\n')
    const effectSnippets = effects
      .map(e => (es3 ? e.fragment : e.fragmentGl1) ?? '')
      .filter(Boolean)
      .join('\n  ')
    const uniformDefaults: Record<string, any> = {}
    for (const e of effects) {
      Object.assign(uniformDefaults, e.uniformDefaults)
    }

    const shader: ShaderLikeObject = {
      instanceId: instanceId(),
      glProgram: new GlProgram({
        vertex: `${header}precision highp float;
in vec2 aPosition;
in vec2 aUv;
in vec4 aTextureParams;
in vec4 aModulate;

uniform vec2 size;
uniform mat3 projectionMatrix;
uniform mat3 viewMatrix;

out float vTextureId;
out float vFlags;
out float vParam;
out float vFlowMeta;
out vec2 vUv;
out vec4 vModulate;

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
  // flags byte: bit 0 = clipOutsideUv (core), bits 1+ = effect flags
  vFlags = aTextureParams.y;
  // z 字节：bit 0 = roundPixels；bits 1-7 = flow 描边的「线宽/线长」量化值(0..127)，
  // 供箭头等效果把尺寸锁成线宽相关（每条线常量、平滑，无需 fwidth 沿路径导数）。QMAX=0.6。
  if (mod(aTextureParams.z, 2.0) == 1.) {
    gl_Position.xy = roundPixels(gl_Position.xy, size);
  }
  vFlowMeta = floor(aTextureParams.z / 2.0) / 127.0 * 0.6;
  // effect-defined scalar (0 = off), see Batchable2D.effectParam
  vParam = aTextureParams.w;
  vUv = aUv;
  vModulate = aModulate;
}`,
        fragment: `${header}precision highp float;
in float vTextureId;
in float vFlags;
in float vParam;
in float vFlowMeta;
in vec2 vUv;
in vec4 vModulate;

uniform sampler2D samplers[${maxTextureUnits}];
uniform float uTime;
${effectDecls}

out vec4 finalColor;

vec4 textureColor() {
  vec4 color = vec4(0.0);
  ${Array.from({ length: maxTextureUnits }, (_, i) => {
    const text = `if (vTextureId < ${i}.5) { color = texture(samplers[${i}], vUv); }`
    if (i === 0) {
      return `\n  ${text}`
    }
    return `\n  else ${text}`
  }).join('')}
  color *= vModulate;
  return color;
}

void main(void) {
  vec4 color = textureColor();
  if (mod(vFlags, 2.0) == 1. && (vUv.x < 0.0 || vUv.y < 0.0 || vUv.x > 1.0 || vUv.y > 1.0)) {
    color = vec4(0.0);
  }
  ${effectSnippets}
  finalColor = color;
}`,
      }),
    }

    const samplers = new Int32Array(
      Array.from({ length: maxTextureUnits }, (_, i) => i),
    )

    return { shader, samplers, uniformDefaults }
  }

  protected _getSlot(): BatchSlot {
    const index = Math.min(this._slotIndex++, MAX_SLOTS - 1)
    let slot = this._slots[index]
    if (!slot) {
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
      this._slots[index] = slot = { buffer, indexBuffer, geometry, refs: [], drawCalls: [] }
    }
    return slot
  }

  protected _drawSlot(program: BatchProgram, slot: BatchSlot, options: GlDrawOptions): void {
    const renderer = this._renderer
    const shader = program.shader
    shader.uniforms = {
      samplers: program.samplers,
      size: [
        renderer.gl.drawingBufferWidth / renderer.pixelRatio,
        renderer.gl.drawingBufferHeight / renderer.pixelRatio,
      ],
      // wall-clock seconds for animated effects; wrapped to keep float32 fract
      // precision (at 1024s a <=4 cycle/s effect is still sub-0.001 accurate)
      uTime: (performance.now() % 1024000) / 1000,
      // effect uniforms: compiled-in defaults, overridden by host-written values
      ...program.uniformDefaults,
      ...this.effectUniforms,
    }
    renderer.shader.updateUniforms(shader)
    // projection/view are a shared group: only re-uploaded to this program when changed
    renderer.shader.updateUniformGroup(renderer.shader.globalUniforms, shader.glProgram)
    renderer.geometry.bind(slot.geometry, shader.glProgram)
    renderer.geometry.draw(options)
  }

  protected _issueDrawCalls(program: BatchProgram, slot: BatchSlot): void {
    const drawCalls = slot.drawCalls
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

      this._drawSlot(program, slot, {
        size: drawCall.size,
        start,
      })
    }
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
    const program = this._getProgram(textureMaxUnits)
    const overflowed = this._slotIndex >= MAX_SLOTS
    const slot = this._getSlot()

    // Static-frame reuse: if this flush was built from the exact same batchable
    // objects (and the per-frame-mutable fields: resolved texture, viewport uvs,
    // pixelate size, roundPixels), its GL buffers already hold identical bytes —
    // skip the CPU vertex rewrite and the upload, just re-issue the draw calls.
    // Batchable identity is the invariant: CanvasItem recreates the objects on
    // any draw/layout/paint change, and world-space vertices don't depend on
    // camera (view/projection are uniforms), so pan/zoom stays on this path.
    // flow 描边的 uv.x 是否归一化到「每条线 0..1」——取当前占据 flow 槽的效果声明。
    // 由效果动态决定：箭头/生长线要归一化（一线一个 / 走满整条），流光/虚线用像素弧长（固定段长）。
    const flowNormalize = this._effects.some(e => e.name === 'flowStreak' && e.uvNormalized)

    const refs = slot.refs
    let same = !overflowed
      && slot.drawCalls.length > 0
      && slot.effectsRevision === this._effectsRevision
      && refs.length === batchables.length * REF_STRIDE
    if (same) {
      for (let j = 0, i = 0, len = batchables.length; i < len; i++, j += REF_STRIDE) {
        const b = batchables[i] as any
        if (
          refs[j] !== (b.__source ?? b)
          || refs[j + 1] !== b.texture
          || refs[j + 2] !== b.uvs
          || refs[j + 3] !== b.size
          || refs[j + 4] !== b.roundPixels
        ) {
          same = false
          break
        }
      }
    }
    if (same) {
      this._issueDrawCalls(program, slot)
      return
    }

    slot.effectsRevision = this._effectsRevision

    // snapshot what this rebuild is derived from (skip for the shared overflow slot)
    refs.length = 0
    if (!overflowed) {
      for (let len = batchables.length, i = 0; i < len; i++) {
        const b = batchables[i] as any
        refs.push(b.__source ?? b, b.texture, b.uvs, b.size, b.roundPixels)
      }
    }

    const byteSize = vertexCount * this._vertexSize * 4
    if (!slot.attrData || slot.attrData.byteLength < byteSize) {
      slot.attrData = new ArrayBuffer(nextPow2(byteSize))
      slot.f32 = new Float32Array(slot.attrData)
      slot.u8 = new Uint8Array(slot.attrData)
    }
    if (!slot.indexData || slot.indexData.length < indexCount) {
      slot.indexData = new Uint32Array(nextPow2(indexCount))
    }
    const float32View = slot.f32!
    const uint8View = slot.u8!
    const indexBufferData = slot.indexData
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
            modulate = [255, 255, 255, 255],
            effectFlags,
            effectParam,
          } = batchables[i]

          if (start < i && drawCall.blendMode !== blendMode) {
            drawCall.size = iIndex - drawCall.start
            drawCalls.push(drawCall)
            start = i
            drawCall = { id: ++drawCallUid } as DrawCall
            drawCall.textures = textures
            drawCall.textureLocationMap = textureLocationMap
            drawCall.start = iIndex
          }

          const { width, height } = size
          const iIndexStart = aIndex / this._vertexSize
          const textureLocation = (texture ? textureLocationMap.get(texture) : 255) ?? 255
          const roundPixelsInt = roundPixels ? 1 : 0
          // flags byte: bit 0 = clipOutsideUv (core), bits 1+ = effect flags
          const flagsByte = (clipOutsideUv ? 1 : 0) | (effectFlags ?? 0)
          // effect scalar byte (encoding owned by the consuming effect; 0 = off)
          const paramByte = effectParam ?? 0

          // flow 描边（effectParam!=0）的每条线预计算：总弧长(= uv.x 最大值) → 两用途：
          //   1. 按需把 uv.x 归一化到「每条线 0..1」(flowNormalize：箭头一线一个 / 生长线走满整条)；
          //   2. 把「线宽/线长」量化进 z 字节 bits 1-7，供箭头把尺寸锁成线宽相关（QMAX=0.6，见顶点着色器）。
          // 每条线一次线性扫描，仅 flow 描边生效；顶点布局不变。
          let invTotal = 0
          let flowZByte = roundPixelsInt
          if (effectParam) {
            let maxU = 0
            for (let k = 0, ul = uvs.length; k < ul; k += 2) {
              if (uvs[k] > maxU) {
                maxU = uvs[k]
              }
            }
            if (maxU > 0) {
              if (flowNormalize) {
                invTotal = 1 / maxU
              }
              const lineWidth = (batchables[i] as any).lineStyle?.width ?? 0
              const qQuant = Math.max(0, Math.min(127, Math.round((lineWidth / maxU) / 0.6 * 127)))
              flowZByte = roundPixelsInt | (qQuant << 1)
            }
          }

          let uvX, uvY, aU8Index
          for (let len = vertices.length, i = 0; i < len; i += 2) {
            uvX = uvs[i]
            uvY = uvs[i + 1]
            if (width > 0 && height > 0) {
              uvX = Math.ceil(uvX * width) / width
              uvY = Math.ceil(uvY * height) / height
            }
            if (invTotal) {
              uvX *= invTotal
            }
            float32View[aIndex++] = vertices[i]
            float32View[aIndex++] = vertices[i + 1]
            float32View[aIndex++] = uvX
            float32View[aIndex++] = uvY
            aU8Index = aIndex * 4
            uint8View[aU8Index] = textureLocation
            uint8View[aU8Index + 1] = flagsByte
            uint8View[aU8Index + 2] = flowZByte
            uint8View[aU8Index + 3] = paramByte
            aIndex++
            aU8Index = aIndex * 4
            uint8View[aU8Index] = modulate[0]
            uint8View[aU8Index + 1] = modulate[1]
            uint8View[aU8Index + 2] = modulate[2]
            uint8View[aU8Index + 3] = modulate[3]
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

    // Unbind the current VAO before uploading: ELEMENT_ARRAY_BUFFER binding is
    // VAO state, so uploading this slot's index buffer while the previous
    // slot's VAO is still bound would silently rewire that VAO to this buffer
    // (with shared buffers this was benign; with per-slot buffers it corrupts).
    this._renderer.geometry.unbind()

    // only upload the portion actually written this flush, not the whole rounded-up buffer
    slot.buffer.data = float32View.subarray(0, vertexCount * this._vertexSize)
    slot.indexBuffer.data = indexBufferData.subarray(0, indexCount)
    this._renderer.buffer.update(slot.buffer, true)
    this._renderer.buffer.update(slot.indexBuffer, true)

    slot.drawCalls = drawCalls
    this._issueDrawCalls(program, slot)
  }

  override reset(): void {
    super.reset()
    this._slots = []
    this._slotIndex = 0
    this._batchables = []
    this._vertexCount = 0
    this._indexCount = 0
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
