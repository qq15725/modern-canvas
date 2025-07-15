import type { Foreground, NormalizedForeground, PropertyDeclaration } from 'modern-idoc'
import { isNone, normalizeForeground, property } from 'modern-idoc'
import { BaseElement2DFill } from './BaseElement2DFill'

export class BaseElement2DForeground extends BaseElement2DFill {
  @property() declare fillWithShape: NormalizedForeground['fillWithShape']

  override setProperties(properties?: Foreground): this {
    return super._setProperties(
      isNone(properties)
        ? undefined
        : normalizeForeground(properties),
    )
  }

  protected _updateProperty(key: string, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'fillWithShape':
        this.parent.requestRedraw()
        break
    }
  }
}
