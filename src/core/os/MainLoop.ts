import type { CoreObjectEvents } from '../object'
import { property } from 'modern-idoc'
import { Ticker } from '../global'
import { CoreObject } from '../object'

export interface MainLoopEvents extends CoreObjectEvents {
  process: [delta: number]
}

export interface MainLoop {
  on: <K extends keyof MainLoopEvents & string>(event: K, listener: (...args: MainLoopEvents[K]) => void) => this
  once: <K extends keyof MainLoopEvents & string>(event: K, listener: (...args: MainLoopEvents[K]) => void) => this
  off: <K extends keyof MainLoopEvents & string>(event: K, listener: (...args: MainLoopEvents[K]) => void) => this
  emit: <K extends keyof MainLoopEvents & string>(event: K, ...args: MainLoopEvents[K]) => this
}

export interface MainLoopProperties {
  fps: number
  speed: number
}

export class MainLoop extends CoreObject {
  @property({ fallback: 60 }) declare fps: number
  @property({ fallback: 1 }) declare speed: number

  protected _starting = false
  protected _nextDeltaTime = 0
  protected _startedProcess?: (delta: number) => void

  get starting(): boolean { return this._starting }
  get spf(): number { return this.fps ? Math.floor(1000 / this.fps) : 0 }

  constructor(properties?: Partial<MainLoopProperties>) {
    super()
    this._onTicker = this._onTicker.bind(this)
    this.setProperties(properties)
  }

  start(process: (delta: number) => void): void {
    if (!this._starting) {
      this._starting = true
      if (this._startedProcess) {
        this.off('process', this._startedProcess)
      }
      this._startedProcess = process
      this.on('process', process)
      Ticker.on(this._onTicker, { sort: 0 })
    }
  }

  stop(): void {
    if (this._starting) {
      this._starting = false
      Ticker.off(this._onTicker, { sort: 0 })
    }
  }

  protected _onTicker(): void {
    const elapsed = Ticker.elapsed * this.speed
    const time = this._nextDeltaTime -= elapsed
    if (time <= 0) {
      const delta = (this._nextDeltaTime = this.spf) || elapsed
      this.emit('process', delta)
    }
  }

  override destroy(): void {
    this.stop()
    super.destroy()
  }
}
