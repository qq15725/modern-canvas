import type { WebGLViewport } from '../types'
import type { WebGLRenderer } from '../WebGLRenderer'
import { WebGLModule } from './WebGLModule'

export class WebGLViewportModule extends WebGLModule {
  override install(renderer: WebGLRenderer): void {
    super.install(renderer)
    renderer.viewport = this
  }

  boundViewport: WebGLViewport = { x: 0, y: 0, width: 0, height: 0 }

  bind(viewport: WebGLViewport): void {
    const boundViewport = this.boundViewport

    const x = Math.floor(viewport.x)
    const y = Math.floor(viewport.y)
    const width = Math.floor(viewport.width)
    const height = Math.floor(viewport.height)

    if (
      boundViewport.x === x
      && boundViewport.y === y
      && boundViewport.width === width
      && boundViewport.height === height
    ) {
      return
    }

    this._renderer.gl.viewport(x, y, width, height)

    boundViewport.x = x
    boundViewport.y = y
    boundViewport.width = width
    boundViewport.height = height
  }

  override reset(): void {
    super.reset()
    this.boundViewport = { x: 0, y: 0, width: 0, height: 0 }
  }
}
