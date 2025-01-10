import type { WebGLRenderer } from '../WebGLRenderer'
import type { MaskData, MaskRect } from './WebGLMaskModule'
import { WebGLModule } from './WebGLModule'

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
    const { pixelRatio, mask, viewport, screen, gl } = renderer
    const rect = mask.last.mask as MaskRect
    let y: number
    if (viewport.boundViewport) {
      y = viewport.boundViewport.height - (rect.height + rect.y) * pixelRatio
    }
    else {
      y = (screen.height - (rect.height + rect.y)) * pixelRatio
    }
    gl.scissor(
      rect.x * pixelRatio,
      y,
      rect.width * pixelRatio,
      rect.height * pixelRatio,
    )
  }
}
