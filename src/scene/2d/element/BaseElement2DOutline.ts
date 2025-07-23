import type { NormalizedOutline, Outline, PropertyDeclaration } from 'modern-idoc'
import { isNone, normalizeOutline, property } from 'modern-idoc'
import { BaseElement2DFill } from './BaseElement2DFill'

export class BaseElement2DOutline extends BaseElement2DFill {
  @property({ fallback: '#00000000' }) declare color: NormalizedOutline['color']
  @property({ fallback: 0 }) declare width: NormalizedOutline['width']
  @property({ fallback: 'solid' }) declare style: NormalizedOutline['style']

  override setProperties(properties?: Outline): this {
    return super._setProperties(
      isNone(properties)
        ? undefined
        : normalizeOutline(properties),
    )
  }

  protected _updateProperty(key: string, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'width':
      case 'style':
      case 'enabled':
        this.parent.requestRedraw()
        break
    }
  }

  canDraw(): boolean {
    return Boolean(
      this.enabled && (
        this.width
        || this.color
        || super.canDraw()
      ),
    )
  }

  draw(): void {
    const ctx = this.parent.context
    const { uvTransform, disableWrapMode } = this._getDrawOptions()
    ctx.lineWidth = this.width || 1
    ctx.uvTransform = uvTransform
    ctx.strokeStyle = this._texture ?? this.color
    ctx.strokeAlignment = 0
    ctx.stroke({ disableWrapMode })
  }
}
