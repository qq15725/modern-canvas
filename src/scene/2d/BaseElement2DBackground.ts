import type { Background, NormalizedBackground } from 'modern-idoc'
import { isNone, normalizeBackground, property } from 'modern-idoc'
import { BaseElement2DFill } from './BaseElement2DFill'

export class BaseElement2DBackground extends BaseElement2DFill {
  @property() accessor fillWithShape: NormalizedBackground['fillWithShape']

  override setProperties(properties?: Background): this {
    return super._setProperties(
      isNone(properties)
        ? undefined
        : normalizeBackground(properties),
    )
  }
}
