import type { FillRule, LineCap, LineJoin, LineStyle } from 'modern-path2d'
import type { Batchable2D, ColorValue } from '../../core'
import { isColorFillObject } from 'modern-idoc'
import { Path2D } from 'modern-path2d'
import { encodeFlowSpeed, FLAG_STROKE_AA } from '../../core'
import { ColorTexture, Texture2D } from '../resources'

export type TransformUv = (uvs: Float32Array, index: number) => void
export type TransformVertex = (vertices: Float32Array, index: number) => void

export interface CanvasBatchable extends Batchable2D {
  type: 'stroke' | 'fill' | 'mesh'
  texture?: Texture2D
  transformUv?: TransformUv
  transformVertex?: TransformVertex
  size?: { width: number, height: number }
  /** mesh 显式 UV(0..1)，绕过「由顶点位置派生 UV」。 */
  meshUvs?: Float32Array
}

export interface StrokeDraw extends Partial<CanvasBatchable> {
  type: 'stroke'
  path: Path2D
  lineStyle: LineStyle
  /** 流动速度（周期/秒，符号=方向）；发射 batchable 时经 encodeFlowSpeed 编成 effectParam。 */
  flow?: number
}

export interface FillDraw extends Partial<CanvasBatchable> {
  type: 'fill'
  path: Path2D
}

/** 自定义三角网格绘制：顶点(局部像素)+ 显式 UV(0..1) + 三角索引，不经路径三角化。 */
export interface MeshDraw extends Partial<CanvasBatchable> {
  type: 'mesh'
  vertices: Float32Array
  indices: Uint32Array
  meshUvs: Float32Array
}

export class CanvasContext extends Path2D {
  fillStyle?: ColorValue | Texture2D
  fillRule?: FillRule
  strokeStyle?: ColorValue | Texture2D
  strokeAlignment?: number
  lineCap?: LineCap
  lineJoin?: LineJoin
  lineWidth?: number
  miterLimit?: number
  /** 描边流动效果速度（周期/秒，符号=方向；0/undefined=关闭）。见 flowStreakEffect。 */
  lineFlow?: number

  // custom
  transformUv?: TransformUv
  transformVertex?: TransformVertex

  protected _draws: (StrokeDraw | FillDraw | MeshDraw)[] = []
  // per-draw triangulation cache, reused across frames while geometry is unchanged
  protected _triCache: { sig: string, vertices: Float32Array, indices: Uint32Array, uvs?: Float32Array }[] = []

  protected _parseDrawStyle(source?: ColorValue | Texture2D): { texture?: Texture2D } {
    if (source) {
      if (source instanceof Texture2D) {
        return {
          texture: source,
        }
      }
      else {
        return {
          texture: ColorTexture.get(source),
        }
      }
    }
    return {}
  }

  stroke(options?: Partial<StrokeDraw>): void {
    if (!this.curves.length) {
      return
    }

    const styleStroke = this.style.stroke
    let stroke = this.strokeStyle
    if (!stroke && styleStroke) {
      switch (typeof styleStroke) {
        case 'string':
          stroke = styleStroke
          break
        case 'object':
          if (isColorFillObject(styleStroke)) {
            stroke = styleStroke.color
          }
          break
      }
    }

    this._draws.push({
      ...options,
      ...this._parseDrawStyle(stroke),
      type: 'stroke',
      path: new Path2D(this),
      flow: options?.flow ?? this.lineFlow,
      transformUv: this.transformUv,
      transformVertex: this.transformVertex,
      lineStyle: {
        alignment: this.strokeAlignment ?? 0.5,
        cap: this.lineCap ?? 'butt',
        join: this.lineJoin ?? 'miter',
        width: this.lineWidth ?? this.style.strokeWidth ?? 1,
        miterLimit: this.miterLimit ?? this.style.strokeMiterlimit ?? 10,
      },
    })

    this.resetStatus()
  }

  /**
   * 绘制自定义三角网格（用当前 fillStyle 纹理）。顶点为局部像素坐标 [x,y,...]，
   * UV 为归一化 [u,v,...]（0..1），indices 为三角索引。用于精灵网格 / 骨骼网格变形。
   */
  drawMesh(vertices: ArrayLike<number>, uvs: ArrayLike<number>, indices: ArrayLike<number>): void {
    this._draws.push({
      ...this._parseDrawStyle(this.fillStyle),
      type: 'mesh',
      vertices: vertices instanceof Float32Array ? vertices : new Float32Array(vertices),
      meshUvs: uvs instanceof Float32Array ? uvs : new Float32Array(uvs),
      indices: indices instanceof Uint32Array ? indices : new Uint32Array(indices),
      transformVertex: this.transformVertex,
    })
    this.resetStatus()
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    this
      .rect(x, y, width, height)
      .fill()
  }

  strokeRect(x: number, y: number, width: number, height: number): void {
    this
      .rect(x, y, width, height)
      .stroke()
  }

  fill(options?: Partial<FillDraw>): void {
    if (!this.curves.length) {
      return
    }

    let fillStyle = this.fillStyle
    if (!fillStyle && this.style.fill) {
      switch (typeof this.style.fill) {
        case 'string':
          fillStyle = this.style.fill
          break
        case 'object':
          if (isColorFillObject(this.style.fill)) {
            fillStyle = this.style.fill.color
          }
          break
      }
    }

    // capture the current sub-path geometry as the fill draw's path. `new
    // Path2D(this)` copies only the curves, so we also carry over `fillRule`
    // (set explicitly on this ctx or inherited from the source path's style)
    // — without this, modern-path2d's fillTriangulate would always fall back
    // to 'nonzero' and SVG <path fill-rule="evenodd"> holes would not punch.
    const path = new Path2D(this)
    const fillRule = this.fillRule ?? this.style.fillRule
    if (fillRule) {
      path.style.fillRule = fillRule
    }

    this._draws.push({
      transformUv: this.transformUv,
      transformVertex: this.transformVertex,
      ...options,
      ...this._parseDrawStyle(fillStyle),
      type: 'fill',
      path,
    })

    this.resetStatus()
  }

  override copyFrom(source: CanvasContext): this {
    super.copyFrom(source)
    this.strokeStyle = source.strokeStyle
    this.fillStyle = source.fillStyle
    this.fillRule = source.fillRule
    this.lineFlow = source.lineFlow
    this.transformUv = source.transformUv
    this.transformVertex = source.transformVertex
    this.strokeAlignment = source.strokeAlignment
    this.lineCap = source.lineCap
    this.lineJoin = source.lineJoin
    this.lineWidth = source.lineWidth
    this.miterLimit = source.miterLimit
    this._draws = source._draws.slice()
    return this
  }

  resetStatus(): void {
    super.reset()
    this.strokeStyle = undefined
    this.fillStyle = undefined
    this.fillRule = undefined
    this.lineFlow = undefined
    this.transformUv = undefined
    this.transformVertex = undefined
    this.strokeAlignment = undefined
    this.lineCap = undefined
    this.lineJoin = undefined
    this.lineWidth = undefined
    this.miterLimit = undefined
  }

  override reset(): this {
    this.resetStatus()
    this._draws.length = 0
    return this
  }

  toBatchables(): CanvasBatchable[] {
    const batchables: CanvasBatchable[] = []

    for (let len = this._draws.length, i = 0; i < len; i++) {
      const current = this._draws[i]

      // mesh：显式顶点/UV/索引，不做路径三角化
      if (current.type === 'mesh') {
        const { vertices, indices, ...rest } = current
        this._triCache[i] = undefined as any
        batchables.push({ ...rest, vertices, indices })
        continue
      }

      const { path, ...batchable } = current

      // reuse the previous triangulation when this draw's geometry is unchanged
      // (e.g. only the fill/stroke color changed) — skips earcut + typed-array alloc.
      // downstream only reads batchable.vertices (slice in _transformUvs, length in
      // _relayout), so sharing the cached arrays is safe.
      const ls = batchable.type === 'stroke' ? batchable.lineStyle : undefined
      // Arc-length UVs power the flow effect and screen-space stroke feathering.
      // Only plain-color strokes can repurpose the UV channel this way — their
      // texture is a 1×1 ColorTexture, so sampling ignores UV; textured strokes
      // keep position-derived UVs and skip both effects. The uv flag is part of
      // the signature (not the speed — changing speed must not re-triangulate).
      const isStroke = batchable.type === 'stroke'
      const flow = isStroke ? (batchable as Partial<StrokeDraw>).flow : undefined
      const plainStroke = isStroke && (!batchable.texture || batchable.texture instanceof ColorTexture)
      const wantUv = isStroke && (Boolean(flow) || plainStroke)
      const sig = `${batchable.type}|${path.toData()}|${ls ? `${ls.width},${ls.cap},${ls.join},${ls.alignment},${ls.miterLimit}` : ''}${wantUv ? '|uv' : ''}`
      let cached = this._triCache[i]
      if (!cached || cached.sig !== sig) {
        const vertices: number[] = []
        const indices: number[] = []
        const uvs: number[] | undefined = wantUv ? [] : undefined
        if (batchable.type === 'fill') {
          path.fillTriangulate({ vertices, indices })
        }
        else {
          path.strokeTriangulate({
            vertices,
            indices,
            uvs,
            lineStyle: batchable.lineStyle,
            flipAlignment: false,
            closed: path.getPoint(0).equals(path.getPoint(1)),
          })
        }
        cached = {
          sig,
          vertices: new Float32Array(vertices),
          indices: new Uint32Array(indices),
          uvs: uvs ? new Float32Array(uvs) : undefined,
        }
        this._triCache[i] = cached
      }

      // 通道编码归效果模块所有：flow → 参数字节（encodeFlowSpeed），羽化 →
      // FLAG_STROKE_AA 标志位。flow 描边在 shader 里自带 core AA，编码侧不再
      // 同时置羽化位——效果片段之间因此无需互相感知。
      batchables.push({
        ...batchable,
        vertices: cached.vertices,
        indices: cached.indices,
        meshUvs: cached.uvs ?? batchable.meshUvs,
        effectFlags: plainStroke && cached.uvs && !flow ? FLAG_STROKE_AA : 0,
        effectParam: flow && cached.uvs ? encodeFlowSpeed(flow) : 0,
      })
    }

    this._triCache.length = this._draws.length
    return batchables
  }

  destroy(): void {
    this.reset()
    this._triCache.length = 0
  }
}
