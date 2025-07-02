import type { NormalizedOutline, Outline, PropertyDeclaration } from 'modern-idoc'
import { isNone, normalizeOutline, property } from 'modern-idoc'
import { BaseElement2DFill } from './BaseElement2DFill'

export class BaseElement2DOutline extends BaseElement2DFill {
  @property() accessor color: NormalizedOutline['color'] = '#00000000'
  @property() accessor width: NormalizedOutline['width'] = 0
  @property() accessor style: NormalizedOutline['style'] = 'solid'

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
    ctx.stroke({ disableWrapMode })
  }
}
