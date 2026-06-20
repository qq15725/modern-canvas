import { describe, expect, it } from 'vitest'
import { TextureRect2D } from '../src'

// region 把节点显示坐标(0..size)映射到纹理图集的子矩形 UV(0..1)。
// 这里直接验证 _uvTransform 的矩阵，不需要 GL 上下文。
function mapper(node: TextureRect2D) {
  const t = (node as any)._uvTransform()
  return (px: number, py: number) => ({
    u: (t.a * px) + (t.c * py) + t.tx,
    v: (t.b * px) + (t.d * py) + t.ty,
  })
}

describe('textureRect2D region UV', () => {
  it('maps node-size corners to the atlas sub-rect UVs', () => {
    const node = new TextureRect2D()
    node.size.set(64, 64)
    ;(node as any).texture = { width: 256, height: 128 }
    node.region = { x: 64, y: 32, width: 32, height: 16 }
    const map = mapper(node)
    // 左上角 → region 左上
    expect(map(0, 0)).toEqual({ u: 64 / 256, v: 32 / 128 })
    // 右下角 → region 右下
    expect(map(64, 64)).toEqual({ u: (64 + 32) / 256, v: (32 + 16) / 128 })
    // 中点 → region 中点
    expect(map(32, 32)).toEqual({ u: (64 + 16) / 256, v: (32 + 8) / 128 })
  })

  it('falls back to full-texture UV (0..1) when no region', () => {
    const node = new TextureRect2D()
    node.size.set(50, 40)
    const map = mapper(node)
    expect(map(0, 0)).toEqual({ u: 0, v: 0 })
    expect(map(50, 40)).toEqual({ u: 1, v: 1 })
  })
})
