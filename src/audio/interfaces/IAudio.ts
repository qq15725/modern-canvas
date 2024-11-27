import type { IAudioContext } from './IAudioContext'
import type { ISound } from './ISound'

export interface IAudio {
  readonly context: IAudioContext
  readonly duration: number
  readonly isPlayable: boolean

  createSound: () => ISound
  load: () => Promise<this>
}
