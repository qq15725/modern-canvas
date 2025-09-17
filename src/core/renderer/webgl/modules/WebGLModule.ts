import type { WebGLRenderer } from '../WebGLRenderer'

export abstract class WebGLModule {
  protected declare _renderer: WebGLRenderer
  get gl(): WebGLRenderingContext | WebGL2RenderingContext { return this._renderer.gl }
  install(renderer: WebGLRenderer): void { this._renderer = renderer }
  onUpdateContext(): void { /** override */ }
  flush(): void { /** override */ }
  reset(): void { /** override */ }
  destroy(): void { /** override */ }
}
