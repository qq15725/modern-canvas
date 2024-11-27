import { property } from './decorators'
import { Ticker } from './global'
import { Resource } from './Resource'

export abstract class MainLoop extends Resource {
  @property({ default: 24 }) declare fps: number
  @property({ default: 1 }) declare speed: number

  protected _starting = false
  protected _nextDeltaTime = 0
  protected _process?: (delta: number) => void

  get starting(): boolean { return this._starting }
  get spf(): number { return this.fps ? Math.floor(1000 / this.fps) : 0 }

  constructor() {
    super()
    this._onNextTick = this._onNextTick.bind(this)
  }

  start(process: (delta: number) => void): this {
    if (!this._starting) {
      this._starting = true
      this._process = process
      Ticker.on(this._onNextTick, { sort: 0 })
    }
    return this
  }

  stop(): this {
    if (this._starting) {
      this._starting = false
      Ticker.off(this._onNextTick, { sort: 0 })
    }
    return this
  }

  protected _onNextTick = (): void => {
    const elapsed = Ticker.elapsed * this.speed
    const time = this._nextDeltaTime -= elapsed
    if (time <= 0) {
      this._process?.((this._nextDeltaTime = this.spf) || elapsed)
    }
  }
}
