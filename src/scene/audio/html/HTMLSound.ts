import type { IPlayOptions } from '../interfaces'
import type { AudioProcessor } from '../pipeline'
import type { HTMLAudio } from './HTMLAudio'
import { Observable } from 'modern-idoc'
import { Ticker } from '../../../core'

export class HTMLSound extends Observable {
  static readonly PADDING = 0.1
  protected _source: HTMLAudioElement | null = null
  protected _audio: HTMLAudio | null = null
  protected _end = 0
  protected _pausedReal = false
  protected _duration = 0
  protected _start = 0
  protected _playing = false

  get progress(): number {
    return (this._source?.currentTime ?? 0) / this._duration
  }

  /** Paused */
  protected _paused = false
  get paused(): boolean { return this._paused }
  set paused(val) {
    if (this._paused !== val) {
      this._paused = val
      this.refreshPaused()
    }
  }

  /** PlaybackRate */
  protected _playbackRate = 1
  get playbackRate(): number { return this._playbackRate }
  set playbackRate(val) {
    if (this._playbackRate !== val) {
      this._playbackRate = val
      this.refresh()
    }
  }

  /** Volume */
  protected _volume = 1
  get volume(): number { return this._volume }
  set volume(val) {
    if (this._volume !== val) {
      this._volume = val
      this.refresh()
    }
  }

  /** Loop */
  protected _loop = false
  get loop(): boolean { return this._loop }
  set loop(val) {
    if (this._loop !== val) {
      this._loop = val
      this.refresh()
    }
  }

  /** Muted */
  protected _muted = false
  get muted(): boolean { return this._muted }
  set muted(val) {
    if (this._muted !== val) {
      this._muted = val
      this.refresh()
    }
  }

  set(name: 'playbackRate' | 'volume' | 'muted' | 'loop' | 'paused', value: number | boolean): this {
    if (this[name] === undefined) {
      throw new Error(`Property with name ${name} does not exist.`)
    }
    else {
      switch (name) {
        case 'playbackRate':
          this.playbackRate = value as number
          break
        case 'volume':
          this.volume = value as number
          break
        case 'paused':
          this.paused = value as boolean
          break
        case 'loop':
          this.loop = value as boolean
          break
        case 'muted':
          this.muted = value as boolean
          break
      }
    }

    return this
  }

  protected _onPlay(): void {
    this._playing = true
  }

  protected _onPause(): void {
    this._playing = false
  }

  init(audio: HTMLAudio): this {
    this._playing = false
    this._duration = audio.source.duration
    const source = this._source = audio.source.cloneNode(false) as HTMLAudioElement
    source.src = audio.parent.src
    source.onplay = this._onPlay.bind(this)
    source.onpause = this._onPause.bind(this)
    audio.context.on('refresh', this.refresh)
    audio.context.on('refreshPaused', this.refreshPaused)
    this._audio = audio
    return this
  }

  protected _stop(): void {
    if (this._source && this._playing) {
      this._source.onended = null
      this._source.pause()
    }
  }

  stop(): void {
    this._stop()
    if (this._source) {
      this.emit('stop')
    }
  }

  get processors(): AudioProcessor[] {
    console.warn('HTML Audio does not support processors')
    return []
  }

  set processors(_val: AudioProcessor[]) {
    console.warn('HTML Audio does not support processors')
  }

  refresh(): void {
    if (!this._audio || !this._source)
      return
    const global = this._audio.context
    const audio = this._audio.parent

    this._source.loop = this._loop || audio.loop

    const globalVolume = global.volume * (global.muted ? 0 : 1)
    const soundVolume = audio.volume * (audio.muted ? 0 : 1)
    const instanceVolume = this._volume * (this._muted ? 0 : 1)

    this._source.volume = instanceVolume * globalVolume * soundVolume

    // Update the speed
    this._source.playbackRate = this._playbackRate * global.playbackRate * audio.playbackRate
  }

  refreshPaused(): void {
    if (!this._source || !this._audio)
      return

    const pausedReal = this._paused
      || this._audio.parent.paused
      || this._audio.context.paused

    if (pausedReal !== this._pausedReal) {
      this._pausedReal = pausedReal

      if (pausedReal) {
        this._stop()
        this.emit('paused')
      }
      else {
        this.emit('resumed')

        this.play({
          start: this._source.currentTime,
          end: this._end,
          volume: this._volume,
          playbackRate: this._playbackRate,
          loop: this._loop,
        })
      }

      this.emit('pause', pausedReal)
    }
  }

  play(options: IPlayOptions = {}): void {
    if (!this._source)
      return

    const { start = 0, end = 0 } = options

    // eslint-disable-next-line no-console
    end && console.assert(end > start, 'End time is before start time')

    options.playbackRate !== undefined && (this._playbackRate = options.playbackRate)
    options.volume !== undefined && (this._volume = options.volume)
    options.loop !== undefined && (this._loop = options.loop)
    options.muted !== undefined && (this._muted = options.muted)
    this.refresh()

    if (this.loop && end !== null) {
      console.warn('Looping not support when specifying an "end" time')
      this.loop = false
    }

    this._start = start
    this._end = end || this._duration
    this._start = Math.max(0, this._start - HTMLSound.PADDING)
    this._end = Math.min(this._end + HTMLSound.PADDING, this._duration)

    this._source.onloadedmetadata = () => {
      if (this._source) {
        this._source.currentTime = start
        this._source.onloadedmetadata = null
        this.emit('progress', start, this._duration)
        Ticker.on(this._onUpdate)
      }
    }
    this._source.onended = this._onComplete.bind(this)
    this._source.play()
    this.emit('start')
  }

  protected _onUpdate = (): void => {
    if (!this._source)
      return
    this.emit('progress', this.progress, this._duration)
    if (this._source.currentTime >= this._end && !this._source.loop) {
      this._onComplete()
    }
  }

  protected _onComplete(): void {
    Ticker.off(this._onUpdate)
    this._stop()
    this.emit('progress', 1, this._duration)
    this.emit('end', this)
  }

  destroy(): void {
    Ticker.off(this._onUpdate)
    super.destroy()

    const source = this._source

    if (source) {
      source.onended = null
      source.onplay = null
      source.onpause = null

      this._stop()
    }

    this._source = null
    this._playbackRate = 1
    this._volume = 1
    this._loop = false
    this._end = 0
    this._start = 0
    this._duration = 0
    this._playing = false
    this._pausedReal = false
    this._paused = false
    this._muted = false

    if (this._audio) {
      this._audio.context.off('refresh', this.refresh)
      this._audio.context.off('refreshPaused', this.refreshPaused)
      this._audio = null
    }
  }
}
