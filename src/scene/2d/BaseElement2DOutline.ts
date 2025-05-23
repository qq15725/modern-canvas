import type { NormalizedOutline, Outline } from 'modern-idoc'
import type { PropertyDeclaration } from '../../core'
import { isNone, normalizeOutline } from 'modern-idoc'
import { property } from '../../core'
import { BaseElement2DFill } from './BaseElement2DFill'

export class BaseElement2DOutline extends BaseElement2DFill {
  @property({ default: 0x00000000 }) declare color: NormalizedOutline['color']
  @property({ default: 0 }) declare width: NormalizedOutline['width']
  @property({ default: 'solid' }) declare style: NormalizedOutline['style']

  override setProperties(properties?: Outline): this {
    return super._setProperties(isNone(properties) ? undefined : normalizeOutline(properties))
  }

  protected _updateProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'width':
      case 'style':
        this.parent.requestRedraw()
        break
    }
  }

  canDraw(): boolean {
    return Boolean(
      this.width
      || super.canDraw(),
    )
  }

  draw(): void {
    const ctx = this.parent.context
    const { textureTransform, disableWrapMode } = this._getDrawOptions()
    ctx.lineWidth = this.width
    ctx.textureTransform = textureTransform
    ctx.strokeStyle = this._texture ?? this.color
    ctx.stroke({ disableWrapMode })
  }
}
