import type { FillDeclaration, FillProperty } from 'modern-idoc'
import type { PropertyDeclaration } from '../../core'
import type { Texture2D } from '../resources'
import type { BaseElement2D } from './BaseElement2D'
import { normalizeFill } from 'modern-idoc'
import { assets } from '../../asset'
import { CoreObject, property, Transform2D } from '../../core'

export interface BaseElement2DFill extends FillDeclaration {
  //
}

export class BaseElement2DFill extends CoreObject {
  @property() declare color?: FillDeclaration['color']
  @property() declare src?: FillDeclaration['src']
  @property() declare dpi?: FillDeclaration['dpi']
  @property() declare rotateWithShape?: FillDeclaration['rotateWithShape']
  @property() declare tile?: FillDeclaration['tile']
  @property() declare stretch?: FillDeclaration['stretch']
  @property() declare opacity?: FillDeclaration['opacity']

  protected _src?: Texture2D<ImageBitmap>

  constructor(
    public parent: BaseElement2D,
  ) {
    super()
  }

  override setProperties(properties?: FillProperty): this {
    return super.setProperties(normalizeFill(properties))
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
      case 'src':
        this._updateSource()
        break
    }
  }

  async loadSource(): Promise<Texture2D<ImageBitmap> | undefined> {
    if (this.src && this.src !== 'none') {
      return await assets.texture.load(this.src)
    }
  }

  protected async _updateSource(): Promise<void> {
    this._src = await this.loadSource()
    this.parent.requestRedraw()
  }

  canDraw(): boolean {
    return Boolean(
      this._src || this.color,
    )
  }

  draw(): void {
    const ctx = this.parent.context
    if (this._src) {
      const { width: imageWidth, height: imageHeight } = this._src
      const { width, height } = this.parent.size
      const transform = new Transform2D()
      let disableWrapMode = false
      if (this.srcRect) {
        const {
          left = 0,
          top = 0,
          right = 0,
          bottom = 0,
        } = this.srcRect
        const w = Math.abs(1 + (left + right)) * width
        const h = Math.abs(1 + (top + bottom)) * height
        const sx = 1 / w
        const sy = 1 / h
        const tx = (left * width) * sx
        const ty = (top * height) * sy
        transform
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
        transform
          .scale(1 / imageWidth, 1 / imageHeight)
          .scale(1 / scaleX, 1 / scaleY)
          .translate(-translateX / imageWidth, -translateY / imageHeight)
        disableWrapMode = true
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
        disableWrapMode = true
      }
      else {
        transform
          .scale(1 / width, 1 / height)
      }
      ctx.textureTransform = transform
      ctx.fillStyle = this._src
      ctx.fill({
        disableWrapMode,
      })
    }
    else {
      ctx.fillStyle = this.color
      ctx.fill()
    }
  }
}
