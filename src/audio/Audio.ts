import type { IPlayOptions, ISound } from './interfaces'
import { customNode, Node } from '../core'
import { SUPPORTS_WEB_AUDIO } from '../shared'
import { HTMLAudio } from './html'
import { WebAudio } from './web'

@customNode('Audio')
export class Audio extends Node {
  protected static _soundPool: ISound[] = []

  protected _sounds: ISound[] = []

  /** PlatformAudio */
  protected _platformAudio = SUPPORTS_WEB_AUDIO
    ? new WebAudio(this)
    : new HTMLAudio(this)

  get platformAudio(): WebAudio | HTMLAudio { return this._platformAudio }

  /** Src */
  protected _src!: string
  get src(): string { return this._src }
  set src(val) {
    if (this._src !== val) {
      this._src = val
      this.load()
    }
  }

  isLoaded = false
  get isPlayable(): boolean { return this.isLoaded && this._platformAudio.isPlayable }

  /** Duration */
  get duration(): number { return this._platformAudio.duration * 1000 }

  /** Volume */
  protected _volume = 1
  get volume(): number { return this._volume }
  set volume(val: number) {
    if (this._volume !== val) {
      this._volume = val
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

  /** Loop */
  protected _loop = false
  get loop(): boolean { return this._loop }
  set loop(val: boolean) {
    if (this._loop !== val) {
      this._loop = val
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
    }
  }

  /** IsPlaying */
  protected _isPlaying = false
  get isPlaying(): boolean { return this._isPlaying }

  /** Paused */
  protected _paused = false
  get paused(): boolean { return this._paused }
  set paused(val: boolean) {
    if (this._paused !== val) {
      this._paused = val
      this.refreshPaused()
    }
  }

  multiple = false
  start = 0
  end = 0

  constructor(src = '') {
    super()
    this.src = src
  }

  async load(): Promise<this> {
    await this._platformAudio.load()
    return this
  }

  pause(): this {
    this._isPlaying = false
    this.paused = true
    return this
  }

  resume(): this {
    this._isPlaying = this._sounds.length > 0
    this.paused = false
    return this
  }

  stop(): this {
    if (!this.isPlayable) {
      return this
    }
    this._isPlaying = false
    for (let i = this._sounds.length - 1; i >= 0; i--) {
      this._sounds[i].stop()
    }
    return this
  }

  play(options: IPlayOptions = {}): ISound | undefined {
    if (!this.isLoaded)
      return
    if (!this.multiple) {
      this._removeSounds()
    }
    this._isPlaying = true
    const sound = this._createSound()
    this._sounds.push(sound)
    sound.once('end', () => {
      options.complete?.()
      this._onComplete(sound)
    })
    sound.once('stop', () => this._onComplete(sound))
    const start = (options?.start ?? this.start) / 1000
    const end = (options?.end ?? this.end) / 1000
    sound.play({
      ...options,
      start,
      end,
    })
    return sound
  }

  protected _removeSounds(): void {
    for (let i = this._sounds.length - 1; i >= 0; i--) {
      this._recycleSound(this._sounds[i])
    }
    this._sounds.length = 0
  }

  protected _createSound(): ISound {
    if (Audio._soundPool.length > 0) {
      return Audio._soundPool.pop()!.init(this._platformAudio)
    }
    return this._platformAudio.createSound().init(this._platformAudio)
  }

  refresh(): void {
    for (let len = this._sounds.length, i = 0; i < len; i++) {
      this._sounds[i].refresh()
    }
  }

  refreshPaused(): void {
    for (let len = this._sounds.length, i = 0; i < len; i++) {
      this._sounds[i].refreshPaused()
    }
  }

  protected _onComplete = (sound: ISound): void => {
    if (this._sounds) {
      const index = this._sounds.indexOf(sound)
      if (index > -1) {
        this._sounds.splice(index, 1)
      }
      this._isPlaying = this._sounds.length > 0
    }
    this._recycleSound(sound)
  }

  protected _recycleSound(sound: ISound): void {
    sound.destroy()
    if (!Audio._soundPool.includes(sound)) {
      Audio._soundPool.push(sound)
    }
  }

  protected _prevTime = 0
  protected _timer = 0

  protected _process(delta: number): void {
    super._process(delta)

    if (this.isRenderable()) {
      const currentTime = this._tree?.timeline.current ?? 0
      if (currentTime - this._prevTime > 0) {
        if (!this._timer) {
          this._setTimeStop()
          this.play({
            start: this.start + ((currentTime - this.visibleDelay) % this.duration),
          })
        }

        if (this._isPlaying) {
          this._setTimeStop()
        }
      }
      this._prevTime = currentTime
    }
  }

  protected _setTimeStop(): void {
    this._timer && clearTimeout(this._timer)
    this._timer = setTimeout(() => {
      this.stop()
      this._timer = 0
    }, 100) as any
  }
}
