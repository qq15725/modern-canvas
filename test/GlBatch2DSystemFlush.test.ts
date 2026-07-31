import { describe, expect, it } from 'vitest'
import { GlBatch2DSystem } from '../src/core/renderers/gl/GlBatch2DSystem'

/**
 * flush() 的「没顶点可画」早退分支必须把累加器一起清空。
 *
 * 退化 batchable（`vertices.length === 0`，来自 style 没有 width/height、size 退化成 0x0
 * 的元素）会让 _vertexCount 停在 0，却已经把自己 push 进 _batchables、把 indices 计进
 * _indexCount。早退时不清就等于把残留漏给下一次 flush —— 而 render() 复用的是
 * getRenderEngine() 的共享单例，受害的是**下一次**渲染：索引数超出本次实际写入的顶点，
 * glDrawElements 报 Insufficient buffer size，产出一张尺寸正确、内容全空的图，
 * 再下一次才自愈。现场是给工作流连线渲缩略图之后导出画布。
 *
 * 这条路径不碰 GL（super.flush() 是空实现，早退发生在任何 gl 调用之前），故可脱离
 * WebGL 上下文直接驱动。
 */
describe('glBatch2DSystem.flush', () => {
  function degenerate(): any {
    // 顶点为空、索引非空 —— 正是 0x0 元素产出的形状
    return { vertices: new Float32Array(0), indices: new Uint32Array([0, 1, 2]) }
  }

  it('clears the accumulators when a flush has no vertices to draw', () => {
    const sys = new GlBatch2DSystem() as any

    sys.render(degenerate())
    expect(sys._vertexCount).toBe(0)
    expect(sys._batchables).toHaveLength(1)
    expect(sys._indexCount).toBe(3)

    sys.flush()

    expect(sys._batchables).toHaveLength(0)
    expect(sys._indexCount).toBe(0)
    expect(sys._vertexCount).toBe(0)
  })

  it('does not leak degenerate batchables into the next flush', () => {
    const sys = new GlBatch2DSystem() as any

    sys.render(degenerate())
    sys.render(degenerate())
    sys.flush()

    // 下一次渲染必须从零开始 —— 否则上一帧的索引会挂到这一帧的顶点上
    expect(sys._batchables).toHaveLength(0)
    expect(sys._indexCount).toBe(0)
  })

  it('leaves nothing behind when nothing was rendered at all', () => {
    const sys = new GlBatch2DSystem() as any
    sys.flush()
    expect(sys._batchables).toHaveLength(0)
    expect(sys._indexCount).toBe(0)
    expect(sys._vertexCount).toBe(0)
  })
})
