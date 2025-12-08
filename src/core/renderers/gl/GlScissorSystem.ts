import type { RectangleLike } from '../../math'
import type { GlRenderer } from './GlRenderer'
import { GlSystem } from './system'

function applyMatrixToPoint(m: number[], x: number, y: number): { x: number, y: number } {
  const [a, d, g, b, e, h, c, f, i] = m
  const xp = a * x + b * y + c
  const yp = d * x + e * y + f
  const wp = g * x + h * y + i
  return { x: xp / wp, y: yp / wp }
}

function transformRectToAABB(m: number[], rect: RectangleLike): RectangleLike {
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

export class GlScissorSystem extends GlSystem {
  scissorCounter = 0

  override install(renderer: GlRenderer): void {
    super.install(renderer)
    renderer.scissor = this
  }

  push(rect: RectangleLike): void {
    const gl = this._gl
    gl.enable(gl.SCISSOR_TEST)
    this.scissorCounter++
    this.bind(rect)
  }

  pop(): void {
    if (this.scissorCounter > 0) {
      this.scissorCounter--
    }
    if (this.scissorCounter <= 0) {
      const gl = this._gl
      gl.disable(gl.SCISSOR_TEST)
    }
  }

  bind(rect: RectangleLike): void {
    const { pixelRatio, viewport } = this._renderer
    const { viewMatrix } = this._renderer.shader.uniforms

    const { x, y, width, height } = transformRectToAABB(viewMatrix, rect)
    const scissorY = viewport.current.height / pixelRatio - (y + height)

    this._renderer.gl.scissor(
      x * pixelRatio,
      scissorY * pixelRatio,
      width * pixelRatio,
      height * pixelRatio,
    )
  }
}
