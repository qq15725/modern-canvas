import type { Foreground, NormalizedForeground } from 'modern-idoc'
import { isNone, normalizeForeground } from 'modern-idoc'
import { property } from '../../core'
import { BaseElement2DFill } from './BaseElement2DFill'

export interface BaseElement2DForeground extends NormalizedForeground {
  //
}

export class BaseElement2DForeground extends BaseElement2DFill {
  @property() declare fillWithShape?: NormalizedForeground['fillWithShape']

  override setProperties(properties?: Foreground): this {
    return super._setProperties(isNone(properties) ? undefined : normalizeForeground(properties))
  }
}
