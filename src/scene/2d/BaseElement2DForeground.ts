import type { ForegroundDeclaration, ForegroundProperty } from 'modern-idoc'
import { normalizeForeground } from 'modern-idoc'
import { property } from '../../core'
import { BaseElement2DFill } from './BaseElement2DFill'

export interface BaseElement2DForeground extends ForegroundDeclaration {
  //
}

export class BaseElement2DForeground extends BaseElement2DFill {
  @property() declare color?: ForegroundDeclaration['color']
  @property() declare src?: ForegroundDeclaration['src']
  @property() declare dpi?: ForegroundDeclaration['dpi']
  @property() declare rotateWithShape?: ForegroundDeclaration['rotateWithShape']
  @property() declare tile?: ForegroundDeclaration['tile']
  @property() declare stretch?: ForegroundDeclaration['stretch']
  @property() declare opacity?: ForegroundDeclaration['opacity']

  override setProperties(properties?: ForegroundProperty): this {
    return super.setProperties(normalizeForeground(properties))
  }
}
