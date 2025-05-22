import type { Background, NormalizedBackground } from 'modern-idoc'
import { isNone, normalizeBackground } from 'modern-idoc'
import { property } from '../../core'
import { BaseElement2DFill } from './BaseElement2DFill'

export interface BaseElement2DBackground extends NormalizedBackground {
  //
}

export class BaseElement2DBackground extends BaseElement2DFill {
  @property() declare color?: NormalizedBackground['color']
  @property() declare image?: NormalizedBackground['image']
  @property() declare cropRect?: NormalizedBackground['cropRect']
  @property() declare stretchRect?: NormalizedBackground['stretchRect']
  @property() declare dpi?: NormalizedBackground['dpi']
  @property() declare rotateWithShape?: NormalizedBackground['rotateWithShape']
  @property() declare tile?: NormalizedBackground['tile']
  @property() declare opacity?: NormalizedBackground['opacity']

  override setProperties(properties?: Background): this {
    return super.setProperties(isNone(properties) ? undefined : normalizeBackground(properties))
  }
}
