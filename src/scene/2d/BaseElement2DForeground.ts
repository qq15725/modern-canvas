import type { Foreground, NormalizedForeground } from 'modern-idoc'
import { isNone, normalizeForeground } from 'modern-idoc'
import { property } from '../../core'
import { BaseElement2DFill } from './BaseElement2DFill'

export interface BaseElement2DForeground extends NormalizedForeground {
  //
}

export class BaseElement2DForeground extends BaseElement2DFill {
  @property() declare color?: NormalizedForeground['color']
  @property() declare image?: NormalizedForeground['image']
  @property() declare cropRect?: NormalizedForeground['cropRect']
  @property() declare stretchRect?: NormalizedForeground['stretchRect']
  @property() declare dpi?: NormalizedForeground['dpi']
  @property() declare rotateWithShape?: NormalizedForeground['rotateWithShape']
  @property() declare tile?: NormalizedForeground['tile']
  @property() declare opacity?: NormalizedForeground['opacity']

  override setProperties(properties?: Foreground): this {
    return super.setProperties(isNone(properties) ? undefined : normalizeForeground(properties))
  }
}
