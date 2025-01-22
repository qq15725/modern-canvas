import type { IPlayOptions } from '../interfaces'
import type { AudioProcessor } from '../pipeline'
import type { WebAudio } from './WebAudio'
import { EventEmitter, Ticker } from '../../../core'

export class WebSound extends EventEmitter {
  protected _audio: WebAudio | null = null
  protected _sourceNode: AudioBufferSourceNode | null = null
  protected _gain: GainNode | null = null

  /** Progress */
  protected _progress = 0
  get progress(): number { return this._progress }

  /** Paused */
  protected _pausedReal = false
  protected _paused = false
  get paused(): boolean { return this._paused }
  set paused(val: boolean) {
    if (this._paused !== val) {
      this._paused = val
      this.refreshPaused()
    }
  }

  /** Volume */
  protected _volume = 1
  get volume(): number { return this._volume }
  set volume(val: number) {
    if (this._volume !== val) {
      this._volume = val
      this.refresh()
    }
  }

  /** PlaybackRate */
  protected _playbackRate = 1
  get playbackRate(): number { return this._playbackRate }
  set playbackRate(val: number) {
    if (this._playbackRate !== val) {
      this._playbackRate = val
      this.refresh()
      this._update(true)
    }
  }

  /** Loop */
  protected _loop = false
  get loop(): boolean { return this._loop }
  set loop(val: boolean) {
    if (this._loop !== val) {
      this._loop = val
      this.refresh()
    }
  }

  /** Muted */
  protected _muted = false
  get muted(): boolean { return this._muted }
  set muted(val: boolean) {
    if (this._muted !== val) {
      this._muted = val
      this.refresh()
    }
  }

  protected _duration = 0
  protected _end = 0
  protected _elapsed = 0
  protected _lastUpdate = this._now()

  /** Processors */
  protected _processors: AudioProcessor[] = []

  init(audio: WebAudio): this {
    this._audio = audio
    audio.context.on('refresh', this.refresh)
    audio.context.on('refreshPaused', this.refreshPaused)
    return this
  }

  protected _now(): number {
    return this._audio?.context.audioContext.currentTime ?? 0
  }

  play(options: IPlayOptions = {}): void {
    if (!this._audio)
      return

    const {
      end = 0,
      start = 0,
    } = options

    // eslint-disable-next-line no-console
    end && console.assert(end > start, 'End time is before start time')
    this._end = end
    this._elapsed = start
    options.volume !== undefined && (this._volume = options.volume)
    options.playbackRate !== undefined && (this._playbackRate = options.playbackRate)
    options.muted !== undefined && (this._muted = options.muted)
    options.loop !== undefined && (this._loop = options.loop)
    options.processors !== undefined && (this._processors = options.processors)
    this._paused = false

    const { source, gain } = this._audio.cloneSource()
    this._sourceNode = source
    this._gain = gain
    this.refresh()

    source.onended = this._onComplete.bind(this)
    this._duration = source.buffer?.duration ?? 0
    this._lastUpdate = this._now()

    if (this._loop) {
      source.loopStart = start
      source.loopEnd = end
      source.start(0, start)
    }
    else if (end) {
      source.start(0, start, end - start)
    }
    else {
      source.start(0, start)
    }

    this.emit('start')
    this._update(true)
    this._enableTicker(true)
  }

  protected _stop(): void {
    if (this._sourceNode) {
      this._enableTicker(false)
      this._sourceNode.onended = null
      this._sourceNode.stop(0) // param needed for iOS 8 bug
      this._sourceNode.disconnect()
      try {
        this._sourceNode.buffer = null
      }
      catch (err) {
        console.warn('Failed to set AudioBufferSourceNode.buffer to null:', err)
      }
      this._sourceNode = null
    }
  }

  stop(): void {
    if (this._sourceNode) {
      this._stop()
      this.emit('stop')
    }
  }

  protected _update(force = false): void {
    if (this._sourceNode) {
      const now = this._now()
      const delta = now - this._lastUpdate

      if (delta > 0 || force) {
        this._elapsed += delta * this._sourceNode.playbackRate.value
        this._lastUpdate = now
        const duration = this._duration

        let progress
        if (this._sourceNode.loopStart) {
          const soundLength = this._sourceNode.loopEnd - this._sourceNode.loopStart
          progress = (this._sourceNode.loopStart + (this._elapsed % soundLength)) / duration
        }
        else {
          progress = (this._elapsed % duration) / duration
        }
        this._progress = progress
        this.emit('progress', progress, duration)
      }
    }
  }

  refresh(): void {
    if (!this._audio || !this._sourceNode) {
      return
    }

    const context = this._audio.context
    const parent = this._audio.parent

    this._sourceNode.loop = this._loop || parent.loop

    context.setParamValue(
      this._gain!.gain,
      this._volume * (this._muted ? 0 : 1)
      * parent.volume * (parent.muted ? 0 : 1)
      * context.volume * (context.muted ? 0 : 1),
    )

    context.setParamValue(
      this._sourceNode.playbackRate,
      this._playbackRate
      * parent.playbackRate
      * context.playbackRate,
    )

    this.applyProcessors()
  }

  applyProcessors(): void {
    if (!this._sourceNode)
      return

    if (this._processors.length) {
      this._sourceNode.disconnect()
      let last: any = this._sourceNode
      this._processors.forEach((processor) => {
        last.connect(processor.destination)
        last = processor
      })
      last.connect(this._gain!)
    }
  }

  refreshPaused(): void {
    if (!this._audio)
      return

    const paused = this._paused
      || this._audio.parent.paused
      || this._audio.context.paused

    if (paused !== this._pausedReal) {
      this._pausedReal = paused

      if (paused) {
        this._stop()
        this.emit('paused')
      }
      else {
        this.emit('resumed')
        this.play({
          start: this._elapsed % this._duration,
          end: this._end,
          playbackRate: this._playbackRate,
          loop: this._loop,
          volume: this._volume,
        })
      }
      this.emit('pause', paused)
    }
  }

  protected _onComplete = (): void => {
    if (this._sourceNode) {
      this._enableTicker(false)
      this._sourceNode.onended = null
      this._sourceNode.disconnect()
      try {
        this._sourceNode.buffer = null
      }
      catch (err) {
        console.warn('Failed to set AudioBufferSourceNode.buffer to null:', err)
      }
    }
    this._sourceNode = null
    this._progress = 1
    this.emit('progress', 1, this._duration)
    this.emit('end', this)
  }

  protected _updateListener = (): void => this._update()

  protected _enableTicker(enabled: boolean): void {
    Ticker.off(this._updateListener)
    if (enabled) {
      Ticker.on(this._updateListener)
    }
  }

  free(): void {
    this.removeAllListeners()
    this._stop()
    this._gain?.disconnect()
    this._gain = null
    this._audio?.context.off('refresh', this.refresh)
    this._audio?.context.off('refreshPaused', this.refreshPaused)
    this._audio = null
    this._processors.forEach(processor => processor.disconnect())
    this._processors.length = 0
    this._end = 0
    this._playbackRate = 1
    this._volume = 1
    this._loop = false
    this._elapsed = 0
    this._duration = 0
    this._paused = false
    this._muted = false
    this._pausedReal = false
  }
}
