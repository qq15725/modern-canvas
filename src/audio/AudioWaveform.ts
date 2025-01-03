import type { Node2DOptions } from '../2d'
import { Node2D } from '../2d'
import { customNode, property, Texture } from '../core'
import { Transform2D } from '../math'
import { IN_BROWSER } from '../shared'
import { WebAudioContext } from './web'

export interface AudioWaveformOptions extends Node2DOptions {
  src?: string
  gap?: number
  color?: string
}

@customNode('AudioWaveform')
export class AudioWaveform extends Node2D {
  @property() src?: string
  @property() gap = 0
  @property() color = '#000000'

  protected _audioBuffer?: AudioBuffer
  protected _src = IN_BROWSER
    ? new Texture(document.createElement('canvas'))
    : undefined

  protected _needsUpdateTexture = false

  constructor(options: AudioWaveformOptions = {}) {
    super()
    this.setProperties(options)
  }

  protected override _onUpdateProperty(key: PropertyKey, value: any, oldValue: any): void {
    super._onUpdateProperty(key, value, oldValue)

    switch (key) {
      case 'src':
        this._loadSrc(value)
        break
      case 'gap':
      case 'color':
      case 'width':
      case 'height':
        this._needsUpdateTexture = true
        break
    }
  }

  async _loadSrc(src: string): Promise<void> {
    await globalThis.fetch(src)
      .then(rep => rep.arrayBuffer())
      .then(buffer => WebAudioContext.decode(buffer))
      .then((buffer) => {
        this._audioBuffer = buffer
        this.syncTexture(true)
      })
  }

  syncTexture(force = false): void {
    const audioBuffer = this._audioBuffer
    if (!audioBuffer)
      return

    if (!force && !this._needsUpdateTexture)
      return
    this._needsUpdateTexture = false

    const canvas = this._src?.source
    if (!canvas)
      return
    const { width = 0, height = 0 } = this.style
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) {
      console.warn('Failed to getContext(\'2d\') in syncTexture')
      return
    }

    context.fillStyle = this.color
    const data = audioBuffer.getChannelData(0)
    const step = Math.ceil(data.length / width)
    const amp = height / 2

    for (let min = 1, max = -1, i = 0; i < width; i++) {
      for (let j = 0; j < step; j++) {
        const datum = data[(i * step) + j]
        if (datum < min) {
          min = datum
        }
        if (datum > max) {
          max = datum
        }
      }

      if (!this.gap || (i % (this.gap * 2) === 0)) {
        const x = i
        const y = (1 + min) * amp
        const w = this.gap || 1
        const h = Math.max(1, (max - min) * amp)
        context.fillRect(x, y, w, h)
        min = 1
        max = -1
      }
    }

    this._src?.requestUpload()
    this.requestRedraw()
  }

  protected override _process(delta: number): void {
    this.syncTexture()
    super._process(delta)
  }

  protected _drawSrc(): void {
    const src = this._src
    if (src?.valid) {
      this.context.fillStyle = src
      this.context.textureTransform = new Transform2D().scale(
        this.style.width! / src.width,
        this.style.height! / src.height,
      )
    }
  }
}
