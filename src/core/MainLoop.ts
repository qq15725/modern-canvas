import type { EventListenerOptions, EventListenerValue } from '../shared'
import type { _ObjectEventMap } from './_Object'
import { _Object } from './_Object'
import { property } from './decorators'
import { Ticker } from './global'

export interface MainLoopEventMap extends _ObjectEventMap {
  process: (delta: number) => void
}

export interface MainLoop {
  on: (<K extends keyof MainLoopEventMap>(type: K, listener: MainLoopEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  off: (<K extends keyof MainLoopEventMap>(type: K, listener: MainLoopEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  emit: (<K extends keyof EventListenerOptions>(type: K, ...args: Parameters<EventListenerOptions[K]>) => boolean)
    & ((type: string, ...args: any[]) => boolean)
}

export class MainLoop extends _Object {
  @property({ default: 24 }) declare fps: number
  @property({ default: 1 }) declare speed: number

  protected _starting = false
  protected _nextDeltaTime = 0

  get starting(): boolean { return this._starting }
  get spf(): number { return this.fps ? Math.floor(1000 / this.fps) : 0 }

  constructor() {
    super()
    this._onNextTick = this._onNextTick.bind(this)
  }

  start(process: (delta: number) => void): this {
    if (!this._starting) {
      this._starting = true
      this.removeAllListeners()
      this.on('process', process)
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

  protected _onNextTick(): void {
    const elapsed = Ticker.elapsed * this.speed
    const time = this._nextDeltaTime -= elapsed
    if (time <= 0) {
      const delta = (this._nextDeltaTime = this.spf) || elapsed
      this.emit('process', delta)
    }
  }
}
