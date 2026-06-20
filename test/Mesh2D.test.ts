import { describe, expect, it } from 'vitest'
import { CanvasContext, Mesh2D, Texture2D } from '../src'

describe('canvasContext.drawMesh', () => {
  it('emits a mesh batchable with explicit vertices/uvs/indices (no path triangulation)', () => {
    const ctx = new CanvasContext()
    const tex = new Texture2D({ width: 64, height: 64 })
    ctx.fillStyle = tex
    ctx.drawMesh([0, 0, 10, 0, 10, 10], [0, 0, 1, 0, 1, 1], [0, 1, 2])
    const b = ctx.toBatchables()
    expect(b).toHaveLength(1)
    expect(b[0].type).toBe('mesh')
    expect(Array.from(b[0].vertices)).toEqual([0, 0, 10, 0, 10, 10])
    expect(Array.from(b[0].indices)).toEqual([0, 1, 2])
    expect(Array.from(b[0].meshUvs!)).toEqual([0, 0, 1, 0, 1, 1])
    expect(b[0].texture).toBe(tex)
  })
})

describe('mesh2D node', () => {
  it('_redraw produces a textured mesh batchable whose uvs are the explicit mesh UVs', () => {
    const mesh = new Mesh2D({
      vertices: [0, 0, 20, 0, 20, 20, 0, 20],
      uvs: [0, 0, 0.5, 0, 0.5, 0.5, 0, 0.5], // 子区域 UV，与顶点位置无关
      indices: [0, 1, 2, 0, 2, 3],
    })
    ;(mesh as any).texture = new Texture2D({ width: 128, height: 128 })

    const batchables = (mesh as any)._redraw()
    const mb = batchables.find((b: any) => b.type === 'mesh')
    expect(mb).toBeTruthy()
    // uvs 直接来自 mesh 定义（未被顶点位置 / 纹理尺寸改写）
    expect(Array.from(mb.uvs)).toEqual([0, 0, 0.5, 0, 0.5, 0.5, 0, 0.5])
    expect(Array.from(mb.indices)).toEqual([0, 1, 2, 0, 2, 3])
  })

  it('updating vertices deforms the mesh (new geometry, same uvs)', () => {
    const mesh = new Mesh2D({
      vertices: [0, 0, 10, 0, 10, 10],
      uvs: [0, 0, 1, 0, 1, 1],
      indices: [0, 1, 2],
    })
    ;(mesh as any).texture = new Texture2D({ width: 32, height: 32 })
    mesh.vertices = [5, 5, 30, 0, 20, 25] // 形变
    const mb = (mesh as any)._redraw().find((b: any) => b.type === 'mesh')
    expect(Array.from(mb.vertices)).toEqual([5, 5, 30, 0, 20, 25])
    expect(Array.from(mb.uvs)).toEqual([0, 0, 1, 0, 1, 1])
  })
})
