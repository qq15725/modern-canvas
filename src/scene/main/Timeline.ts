import type { NodeEvents, NodeProperties } from './Node'
import { property } from 'modern-idoc'
import { clamp, customNode } from '../../core'
import { Node } from './Node'

export type TimelineLoopMode = 'none' | 'loop' | 'alternate'

export interface TimelineEvents extends NodeEvents {
  updateCurrentTime: [current: number, delta: number]
  /** 'none' 模式播放到端点自动停止时触发。 */
  ended: []
}

export interface Timeline {
  on: <K extends keyof TimelineEvents & string>(event: K, listener: (...args: TimelineEvents[K]) => void) => this
  once: <K extends keyof TimelineEvents & string>(event: K, listener: (...args: TimelineEvents[K]) => void) => this
  off: <K extends keyof TimelineEvents & string>(event: K, listener: (...args: TimelineEvents[K]) => void) => this
  emit: <K extends keyof TimelineEvents & string>(event: K, ...args: TimelineEvents[K]) => this
}

export interface TimelineProperties extends NodeProperties {
  startTime: number
  currentTime: number
  endTime: number
  loop: boolean
  paused: boolean
}

@customNode('Timeline')
export class Timeline extends Node {
  @property({ fallback: 0 }) declare startTime: number
  currentTime = 0
  @property({ fallback: Number.MAX_SAFE_INTEGER }) declare endTime: number
  @property({ fallback: false }) declare loop: boolean
  @property({ fallback: false }) declare paused: boolean

  // 播放语义集中于此（运行时状态，不参与序列化，故为普通字段）。引擎以 fps:0/speed:0 外部驱动，
  // 故时间推进由宿主每帧调 advance(wallDeltaMs)；play/pause 切换播放态、loop 模式与方向在此处理。
  /** 是否处于连续播放。下游（如 Video2D）据此区分「连续播放」与「定位/scrub」。 */
  playing = false
  /** 当前带符号倍速（含方向：正向为正、反向为负）。由 play/advance 维护。 */
  playbackRate = 1

  protected _rate = 1
  protected _direction: 1 | -1 = 1
  protected _loopMode: TimelineLoopMode = 'none'

  get loopMode(): TimelineLoopMode { return this._loopMode }
  set loopMode(mode: TimelineLoopMode) {
    this._loopMode = mode
    this.loop = mode === 'loop'
  }

  /** 播放倍速（正数；方向由 loop 模式内部维护）。可在播放中实时调整。 */
  get rate(): number { return this._rate }
  set rate(val: number) {
    this._rate = val
    this.playbackRate = val * this._direction
  }

  static from(range: number | number[], loop = false): Timeline {
    const [startTime, endTime] = range
      ? Array.isArray(range)
        ? range
        : [0, range]
      : []
    return new Timeline({
      startTime,
      endTime,
      loop,
    })
  }

  constructor(properties?: Partial<TimelineProperties>) {
    super()
    this.setProperties(properties)
  }

  override setProperties(properties?: Record<string, any>): this {
    if (properties) {
      const {
        currentTime,
        ...restProperties
      } = properties

      if (currentTime !== undefined) {
        this.currentTime = currentTime
      }

      super.setProperties(restProperties)
    }
    return this
  }

  addTime(delta: number): this {
    const end = this.endTime
    const start = Math.min(this.startTime, this.endTime)
    const range = end - start
    let current = this.currentTime + delta
    // 仅在区间为正时回绕：end===start（如 startTime/endTime 都为 0）时 current % range = current % 0 = NaN，
    // 会让 currentTime 退化为 NaN 并沿时间轴污染下游（如 Video2D.currentTime 崩溃）。
    // 回绕点相对 start（修正 start≠0 的情形；start===0 时与旧 current % end 等价）。
    if (this.loop && range > 0 && current > end) {
      current = start + ((current - start) % range)
    }
    current = clamp(current, start, end)
    this.currentTime = current
    this.emit('updateCurrentTime', current, delta)
    return this
  }

  /** 开始连续播放。可选设置倍速 / loop 模式；从端点重播时回到起点。 */
  play(options?: { rate?: number, loopMode?: TimelineLoopMode }): this {
    if (options?.rate !== undefined)
      this._rate = options.rate
    if (options?.loopMode !== undefined)
      this.loopMode = options.loopMode
    this._direction = 1
    // 播放头无效或已到结尾：回到开头重播。
    if (!Number.isFinite(this.currentTime) || this.currentTime >= this.endTime) {
      this.currentTime = Math.min(this.startTime, this.endTime)
    }
    this.playing = true
    this.playbackRate = this._rate * this._direction
    return this
  }

  pause(): this {
    this.playing = false
    return this
  }

  /**
   * 按墙钟增量推进一帧（外部驱动）。处理倍速×方向、loop 模式（none 到端自停并 emit 'ended'、
   * alternate 到端翻向、loop 由 addTime 回绕），并维护带符号 playbackRate。
   */
  advance(wallDeltaMs: number): this {
    if (!this.playing)
      return this
    this.playbackRate = this._rate * this._direction
    const start = Math.min(this.startTime, this.endTime)
    const end = this.endTime
    this.addTime(wallDeltaMs * this._rate * this._direction)
    if (end <= start)
      return this
    const cur = this.currentTime
    switch (this._loopMode) {
      case 'none':
        if ((this._direction > 0 && cur >= end) || (this._direction < 0 && cur <= start)) {
          this.pause()
          this.emit('ended')
        }
        break
      case 'alternate':
        if (this._direction > 0 && cur >= end)
          this._direction = -1
        else if (this._direction < 0 && cur <= start)
          this._direction = 1
        break
      // 'loop' 由 addTime 的回绕处理
    }
    return this
  }

  protected _process(delta: number): void {
    super._process(delta)
    if (!this.paused) {
      this.addTime(delta)
    }
  }
}
