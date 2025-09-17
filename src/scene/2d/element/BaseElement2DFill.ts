import type { Fill, NormalizedFill } from 'modern-idoc'
import type { Texture2D } from '../../resources'
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

  async loadTexture(): Promise<Texture2D | undefined> {
    if (this.linearGradient || this.radialGradient) {
      return new GradientTexture(
        (this.linearGradient ?? this.radialGradient)!,
        this.parent.size.width,
        this.parent.size.height,
      )
    }
    else if (!isNone(this.image)) {
      this.parent.tree?.log(`load image ${this.image}`)
      return await assets.texture.load(this.image)
    }
    else {
      return undefined
    }
  }

  protected async _updateTexture(): Promise<void> {
    this._texture = await this.loadTexture()
    this.parent.requestRedraw()
  }

  canDraw(): boolean {
    return Boolean(
      this.enabled && (
        this._texture
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
    ctx.fillStyle = this._texture ?? this.color
    ctx.fill({
      disableWrapMode,
    })
  }
}
