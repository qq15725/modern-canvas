import type { Fill, NormalizedFill } from 'modern-idoc'
import type { AnimatedTexture, Texture2D } from '../../resources'
import type { BaseElement2D } from './BaseElement2D'
import { isNone, normalizeFill, property } from 'modern-idoc'
import { assets } from '../../../asset'
import { CoreObject } from '../../../core'
import { GradientTexture } from '../../resources'
import { getDrawOptions } from './utils'

export interface BaseElement2DFill extends NormalizedFill {
  //
}

export class BaseElement2DFill extends CoreObject {
  @property({ fallback: true }) declare enabled: boolean
  @property() declare color: NormalizedFill['color']
  @property() declare image: NormalizedFill['image']
  @property() declare linearGradient: NormalizedFill['linearGradient']
  @property() declare radialGradient: NormalizedFill['radialGradient']
  @property() declare cropRect: NormalizedFill['cropRect']
  @property() declare stretchRect: NormalizedFill['stretchRect']
  @property() declare dpi: NormalizedFill['dpi']
  @property() declare rotateWithShape: NormalizedFill['rotateWithShape']
  @property() declare tile: NormalizedFill['tile']
  @property() declare opacity: NormalizedFill['opacity']

  protected _texture?: Texture2D
  protected _animatedTexture?: AnimatedTexture

  constructor(
    public parent: BaseElement2D,
  ) {
    super()
  }

  protected _setProperties(properties?: NormalizedFill): this {
    return super.setProperties(properties)
  }

  override setProperties(properties?: Fill): this {
    return this._setProperties(
      isNone(properties)
        ? undefined
        : normalizeFill(properties),
    )
  }

  protected _updateProperty(key: string, value: any, oldValue: any): void {
    super._updateProperty(key, value, oldValue)

    switch (key) {
      case 'color':
      case 'cropRect':
      case 'stretchRect':
      case 'dpi':
      case 'rotateWithShape':
      case 'tile':
      case 'opacity':
      case 'enabled':
        this.parent.requestRedraw()
        break
      case 'image':
      case 'linearGradient':
      case 'radialGradient':
        this._updateTexture()
        break
    }
  }

  async loadTexture(): Promise<void> {
    if (this.linearGradient || this.radialGradient) {
      this._texture = new GradientTexture(
        (this.linearGradient ?? this.radialGradient)!,
        this.parent.size.width,
        this.parent.size.height,
      )
    }
    else if (!isNone(this.image)) {
      this.parent.tree?.log(`load image ${this.image}`)
      if (this.image.split('?')[0].endsWith('.gif')) {
        this._animatedTexture = await assets.gif.load(this.image)
      }
      else {
        this._texture = await assets.texture.load(this.image)
      }
    }
  }

  protected async _updateTexture(): Promise<void> {
    await this.loadTexture()
    this.parent.requestRedraw()
  }

  canDraw(): boolean {
    return Boolean(
      this.enabled && (
        this._texture
        || this._animatedTexture
        || this.color
      ),
    )
  }

  draw(): void {
    const ctx = this.parent.context
    const { uvTransform, disableWrapMode } = getDrawOptions(
      this, {
        width: this.parent.size.width,
        height: this.parent.size.height,
      },
    )
    ctx.uvTransform = uvTransform
    ctx.fillStyle = this._animatedTexture?.currentFrame.texture
      ?? this._texture
      ?? this.color
    ctx.fill({
      disableWrapMode,
    })
  }

  protected _getFrameCurrentTime(): number {
    const duration = this._animatedTexture?.duration ?? 0
    if (!duration)
      return 0
    const currentTime = this.parent._currentTime
    if (currentTime < 0)
      return 0
    return currentTime % duration
  }

  updateFrameIndex(): this {
    if (!this._animatedTexture)
      return this
    const currentTime = this._getFrameCurrentTime()
    const frames = this._animatedTexture.frames
    const len = frames.length
    if (len <= 1 && this._animatedTexture.frameIndex === 0)
      return this
    let index = len - 1
    for (let time = 0, i = 0; i < len; i++) {
      time += frames[i].duration ?? 0
      if (time >= currentTime) {
        index = i
        break
      }
    }
    if (this._animatedTexture.frameIndex !== index) {
      this._animatedTexture.frameIndex = index
      this.parent.requestRedraw()
    }
    return this
  }
}
