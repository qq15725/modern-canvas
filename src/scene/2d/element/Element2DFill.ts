import type { Fill, NormalizedFill } from 'modern-idoc'
import type { AnimatedTexture, Texture2D } from '../../resources'
import type { Element2D } from './Element2D'
import { isNone, normalizeFill, property } from 'modern-idoc'
import { assets } from '../../../asset'
import { CoreObject } from '../../../core'
import { GradientTexture, ViewportTexture } from '../../resources'
import { getFillDrawOptions } from './utils'

export interface Element2DFill extends NormalizedFill {
  //
}

export class Element2DFill extends CoreObject {
  @property({ fallback: true }) declare enabled: boolean
  @property() declare color?: NormalizedFill['color']
  @property() declare image?: NormalizedFill['image']
  @property() declare linearGradient?: NormalizedFill['linearGradient']
  @property() declare radialGradient?: NormalizedFill['radialGradient']
  @property() declare cropRect?: NormalizedFill['cropRect']
  @property() declare stretchRect?: NormalizedFill['stretchRect']
  @property() declare dpi?: NormalizedFill['dpi']
  @property() declare rotateWithShape?: NormalizedFill['rotateWithShape']
  @property() declare tile?: NormalizedFill['tile']
  @property() declare opacity?: NormalizedFill['opacity']

  texture?: Texture2D
  animatedTexture?: AnimatedTexture

  constructor(
    public parent: Element2D,
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
        this.parent.requestDraw()
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
      this.texture = new GradientTexture(
        (this.linearGradient ?? this.radialGradient)!,
        this.parent.size.width,
        this.parent.size.height,
      )
    }
    else if (!isNone(this.image)) {
      this.parent.tree?.log(`load image ${this.image}`)

      if (this.image === 'viewport') {
        // skip
      }
      else {
        let isGif = this.image.split('?')[0].endsWith('.gif')
        const url = this.image
        const res = await assets.loadBy(url, async () => {
          const blob = await assets.fetch(url).then(rep => rep.blob())
          if (!isGif) {
            isGif = blob.type.startsWith('image/gif') ?? false
          }
          if (isGif) {
            return await assets.gif.load(blob)
          }
          else {
            return await assets.texture.load(blob)
          }
        })
        if (isGif) {
          this.animatedTexture = res as any
        }
        else {
          this.texture = res as any
        }
      }
    }
    else {
      this.animatedTexture = undefined
      this.texture = undefined
    }
  }

  protected async _updateTexture(): Promise<void> {
    await this.loadTexture()
    this.parent.requestDraw()
  }

  isValid(): boolean {
    return Boolean(
      this.enabled && (
        this.texture
        || this.animatedTexture
        || this.color
        || this.image === 'viewport'
      ),
    )
  }

  draw(): void {
    const { width, height } = this.parent.size
    const ctx = this.parent.context
    let options = {
      size: { width, height },
    }
    if (this.image === 'viewport') {
      ctx.fillStyle = new ViewportTexture()
    }
    else {
      options = {
        ...options,
        ...getFillDrawOptions(this, { x: 0, y: 0, width, height }),
      }
      ctx.fillStyle = this.animatedTexture?.currentFrame.texture
        ?? this.texture
        ?? this.color
        ?? '#000000FF'
    }
    ctx.fill(options)
  }

  protected _getFrameCurrentTime(): number {
    const duration = this.animatedTexture?.duration ?? 0
    if (!duration)
      return 0
    const currentTime = this.parent._currentTime
    if (currentTime < 0)
      return 0
    return currentTime % duration
  }

  updateFrameIndex(): this {
    if (!this.animatedTexture)
      return this
    const currentTime = this._getFrameCurrentTime()
    const frames = this.animatedTexture.frames
    const len = frames.length
    if (len <= 1 && this.animatedTexture.frameIndex === 0)
      return this
    let index = len - 1
    for (let time = 0, i = 0; i < len; i++) {
      time += frames[i].duration ?? 0
      if (time >= currentTime) {
        index = i
        break
      }
    }
    if (this.animatedTexture.frameIndex !== index) {
      this.animatedTexture.frameIndex = index
      this.parent.requestDraw()
    }
    return this
  }

  process(_delta: number): void {
    this.updateFrameIndex()
  }
}
