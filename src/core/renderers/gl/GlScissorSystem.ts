import type { RectangleLike } from '../../math'
import type { RenderTargetLike } from '../shared'
import type { WebGLRenderer } from './WebGLRenderer'
import { GlSystem } from './system'

function applyMatrixToPoint(m: Float32Array, x: number, y: number): { x: number, y: number } {
  const [a, d, g, b, e, h, c, f, i] = m
  const xp = a * x + b * y + c
  const yp = d * x + e * y + f
  const wp = g * x + h * y + i
  return { x: xp / wp, y: yp / wp }
}

function transformRectToAABB(m: Float32Array, rect: RectangleLike): RectangleLike {
  const { x, y, width, height } = rect
  const p1 = applyMatrixToPoint(m, x, y)
  const p2 = applyMatrixToPoint(m, x + width, y)
  const p3 = applyMatrixToPoint(m, x + width, y + height)
  const p4 = applyMatrixToPoint(m, x, y + height)
  const pts = [p1, p2, p3, p4]
  const xs = pts.map(p => p.x)
  const ys = pts.map(p => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

// 两个 AABB 矩形求交集（同一坐标空间）。无交集时返回 0 尺寸（裁掉全部）。
function intersectRect(a: RectangleLike, b: RectangleLike): RectangleLike {
  const x1 = Math.max(a.x, b.x)
  const y1 = Math.max(a.y, b.y)
  const x2 = Math.min(a.x + a.width, b.x + b.width)
  const y2 = Math.min(a.y + a.height, b.y + b.height)
  return {
    x: x1,
    y: y1,
    width: Math.max(0, x2 - x1),
    height: Math.max(0, y2 - y1),
  }
}

export class GlScissorSystem extends GlSystem {
  override install(renderer: WebGLRenderer): void {
    super.install(renderer)
    renderer.scissor = this
  }

  // 按 renderTarget 维护一个裁剪矩形栈：嵌套画板时内层与外层求交、内层 pop 后恢复外层。
  current: Record<number, { stack: RectangleLike[] }> = {
    [-1]: { stack: [] },
  }

  protected override _setup(): void {
    super._setup()
    this._renderer.renderTarget.on('updateRenderTarget', this._updateRenderTarget)
  }

  protected _current(): { stack: RectangleLike[] } {
    const id = this._renderer.renderTarget.current?.instanceId ?? -1
    return this.current[id] ?? (this.current[id] = { stack: [] })
  }

  protected _updateRenderTarget = (renderTarget: RenderTargetLike | null): void => {
    if (renderTarget) {
      const current = this.current[renderTarget.instanceId]
        ?? (this.current[renderTarget.instanceId] = { stack: [] })
      this.bind(current.stack[current.stack.length - 1] ?? null)
    }
  }

  push(rect: RectangleLike): void {
    const current = this._current()
    const top = current.stack[current.stack.length - 1]
    // 入栈前快照（脱离 globalAabb 引用），并与外层裁剪框求交，保证内层不超出外层。
    const snap: RectangleLike = { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    const effective = top ? intersectRect(top, snap) : snap
    current.stack.push(effective)
    this.bind(effective)
  }

  pop(): void {
    const current = this._current()
    current.stack.pop()
    // 恢复到上一层裁剪框；栈空则关闭裁剪。
    this.bind(current.stack[current.stack.length - 1] ?? null)
  }

  bind(rect?: RectangleLike | null): void {
    const gl = this._gl
    if (rect) {
      gl.enable(gl.SCISSOR_TEST)
      const { pixelRatio, viewport } = this._renderer
      const { viewMatrix } = this._renderer.shader.uniforms

      const { x, y, width, height } = transformRectToAABB(viewMatrix, rect)
      const scissorY = viewport.current.height / pixelRatio - (y + height)

      gl.scissor(
        x * pixelRatio,
        scissorY * pixelRatio,
        width * pixelRatio,
        height * pixelRatio,
      )
    }
    else {
      gl.disable(gl.SCISSOR_TEST)
    }
  }

  override destroy(): void {
    super.destroy()
    this._renderer.renderTarget.off('updateRenderTarget', this._updateRenderTarget)
  }
}
