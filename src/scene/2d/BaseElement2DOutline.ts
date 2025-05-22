import type { NormalizedOutline, Outline } from 'modern-idoc'
import type { PropertyDeclaration } from '../../core'
import type { BaseElement2D } from './BaseElement2D'
import { isNone, normalizeOutline } from 'modern-idoc'
import { CoreObject, property } from '../../core'

export class BaseElement2DOutline extends CoreObject {
  @property({ default: 0x00000000 }) declare color: NormalizedOutline['color']
  @property({ default: 0 }) declare width: NormalizedOutline['width']
  @property({ default: 'solid' }) declare style: NormalizedOutline['style']

  constructor(
    public parent: BaseElement2D,
  ) {
    super()
  }

  override setProperties(properties?: Outline): this {
    return super.setProperties(isNone(properties) ? undefined : normalizeOutline(properties))
  }

  protected _updateProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'color':
      case 'width':
      case 'style':
      case 'src':
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
