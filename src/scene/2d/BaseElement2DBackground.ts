import type { BackgroundDeclaration, BackgroundProperty } from 'modern-idoc'
import { normalizeBackground } from 'modern-idoc'
import { property } from '../../core'
import { BaseElement2DFill } from './BaseElement2DFill'

export interface BaseElement2DBackground extends BackgroundDeclaration {
  //
}

export class BaseElement2DBackground extends BaseElement2DFill {
  @property() declare color?: BackgroundDeclaration['color']
  @property() declare src?: BackgroundDeclaration['src']
  @property() declare dpi?: BackgroundDeclaration['dpi']
  @property() declare rotateWithShape?: BackgroundDeclaration['rotateWithShape']
  @property() declare tile?: BackgroundDeclaration['tile']
  @property() declare stretch?: BackgroundDeclaration['stretch']
  @property() declare opacity?: BackgroundDeclaration['opacity']

  override setProperties(properties?: BackgroundProperty): this {
    return super.setProperties(normalizeBackground(properties))
  }
}
