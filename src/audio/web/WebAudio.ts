import type { Audio } from '../Audio'
import type { IAudio, ISound } from '../interfaces'
import { AudioPipeline } from '../pipeline'
import { WebAudioContext } from './WebAudioContext'
import { WebSound } from './WebSound'

export class WebAudio extends AudioPipeline implements IAudio {
  /** Source */
  protected _sourceBuffer?: AudioBuffer
  protected _sourceNode: AudioBufferSourceNode
  protected _sourceLoad?: Promise<this>

  /** Nodes */
  gain: GainNode
  analyser: AnalyserNode

  get context(): WebAudioContext { return WebAudioContext.instance }
  get isPlayable(): boolean { return Boolean(this._sourceNode.buffer) }
  get duration(): number { return this._sourceNode.buffer?.duration ?? 0 }

  get buffer(): AudioBuffer | null { return this._sourceNode.buffer }
  set buffer(val) { this._sourceNode.buffer = val }

  constructor(
    public parent: Audio,
  ) {
    const audioContext = WebAudioContext.audioContext
    const sourceNode = audioContext.createBufferSource()
    const gain = audioContext.createGain()
    const analyser = audioContext.createAnalyser()

    sourceNode.connect(analyser)
    analyser.connect(gain)
    gain.connect(WebAudioContext.instance.destination)

    super(analyser, gain)

    this._sourceNode = sourceNode
    this.gain = gain
    this.analyser = analyser
  }

  async load(): Promise<this> {
    if (!this._sourceLoad) {
      this._sourceLoad = new Promise((resolve) => {
        if (this._sourceBuffer) {
          this._decode(this._sourceBuffer).then(() => resolve(this))
        }
        else if (this.parent.src) {
          this._loadUrl(this.parent.src).then(() => resolve(this))
        }
        else {
          resolve(this)
        }
      })
    }
    return this._sourceLoad
  }

  protected _loadUrl(url: string): Promise<this> {
    return new Promise((resolve) => {
      fetch(url)
        .then(response => response.arrayBuffer())
        .then(buffer => this._decode(buffer))
        .finally(() => resolve(this))
    })
  }

  protected _decode(buffer: ArrayBuffer | AudioBuffer): Promise<AudioBuffer> {
    return Promise.resolve(
      buffer instanceof AudioBuffer
        ? buffer
        : WebAudioContext.decode(buffer),
    ).then((buffer) => {
      this.parent.isLoaded = true
      this.buffer = buffer
      return buffer
    })
  }

  cloneSource() {
    const context = this.context
    const orig = this._sourceNode
    const source = context.audioContext.createBufferSource()
    const gain = context.audioContext.createGain()
    source.buffer = orig.buffer
    source.loop = orig.loop
    context.setParamValue(source.playbackRate, orig.playbackRate.value)
    source.connect(gain)
    gain.connect(this.destination)
    return { source, gain }
  }

  createSound(): ISound {
    return new WebSound()
  }
}
