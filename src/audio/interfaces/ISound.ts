import type { IAudio } from './IAudio'
import type { IPlayOptions } from './IPlayOptions'

export interface ISound {
  readonly progress: number
  paused: boolean
  volume: number
  playbackRate: number
  loop: boolean
  muted: boolean
  stop: () => void
  refresh: () => void
  refreshPaused: () => void
  destroy: () => void
  init: (parent: IAudio) => this
  play: (options: IPlayOptions) => void

  once: ((event: 'pause', fn: (paused: boolean) => void) => this) & ((event: 'progress', fn: (progress: number, duration: number) => void) => this) & ((event: 'resumed' | 'paused' | 'start' | 'end' | 'stop', fn: () => void) => this)
  on: ((event: 'pause', fn: (paused: boolean) => void) => this) & ((event: 'progress', fn: (progress: number, duration: number) => void) => this) & ((event: 'resumed' | 'paused' | 'start' | 'end' | 'stop', fn: () => void) => this)
  off: (event: 'resumed' | 'paused' | 'start' | 'end' | 'progress' | 'pause' | 'stop', fn?: (...args: any[]) => void, once?: boolean) => this
}
