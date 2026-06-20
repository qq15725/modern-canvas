import type { Node } from '../main'
import type { Texture2D } from '../resources'
import type { Element2DProperties } from './element'
import { Element2D } from './element'

export interface Mesh2DProperties extends Element2DProperties {
  /** 顶点（局部像素坐标，[x,y,...]） */
  vertices?: Float32Array | number[]
  /** UV（归一化 0..1，[u,v,...]），与顶点一一对应 */
  uvs?: Float32Array | number[]
  /** 三角索引（[i0,i1,i2,...]） */
  indices?: Uint32Array | number[]
}

/**
 * 可变形三角网格节点：自定义顶点 + UV + 三角索引，用当前 texture 贴图绘制。
 * 顶点在局部空间，随节点 globalTransform 变换到世界（同 fill 批次）；UV 不由顶点派生。
 * 适合精灵网格 / 骨骼网格(mesh)变形 —— 改 `vertices` 即变形，无需重建几何。
 */
export class Mesh2D<T extends Texture2D = Texture2D> extends Element2D {
  texture?: T

  protected _vertices: Float32Array = new Float32Array()
  protected _uvs: Float32Array = new Float32Array()
  protected _indices: Uint32Array = new Uint32Array()

  get vertices(): Float32Array { return this._vertices }
  set vertices(value: Float32Array | number[]) {
    this._vertices = value instanceof Float32Array ? value : new Float32Array(value)
    this.requestDraw()
  }

  get uvs(): Float32Array { return this._uvs }
  set uvs(value: Float32Array | number[]) {
    this._uvs = value instanceof Float32Array ? value : new Float32Array(value)
    this.requestDraw()
  }

  get indices(): Uint32Array { return this._indices }
  set indices(value: Uint32Array | number[]) {
    this._indices = value instanceof Uint32Array ? value : new Uint32Array(value)
    this.requestDraw()
  }

  constructor(properties?: Partial<Mesh2DProperties>, children: Node[] = []) {
    super()

    // 几何字段是访问器(set 时转 typed array + 触发重绘)，不走 setProperties(只处理普通字段)
    const { vertices, uvs, indices, ...rest } = properties ?? {}
    this.setProperties(rest)
    if (vertices)
      this.vertices = vertices
    if (uvs)
      this.uvs = uvs
    if (indices)
      this.indices = indices
    this.append(children)
  }

  protected override _drawContent(): void {
    if (this.texture?.isValid() && this._indices.length && this._vertices.length) {
      this.context.fillStyle = this.texture
      this.context.drawMesh(this._vertices, this._uvs, this._indices)
    }
  }
}
