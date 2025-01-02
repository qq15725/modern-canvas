import type { Texture } from '../core'
import type { Node2DOptions } from './Node2D'
import { customNode, property } from '../core'
import { Transform2D } from '../math'
import { Node2D } from './Node2D'

export interface Element2DOptions extends Node2DOptions {
  draggable?: boolean
}

@customNode({
  tag: 'Element2D',
  renderable: true,
})
export class Element2D extends Node2D {
  @property() draggable?: boolean

  protected _background?: Texture

  constructor(options?: Element2DOptions) {
    super()
    this.setProperties(options)
  }

  protected override _onUpdateStyleProperty(key: PropertyKey, value: any, oldValue: any): void {
    super._onUpdateStyleProperty(key, value, oldValue)

    switch (key) {
      case 'backgroundImage':
        this._updateBackground()
        break
      case 'borderRadius':
        this.requestRedraw()
        break
      case 'overflow':
        this._updateOverflow()
        break
    }
  }

  protected async _updateBackground(): Promise<void> {
    this._background = await this.style.getComputedBackground()
    this.requestRedraw()
  }

  protected override _updateTransform(): void {
    super._updateTransform()
    this._updateOverflow()
  }

  protected _updateOverflow(): void {
    if (this.style.overflow === 'hidden') {
      const [a, c, tx, b, d, ty] = this._transform.toArray()
      const width = this.style.width
      const height = this.style.height
      this.mask = {
        x: tx,
        y: ty,
        width: (a * width) + (c * height),
        height: (b * width) + (d * height),
      }
    }
    else {
      this.mask = undefined
    }
  }

  protected override _draw(): void {
    super._draw()
    this._drawBackground()
    this._drawContent()
  }

  protected _drawBackground(): void {
    const texture = this._background
    if (!texture?.valid)
      return
    this.context.fillStyle = texture
    this.context.textureTransform = new Transform2D().scale(
      this.style.width / texture.width,
      this.style.height / texture.height,
    )
    this._drawRect()
  }

  protected _drawContent(): void {
    this._drawRect()
  }

  protected _drawRect(): void {
    if (this.style.borderRadius) {
      this.context.roundRect(0, 0, this.style.width, this.style.height, this.style.borderRadius)
    }
    else {
      this.context.rect(0, 0, this.style.width, this.style.height)
    }
    this.context.fill()
  }
}
