import type { WebGLRenderer } from '../WebGLRenderer'
import type { Renderable } from './types'
import type { MaskData } from './WebGLMaskModule'
import { WebGLModule } from './WebGLModule'

declare module '../WebGLRenderer' {
  interface WebGLRenderer {
    stencil: WebGLStencilModule
  }
}

export class WebGLStencilModule extends WebGLModule {
  override install(renderer: WebGLRenderer): void {
    super.install(renderer)
    renderer.stencil = this
  }

  get length(): number { return this._renderer.mask.last?.stencilCounter ?? 0 }

  push(data: MaskData): void {
    const gl = this._renderer.gl
    const mask = data.mask as Renderable

    const oldStencilCounter = data.stencilCounter ??= 0
    if (data.stencilCounter === 0) {
      this._renderer.framebuffer.forceStencil()
      gl.clearStencil(0)
      gl.clear(gl.STENCIL_BUFFER_BIT)
      gl.enable(gl.STENCIL_TEST)
    }
    data.stencilCounter++

    const colorMask = data.color
    if (colorMask) {
      data.color = 0
      gl.colorMask(false, false, false, false)
    }

    gl.stencilFunc(gl.EQUAL, oldStencilCounter, 0xFFFFFFFF)
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR)

    mask.render(this._renderer)
    this._renderer.flush()

    if (colorMask) {
      data.color = colorMask
      gl.colorMask(
        (colorMask & 1) !== 0,
        (colorMask & 2) !== 0,
        (colorMask & 4) !== 0,
        (colorMask & 8) !== 0,
      )
    }

    this.use()
  }

  pop(data: MaskData): void {
    const gl = this._renderer.gl
    const mask = data.mask as Renderable

    if (!this.length) {
      gl.disable(gl.STENCIL_TEST)
    }
    else {
      const data = this._renderer.mask.last
      const colorMask = data?.color ?? 0xF

      if (colorMask !== 0) {
        data.color = 0
        gl.colorMask(false, false, false, false)
      }

      gl.stencilOp(gl.KEEP, gl.KEEP, gl.DECR)

      mask.render(this._renderer)
      this._renderer.flush()

      if (colorMask !== 0) {
        data.color = colorMask
        gl.colorMask(
          (colorMask & 0x1) !== 0,
          (colorMask & 0x2) !== 0,
          (colorMask & 0x4) !== 0,
          (colorMask & 0x8) !== 0,
        )
      }

      this.use()
    }
  }

  use(): void {
    const gl = this._renderer.gl
    gl.stencilFunc(gl.EQUAL, this.length, 0xFFFFFFFF)
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP)
  }
}
