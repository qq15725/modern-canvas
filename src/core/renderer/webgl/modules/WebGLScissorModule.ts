import type { WebGLRenderer } from '../WebGLRenderer'
import type { MaskData, MaskRect } from './WebGLMaskModule'
import { WebGLModule } from './WebGLModule'

function applyMatrixToPoint(m: number[], x: number, y: number): { x: number, y: number } {
  const [a, d, g, b, e, h, c, f, i] = m
  const xp = a * x + b * y + c
  const yp = d * x + e * y + f
  const wp = g * x + h * y + i
  return { x: xp / wp, y: yp / wp }
}

function transformRectToAABB(m: number[], rect: MaskRect): MaskRect {
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

export class WebGLScissorModule extends WebGLModule {
  override install(renderer: WebGLRenderer): void {
    super.install(renderer)
    renderer.scissor = this
  }

  get length(): number { return this._renderer.mask.last?.scissorCounter ?? 0 }

  push(data: MaskData): void {
    const gl = this._renderer.gl
    gl.enable(gl.SCISSOR_TEST)
    data.scissorCounter ??= 0
    data.scissorCounter++
    this.use()
  }

  pop(_data: MaskData): void {
    if (this.length > 0) {
      this.use()
    }
    else {
      const gl = this._renderer.gl
      gl.disable(gl.SCISSOR_TEST)
    }
  }

  use(): void {
    const renderer = this._renderer
    const { pixelRatio, mask, viewport, screen, gl, program } = renderer
    const { worldTransformMatrix } = program.uniforms

    const rect = transformRectToAABB(worldTransformMatrix, mask.last.mask as MaskRect)
    const { x, y, width, height } = rect

    let scissorY: number
    if (viewport.boundViewport) {
      scissorY = viewport.boundViewport.height - (height + y) * pixelRatio
    }
    else {
      scissorY = (screen.height - (height + y)) * pixelRatio
    }

    gl.scissor(
      x * pixelRatio,
      scissorY,
      width * pixelRatio,
      height * pixelRatio,
    )
  }
}
