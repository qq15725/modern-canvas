import type { IAudioContext } from '../interfaces'
import {
  IN_BROWSER,
  SUPPORTS_AUDIO_CONTEXT,
  SUPPORTS_CLICK_EVENTS,
  SUPPORTS_OFFLINE_AUDIO_CONTEXT,
  SUPPORTS_TOUCH_EVENTS,
  SUPPORTS_WEBKIT_AUDIO_CONTEXT,
  SUPPORTS_WEBKIT_OFFLINE_AUDIO_CONTEXT,
} from '../../shared'
import { AudioPipeline } from '../pipeline'

function createAudioContext(): AudioContext {
  if (SUPPORTS_AUDIO_CONTEXT) {
    return new AudioContext()
  }
  else if (SUPPORTS_WEBKIT_AUDIO_CONTEXT) {
    return new (globalThis as any).webkitAudioContext()
  }
  else {
    throw new Error('Failed to createAudioContext')
  }
}

function createOfflineAudioContext(numberOfChannels: number, length: number, sampleRate: number): OfflineAudioContext {
  if (SUPPORTS_OFFLINE_AUDIO_CONTEXT) {
    return new OfflineAudioContext(numberOfChannels, length, sampleRate)
  }
  else if (SUPPORTS_WEBKIT_OFFLINE_AUDIO_CONTEXT) {
    return new (globalThis as any).webkitOfflineAudioContext(numberOfChannels, length, sampleRate)
  }
  else {
    throw new Error('Failed to createOfflineAudioContext')
  }
}

export class WebAudioContext extends AudioPipeline implements IAudioContext {
  /** Singleton */
  protected static _instance?: WebAudioContext
  static get instance(): WebAudioContext {
    if (!this._instance) {
      this._instance = new WebAudioContext()
    }
    return this._instance
  }

  static get audioContext(): AudioContext { return this.instance.audioContext }
  static get offlineContext(): OfflineAudioContext { return this.instance.offlineContext }
  static setParamValue(param: AudioParam, value: number): void { this.instance.setParamValue(param, value) }
  static decode(buffer: ArrayBuffer): Promise<AudioBuffer> { return this.instance.decode(buffer) }

  /** Context */
  protected _context: AudioContext
  protected _offlineContext: OfflineAudioContext
  get audioContext(): AudioContext { return this._context }
  get offlineContext(): OfflineAudioContext { return this._offlineContext }

  protected _locked: boolean

  muted = false
  volume = 1
  playbackRate = 1

  /** Paused */
  autoPause = true
  protected _paused = false
  protected _pausedOnBlur = false
  get paused(): boolean { return this._paused }
  set paused(val) {
    if (val && this._context.state === 'running') {
      this._context.suspend()
    }
    else if (!val && this._context.state === 'suspended') {
      this._context.resume()
    }
    this._paused = val
  }

  /** Nodes */
  protected _compressor: DynamicsCompressorNode
  protected _analyser: AnalyserNode

  constructor() {
    const context = createAudioContext()
    const offlineContext = createOfflineAudioContext(
      1,
      2,
      SUPPORTS_OFFLINE_AUDIO_CONTEXT
        ? Math.max(8000, Math.min(96000, context.sampleRate))
        : 44100,
    )
    const compressor = context.createDynamicsCompressor()
    const analyser = context.createAnalyser()

    analyser.connect(compressor)
    compressor.connect(context.destination)

    super(analyser, compressor)

    this._context = context
    this._offlineContext = offlineContext
    this._compressor = compressor
    this._analyser = analyser
    this._locked = context.state === 'suspended' && (SUPPORTS_TOUCH_EVENTS || SUPPORTS_CLICK_EVENTS)

    if (IN_BROWSER) {
      if (this._locked) {
        this._unlock()
        document.addEventListener('mousedown', this._unlock, true)
        document.addEventListener('touchstart', this._unlock, true)
        document.addEventListener('touchend', this._unlock, true)
      }
      globalThis.addEventListener('focus', this._onFocus)
      globalThis.addEventListener('blur', this._onBlur)
    }
  }

  protected _onFocus(): void {
    if (!this.autoPause) {
      return
    }

    const state = this._context.state as 'suspended' | 'interrupted'

    if (state === 'suspended' || state === 'interrupted' || !this._locked) {
      this.paused = this._pausedOnBlur
      this.refreshPaused()
    }
  }

  protected _onBlur(): void {
    if (!this.autoPause) {
      return
    }
    if (!this._locked) {
      this._pausedOnBlur = this._paused
      this.paused = true
      this.refreshPaused()
    }
  }

  protected _unlock = (): void => {
    if (!this._locked) {
      return
    }
    this.playEmptySound()
    if (this._context.state === 'running') {
      document.removeEventListener('mousedown', this._unlock, true)
      document.removeEventListener('touchend', this._unlock, true)
      document.removeEventListener('touchstart', this._unlock, true)
      this._locked = false
    }
  }

  playEmptySound(): void {
    const source = this._context.createBufferSource()
    source.buffer = this._context.createBuffer(1, 1, 22050)
    source.connect(this._context.destination)
    source.start(0, 0, 0)
    if (source.context.state === 'suspended') {
      (source.context as AudioContext).resume()
    }
  }

  refresh(): void {
    this.emit('refresh')
  }

  refreshPaused(): void {
    this.emit('refreshPaused')
  }

  toggleMute(): boolean {
    this.muted = !this.muted
    this.refresh()
    return this.muted
  }

  togglePause(): boolean {
    this.paused = !this.paused
    this.refreshPaused()
    return this._paused
  }

  decode(buffer: ArrayBuffer): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      const handleError = (err: Error) => {
        reject(new Error(err?.message || 'Unable to decode file'))
      }
      const result = this._offlineContext.decodeAudioData(buffer, resolve, handleError)
      if (result) {
        result.catch(handleError)
      }
    })
  }

  setParamValue(param: AudioParam, value: number) {
    if (param.setValueAtTime) {
      param.setValueAtTime(value, this._context.currentTime)
    }
    else {
      param.value = value
    }
  }
}
