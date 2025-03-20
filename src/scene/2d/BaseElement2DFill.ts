import type { FillDeclaration, ImageFillSource, ImageFillTile } from 'modern-idoc'
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
      // TODO Tile
      const { width, height } = this.parent.size
      ctx.textureTransform = new Transform2D().scale(1 / width, 1 / height)
      ctx.fillStyle = this._image
    }
    else {
      ctx.fillStyle = this.color
    }
    ctx.fill()
  }
}
