import type { IAudioContext } from '../interfaces'
import type { AudioProcessor } from '../pipeline'
import { EventEmitter } from '../../../core'

export class HTMLAudioContext extends EventEmitter implements IAudioContext {
  protected static _instance?: HTMLAudioContext
  static get instance(): HTMLAudioContext {
    if (!this._instance) {
      this._instance = new HTMLAudioContext()
    }
    return this._instance
  }

  playbackRate = 1
  muted = false
  volume = 1
  paused = false

  refresh(): void {
    this.emit('refresh')
  }

  refreshPaused(): void {
    this.emit('refreshPaused')
  }

  get processors(): AudioProcessor[] {
    console.warn('HTML Audio does not support processors')
    return []
  }

  set processors(_processors: AudioProcessor[]) {
    console.warn('HTML Audio does not support processors')
  }

  get audioContext(): AudioContext {
    console.warn('HTML Audio does not support audioContext')
    return null as any
  }

  toggleMute(): boolean {
    this.muted = !this.muted
    this.refresh()
    return this.muted
  }

  togglePause(): boolean {
    this.paused = !this.paused
    this.refreshPaused()
    return this.paused
  }

  free(): void {
    this.removeAllListeners()
  }
}
