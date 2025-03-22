import type { FillDeclaration, ImageFillSource, ImageFillStretch, ImageFillTile } from 'modern-idoc'
import type { ColorValue, PropertyDeclaration } from '../../core'
import type { Texture2D } from '../resources'
import type { BaseElement2D } from './BaseElement2D'
import { assets } from '../../asset'
import { CoreObject, property, Transform2D } from '../../core'

export type BaseElement2DFillProperties = FillDeclaration

export class BaseElement2DFill extends CoreObject {
  @property() declare color?: ColorValue
  @property() declare image?: ImageFillSource
  @property() declare dpi?: number
  @property() declare rotateWithShape?: boolean
  @property() declare tile?: ImageFillTile
  @property() declare stretch?: ImageFillStretch

  protected _image?: Texture2D<ImageBitmap>

  constructor(
    public parent: BaseElement2D,
    properties?: Partial<BaseElement2DFillProperties>,
  ) {
    super()
    this.setProperties(properties)
  }

  protected _updateProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'color':
      case 'dpi':
      case 'rotateWithShape':
      case 'tile':
        this.parent.requestRedraw()
        break
      case 'image':
        this._updateImage()
        break
    }
  }

  async loadImage(): Promise<Texture2D<ImageBitmap> | undefined> {
    if (this.image && this.image !== 'none') {
      return await assets.texture.load(this.image)
    }
  }

  protected async _updateImage(): Promise<void> {
    this._image = await this.loadImage()
    this.parent.requestRedraw()
  }

  canDraw(): boolean {
    return Boolean(
      this._image || this.color,
    )
  }

  draw(): void {
    const ctx = this.parent.context
    if (this._image) {
      const { width: imageWidth, height: imageHeight } = this._image
      const { width, height } = this.parent.size
      const transform = new Transform2D()
      if (this.tile) {
        const {
          translateX = 0,
          translateY = 0,
          scaleX = 1,
          scaleY = 1,
          // flip, TODO
          // alignment, TODO
        } = this.tile
        transform
          .scale(1 / imageWidth, 1 / imageHeight)
          .scale(1 / scaleX, 1 / scaleY)
          .translate(-translateX / imageWidth, -translateY / imageHeight)
      }
      else if (this.stretch) {
        const { left = 0, top = 0, right = 0, bottom = 0 } = this.stretch.rect ?? {}
        const w = Math.abs(1 + (-left + -right)) * width
        const h = Math.abs(1 + (-top + -bottom)) * height
        const scaleX = 1 / w
        const scaleY = 1 / h
        const translateX = (-left * width) * scaleX
        const translateY = (-top * height) * scaleY
        transform
          .scale(scaleX, scaleY)
          .translate(translateX, translateY)
      }
      else {
        transform
          .scale(1 / width, 1 / height)
      }
      ctx.textureTransform = transform
      ctx.fillStyle = this._image
      ctx.fill({
        disableWrapMode: true,
      })
    }
    else {
      ctx.fillStyle = this.color
      ctx.fill()
    }
  }
}
