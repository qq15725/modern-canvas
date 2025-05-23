import type { Background, NormalizedBackground } from 'modern-idoc'
import { isNone, normalizeBackground } from 'modern-idoc'
import { property } from '../../core'
import { BaseElement2DFill } from './BaseElement2DFill'

export interface BaseElement2DBackground extends NormalizedBackground {
  //
}

export class BaseElement2DBackground extends BaseElement2DFill {
  @property() declare fillWithShape?: NormalizedBackground['fillWithShape']

  override setProperties(properties?: Background): this {
    return super._setProperties(isNone(properties) ? undefined : normalizeBackground(properties))
  }
}
