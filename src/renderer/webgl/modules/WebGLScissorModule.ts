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
    const rect = renderer.mask.last.mask as MaskRect
    let y: number
    if (renderer.viewport.boundViewport) {
      y = renderer.viewport.boundViewport.height - rect.height - rect.y
    }
    else {
      y = renderer.screen.height - rect.height - rect.y
    }
    renderer.gl.scissor(rect.x, y, rect.width, rect.height)
  }
}
