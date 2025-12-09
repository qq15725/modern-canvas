import type { ObservableEvents } from 'modern-idoc'
import type { GlRenderer } from '../GlRenderer'
import type { GlRenderingContext } from '../types'
import { Observable } from 'modern-idoc'

export interface GlSystemEvents extends ObservableEvents {
  updateContext: [gl: GlRenderingContext]
  setup: []
}

export interface GlSystem {
  on: <K extends keyof GlSystemEvents & string>(event: K, listener: (...args: GlSystemEvents[K]) => void) => this
  once: <K extends keyof GlSystemEvents & string>(event: K, listener: (...args: GlSystemEvents[K]) => void) => this
  off: <K extends keyof GlSystemEvents & string>(event: K, listener: (...args: GlSystemEvents[K]) => void) => this
  emit: <K extends keyof GlSystemEvents & string>(event: K, ...args: GlSystemEvents[K]) => this
}

export abstract class GlSystem extends Observable {
  protected declare _renderer: GlRenderer
  protected get _gl(): GlRenderingContext { return this._renderer.gl }

  constructor() {
    super()

    this.on('updateContext', this._updateContext.bind(this))
    this.on('setup', this._setup.bind(this))
  }

  install(renderer: GlRenderer): void { this._renderer = renderer }
  // eslint-disable-next-line unused-imports/no-unused-vars
  protected _updateContext(gl: GlRenderingContext): void { /** override */ }
  protected _setup(): void { /** override */ }
  flush(): void { /** override */ }
  reset(): void { /** override */ }
}
