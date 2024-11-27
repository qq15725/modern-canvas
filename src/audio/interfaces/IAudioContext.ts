import type { AudioProcessor } from '../pipeline'

export interface IAudioContext {
  muted: boolean
  volume: number
  playbackRate: number
  paused: boolean
  processors: AudioProcessor[]

  toggleMute: () => boolean
  togglePause: () => boolean
  refreshPaused: () => void
  refresh: () => void
  audioContext: AudioContext
}
