import type { Background, NormalizedBackground } from 'modern-idoc'
import { isNone, normalizeBackground, property } from 'modern-idoc'
import { Element2DFill } from './Element2DFill'

export class Element2DBackground extends Element2DFill {
  @property() declare fillWithShape: NormalizedBackground['fillWithShape']

  override setProperties(properties?: Background): this {
    return super._setProperties(
      isNone(properties)
        ? undefined
        : normalizeBackground(properties),
    )
  }

  protected _updateProperty(key: string, value: any, oldValue: any): void {
    super._updateProperty(key, value, oldValue)

    switch (key) {
      case 'fillWithShape':
        this.parent.requestDraw()
        break
    }
  }
}
