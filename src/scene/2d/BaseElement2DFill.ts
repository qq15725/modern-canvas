import type { Fill, NormalizedFill } from 'modern-idoc'
import type { PropertyDeclaration } from '../../core'
import type { Texture2D } from '../resources'
import type { BaseElement2D } from './BaseElement2D'
import { isNone, normalizeFill } from 'modern-idoc'
import { assets } from '../../asset'
import { CoreObject, property, Transform2D } from '../../core'
import { GradientTexture } from '../resources'

export interface BaseElement2DFill extends NormalizedFill {
  //
}

export class BaseElement2DFill extends CoreObject {
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

  protected _texture?: Texture2D

  constructor(
    public parent: BaseElement2D,
  ) {
    super()
  }

  protected _setProperties(properties?: Fill): this {
    return super.setProperties(properties)
  }

  override setProperties(properties?: Fill): this {
    return this._setProperties(isNone(properties) ? undefined : normalizeFill(properties))
  }

  protected _updateProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'color':
      case 'cropRect':
      case 'stretchRect':
      case 'dpi':
      case 'rotateWithShape':
      case 'tile':
      case 'opacity':
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
      this._texture
      || this.color,
    )
  }

  protected _getDrawOptions(): { disableWrapMode: boolean, textureTransform?: Transform2D } {
    let textureTransform: Transform2D | undefined
    let disableWrapMode = false
    if (this._texture && this._texture.source instanceof ImageBitmap) {
      textureTransform = new Transform2D()
      const { width: imageWidth, height: imageHeight } = this._texture
      const { width, height } = this.parent.size
      if (this.cropRect) {
        const {
          left = 0,
          top = 0,
          right = 0,
          bottom = 0,
        } = this.cropRect
        const w = Math.abs(1 + (left + right)) * width
        const h = Math.abs(1 + (top + bottom)) * height
        const sx = 1 / w
        const sy = 1 / h
        const tx = (left * width) * sx
        const ty = (top * height) * sy
        textureTransform
          .scale(sx, sy)
          .translate(tx, ty)
        // TODO
      }
      if (this.tile) {
        const {
          translateX = 0,
          translateY = 0,
          scaleX = 1,
          scaleY = 1,
          // flip, TODO
          // alignment, TODO
        } = this.tile
        textureTransform
          .scale(1 / imageWidth, 1 / imageHeight)
          .scale(1 / scaleX, 1 / scaleY)
          .translate(-translateX / imageWidth, -translateY / imageHeight)
        disableWrapMode = true
      }
      else if (this.stretchRect) {
        const { left = 0, top = 0, right = 0, bottom = 0 } = this.stretchRect
        const w = Math.abs(1 + (-left + -right)) * width
        const h = Math.abs(1 + (-top + -bottom)) * height
        const scaleX = 1 / w
        const scaleY = 1 / h
        const translateX = (-left * width) * scaleX
        const translateY = (-top * height) * scaleY
        textureTransform
          .scale(scaleX, scaleY)
          .translate(translateX, translateY)
        disableWrapMode = true
      }
      else {
        textureTransform
          .scale(1 / width, 1 / height)
      }
    }
    return { disableWrapMode, textureTransform }
  }

  draw(): void {
    const ctx = this.parent.context
    const { textureTransform, disableWrapMode } = this._getDrawOptions()
    ctx.textureTransform = textureTransform
    ctx.fillStyle = this._texture ?? this.color
    ctx.fill({ disableWrapMode })
  }
}
