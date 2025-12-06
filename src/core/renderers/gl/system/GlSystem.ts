import type { GlRenderer } from '../GlRenderer'
import type { GlRenderingContext } from '../types'

export abstract class GlSystem {
  protected declare _renderer: GlRenderer
  protected get _gl(): GlRenderingContext { return this._renderer.gl }
  get gl(): GlRenderingContext { return this._renderer.gl }
  install(renderer: GlRenderer): void { this._renderer = renderer }
  // eslint-disable-next-line unused-imports/no-unused-vars
  onUpdateContext(gl: GlRenderingContext): void { /** override */ }
  flush(): void { /** override */ }
  reset(): void { /** override */ }
  destroy(): void { /** override */ }
}
