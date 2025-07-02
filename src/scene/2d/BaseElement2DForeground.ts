import type { Foreground, NormalizedForeground } from 'modern-idoc'
import { isNone, normalizeForeground, property } from 'modern-idoc'
import { BaseElement2DFill } from './BaseElement2DFill'

export class BaseElement2DForeground extends BaseElement2DFill {
  @property() accessor fillWithShape: NormalizedForeground['fillWithShape']

  override setProperties(properties?: Foreground): this {
    return super._setProperties(
      isNone(properties)
        ? undefined
        : normalizeForeground(properties),
    )
  }
}
