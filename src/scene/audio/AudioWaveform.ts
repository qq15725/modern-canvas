import type { PropertyDeclaration } from 'modern-idoc'
import type { Element2DProperties } from '../2d'
import { property } from 'modern-idoc'
import { Element2D } from '../2d'
import { customNode, IN_BROWSER, Transform2D } from '../../core'
import { Texture2D } from '../resources'
import { WebAudioContext } from './web'

export interface AudioWaveformProperties extends Element2DProperties {
  src: string
  gap: number
  color: string
}

@customNode('AudioWaveform')
export class AudioWaveform extends Element2D {
  @property() src?: string
  @property() gap = 0
  @property() color = '#000000'

  protected _audioBuffer?: AudioBuffer
  protected _src = IN_BROWSER
    ? new Texture2D(document.createElement('canvas'))
    : undefined

  protected _needsUpdateTexture = false

  constructor(options: Partial<AudioWaveformProperties> = {}) {
    super()
    this.setProperties(options)
  }

  protected override _updateProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateProperty(key, value, oldValue, declaration)

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
      this.context.uvTransform = new Transform2D().scale(
        1 / this.style.width!,
        1 / this.style.height!,
      )
    }
  }
}
