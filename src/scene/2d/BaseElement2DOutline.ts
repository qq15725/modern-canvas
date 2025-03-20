import type { OutlineDeclaration } from 'modern-idoc'
import type { ColorValue, PropertyDeclaration } from '../../core'
import type { BaseElement2D } from './BaseElement2D'
import { CoreObject, property } from '../../core'

export type BaseElement2DOutlineProperties = OutlineDeclaration

export class BaseElement2DOutline extends CoreObject {
  @property({ default: 0x00000000 }) declare color: ColorValue
  @property({ default: 0 }) declare width: number
  @property({ default: 'solid' }) declare style: 'dashed' | 'solid' | string
  @property() declare image?: string
  @property({ default: 1 }) declare opacity: number

  constructor(
    public parent: BaseElement2D,
    properties?: Partial<BaseElement2DOutlineProperties>,
  ) {
    super()
    this.setProperties(properties)
  }

  protected _updateProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'color':
      case 'width':
      case 'style':
      case 'image':
      case 'opacity':
        this.parent.requestRedraw()
        break
    }
  }

  canDraw(): boolean {
    return Boolean(
      this.width
      || this.color,
    )
  }

  draw(): void {
    const ctx = this.parent.context
    ctx.lineWidth = this.width
    ctx.strokeStyle = this.color
    ctx.stroke()
  }
}
