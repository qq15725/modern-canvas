import { property } from 'modern-idoc'
import { crossOrigin, isVideoElement, Ticker } from '../../../core'
import { Texture2D } from './Texture2D'

export interface VideoTextureOptions {
  autoLoad?: boolean
  autoPlay?: boolean
  fps?: number
  crossorigin?: boolean | string | null
  loop?: boolean
  muted?: boolean
  playsinline?: boolean
}

export interface VideoTextureLike {
  src: string
  mime: string
}

function resolveOptions(options?: VideoTextureOptions): Required<VideoTextureOptions> {
  return {
    autoLoad: Boolean(options?.autoLoad ?? true),
    autoPlay: Boolean(options?.autoPlay ?? false),
    fps: Number(options?.fps ?? 0),
    crossorigin: options?.crossorigin ?? null,
    loop: Boolean(options?.loop ?? false),
    muted: Boolean(options?.muted ?? false),
    playsinline: Boolean(options?.playsinline ?? true),
  }
}

export class VideoTexture extends Texture2D<HTMLVideoElement> {
  @property({ internal: true, fallback: true }) declare autoUpdate: boolean
  @property({ internal: true, fallback: 0 }) declare fps: number

  static readonly mimeTypes = new Map(Object.entries({
    ogv: 'video/ogg',
    mov: 'video/quicktime',
    m4v: 'video/mp4',
  }))

  get isReady(): boolean { return this.source.readyState > 2 }
  get isPlaying(): boolean { return (!this.source.paused && !this.source.ended && this.isReady) }
  get duration(): number { return this.source.duration }
  get seeking(): boolean { return this.source.seeking }
  get currentTime(): number { return this.source.currentTime }
  set currentTime(val) { this.source.currentTime = val }
  get paused(): boolean { return this.source.paused }
  get muted(): boolean { return this.source.muted }
  set muted(val: boolean) {
    if (this.source.muted !== val)
      this.source.muted = val
  }

  get loop(): boolean { return this.source.loop }
  set loop(val: boolean) {
    if (this.source.loop !== val)
      this.source.loop = val
  }

  get playbackRate(): number { return this.source.playbackRate }
  set playbackRate(val: number) {
    if (this.source.playbackRate !== val)
      this.source.playbackRate = val
  }

  /** 原生播放（用于跟随时间轴的连续播放，触发 requestVideoFrameCallback 高效上传）。 */
  play(): void {
    const ret = this.source.play()
    if (ret && typeof ret.catch === 'function')
      ret.catch(() => {})
  }

  pause(): void {
    this.source.pause()
  }

  protected _spf = 0
  protected _autoPlay = false
  protected _sourceLoad?: Promise<this>
  protected _nextTime = 0
  protected _connected = false
  protected _requestId?: number
  protected _resolve?: (val: this) => void
  protected _reject?: (event: ErrorEvent) => void
  protected _seekResolves: Array<() => void> = []

  constructor(
    source: HTMLVideoElement
      | (string | VideoTextureLike)[]
      | string,
    options?: VideoTextureOptions,
  ) {
    const resolved = resolveOptions(options)

    if (!isVideoElement(source)) {
      if (typeof source === 'string') {
        source = [source]
      }
      const firstSrc = (source[0] as VideoTextureLike).src || source[0] as string

      if (typeof document === 'undefined') {
        throw new TypeError('VideoTexture requires a DOM <video> element and is not supported in non-browser environments.')
      }
      const videoElement = document.createElement('video')
      resolved.autoLoad && videoElement.setAttribute('preload', 'auto')
      if (resolved.playsinline) {
        videoElement.setAttribute('webkit-playsinline', '')
        videoElement.setAttribute('playsinline', '')
      }
      if (resolved.muted) {
        videoElement.setAttribute('muted', '')
        videoElement.muted = true
      }
      resolved.loop && videoElement.setAttribute('loop', '')
      resolved.autoPlay && videoElement.setAttribute('autoplay', '')
      crossOrigin(videoElement, firstSrc, resolved.crossorigin)
      for (let i = 0; i < source.length; ++i) {
        let { src, mime } = source[i] as VideoTextureLike
        src = src || source[i] as string
        if (src.startsWith('data:')) {
          mime = src.slice(5, src.indexOf(';'))
        }
        else if (!src.startsWith('blob:')) {
          const baseSrc = src.split('?').shift()!.toLowerCase()
          const ext = baseSrc.slice(baseSrc.lastIndexOf('.') + 1)
          mime = mime || VideoTexture.mimeTypes.get(ext) || `video/${ext}`
        }
        const sourceElement = document.createElement('source')
        sourceElement.src = src
        if (mime)
          sourceElement.type = mime
        videoElement.appendChild(sourceElement)
      }

      source = videoElement
    }

    super({
      source,
      uploadMethodId: 'image',
    })

    this.fps = resolved.fps
    this._autoPlay = resolved.autoPlay
    if (resolved.autoPlay) {
      this.load()
    }

    this._setupAutoUpdate()
  }

  protected override _updateProperty(key: string, value: any, oldValue: any): void {
    super._updateProperty(key, value, oldValue)

    switch (key) {
      case 'fps':
        this._spf = value ? Math.floor(1000 / value) : 0
        this._setupAutoUpdate()
        break
      case 'autoUpdate':
        this._setupAutoUpdate()
        break
    }
  }

  protected _onPlayStart = (): void => {
    if (!this.isValid()) {
      this._onCanPlay()
    }
    this._setupAutoUpdate()
  }

  protected _onPlayStop = (): void => {
    this._setupAutoUpdate()
  }

  protected _onCanPlay = (): void => {
    const source = this.source
    source.removeEventListener('canplay', this._onCanPlay)
    source.removeEventListener('canplaythrough', this._onCanPlay)

    const valid = this.isValid()

    this._nextTime = 0
    this.updateSize()
    this.requestUpload()
    this._nextTime = 0

    if (!valid && this._resolve) {
      this._resolve(this)
      this._sourceLoad = undefined
      this._resolve = undefined
      this._reject = undefined
    }

    if (this.isPlaying) {
      this._onPlayStart()
    }
    else if (this._autoPlay) {
      source.play()
    }
  }

  protected _onError = (event: ErrorEvent): void => {
    this.source.removeEventListener('error', this._onError, true)
    this.emit('error', event)
    if (this._reject) {
      this._reject(event)
      this._reject = undefined
      this._resolve = undefined
    }
  }

  /** Fired when the video is completed seeking to the current playback position. */
  protected _onSeeked = (): void => {
    if (this.autoUpdate && !this.isPlaying) {
      this._nextTime = 0
      this.requestUpload()
      this._nextTime = 0
    }
    this._flushSeekResolves()
  }

  protected _flushSeekResolves(): void {
    if (this._seekResolves.length === 0)
      return
    const resolves = this._seekResolves
    this._seekResolves = []
    resolves.forEach(r => r())
  }

  waitSeek(signal?: AbortSignal): Promise<void> {
    if (!this.seeking || signal?.aborted) {
      return Promise.resolve()
    }
    return new Promise<void>((resolve) => {
      let onAbort: (() => void) | undefined
      const wrapped = (): void => {
        if (onAbort)
          signal?.removeEventListener('abort', onAbort)
        resolve()
      }
      onAbort = (): void => {
        const idx = this._seekResolves.indexOf(wrapped)
        if (idx >= 0)
          this._seekResolves.splice(idx, 1)
        resolve()
      }
      signal?.addEventListener('abort', onAbort, { once: true })
      this._seekResolves.push(wrapped)
    })
  }

  protected _setupAutoUpdate(): void {
    if (this.autoUpdate && this.isPlaying) {
      if (!this.fps && this.source.requestVideoFrameCallback) {
        if (this._connected) {
          Ticker.off(this.requestUpload)
          this._connected = false
          this._nextTime = 0
        }

        if (this._requestId === undefined) {
          this._requestId = this.source.requestVideoFrameCallback(
            this._videoFrameRequestCallback,
          )
        }
      }
      else {
        if (this._requestId !== undefined) {
          this.source.cancelVideoFrameCallback(this._requestId)
          this._requestId = undefined
        }

        if (!this._connected) {
          Ticker.on(this.requestUpload)
          this._connected = true
          this._nextTime = 0
        }
      }
    }
    else {
      if (this._requestId !== undefined) {
        this.source.cancelVideoFrameCallback(this._requestId)
        this._requestId = undefined
      }

      if (this._connected) {
        Ticker.off(this.requestUpload)
        this._connected = false
        this._nextTime = 0
      }
    }
  }

  protected _videoFrameRequestCallback = (): void => {
    this.requestUpload()
    this._requestId = this.source.requestVideoFrameCallback(this._videoFrameRequestCallback)
  }

  requestUpload = (): void => {
    const elapsed = Math.floor(Ticker.elapsed * this.source.playbackRate)
    this._nextTime -= elapsed
    if (!this._spf || this._nextTime <= 0) {
      this.requestUpdate('source')
      this._nextTime = this._spf || 0
    }
  }

  async load(): Promise<this> {
    if (!this._sourceLoad) {
      const source = this.source

      if (
        (
          source.readyState === source.HAVE_ENOUGH_DATA
          || source.readyState === source.HAVE_FUTURE_DATA
        )
        && source.width
        && source.height
      ) {
        (source as any).complete = true
      }

      source.addEventListener('play', this._onPlayStart)
      source.addEventListener('pause', this._onPlayStop)
      source.addEventListener('seeked', this._onSeeked)

      if (!this.isReady) {
        source.addEventListener('canplay', this._onCanPlay)
        source.addEventListener('canplaythrough', this._onCanPlay)
        source.addEventListener('error', this._onError, true)
      }
      else {
        this._onCanPlay()
      }

      this._sourceLoad = new Promise((resolve, reject) => {
        if (this.isValid()) {
          this._sourceLoad = undefined
          resolve(this)
        }
        else {
          this._resolve = resolve
          this._reject = reject
          source.load()
        }
      })
    }

    return this._sourceLoad
  }

  protected override _destroy(): void {
    this._setupAutoUpdate()
    this._flushSeekResolves()
    const source = this.source
    if (source) {
      source.removeEventListener('play', this._onPlayStart)
      source.removeEventListener('pause', this._onPlayStop)
      source.removeEventListener('seeked', this._onSeeked)
      source.removeEventListener('canplay', this._onCanPlay)
      source.removeEventListener('canplaythrough', this._onCanPlay)
      source.removeEventListener('error', this._onError, true)
      source.pause()
      source.src = ''
      source.load()
    }
  }
}
