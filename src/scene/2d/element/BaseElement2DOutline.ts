import type { NormalizedOutline, Outline, PropertyDeclaration } from 'modern-idoc'
import { isNone, normalizeOutline, property } from 'modern-idoc'
import { BaseElement2DFill } from './BaseElement2DFill'
import { getDrawOptions } from './utils'

export class BaseElement2DOutline extends BaseElement2DFill {
  @property({ fallback: '#00000000' }) declare color: NormalizedOutline['color']
  @property({ fallback: 0 }) declare width: NormalizedOutline['width']
  @property({ fallback: 'solid' }) declare style: NormalizedOutline['style']
  @property({ fallback: 'butt' }) declare lineCap: NormalizedOutline['lineCap']
  @property({ fallback: 'miter' }) declare lineJoin: NormalizedOutline['lineJoin']

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
      case 'lineCap':
      case 'lineJoin':
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
    const { uvTransform, disableWrapMode } = getDrawOptions(
      this, this.parent.size,
    )
    ctx.lineWidth = this.width || 1
    ctx.uvTransform = uvTransform
    ctx.strokeStyle = this._texture ?? this.color
    ctx.lineCap = this.lineCap
    ctx.lineJoin = this.lineJoin
    ctx.stroke({ disableWrapMode })
  }
}
