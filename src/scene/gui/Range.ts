import type { PropertyDeclaration } from 'modern-idoc'
import type { Node } from '../main'
import type { ControlProperties } from './Control'
import { property } from 'modern-idoc'
import { customNode } from '../../core'
import { Control } from './Control'

export interface RangeProperties extends ControlProperties {
  allowGreater: boolean
  allowLesser: boolean
  page: number
  minValue: number
  maxValue: number
  step: number
  value: number
}

@customNode<RangeProperties>('Range')
export class Range extends Control {
  @property({ default: false }) declare allowGreater: boolean
  @property({ default: false }) declare allowLesser: boolean
  @property({ default: 1 }) declare page: number
  @property({ default: 0 }) declare minValue: number
  @property({ default: 100 }) declare maxValue: number
  @property({ default: 0.01 }) declare step: number
  @property({ default: 0 }) declare value: number

  constructor(properties?: Partial<RangeProperties>, children: Node[] = []) {
    super()

    this
      .setProperties(properties)
      .append(children)
  }

  protected override _updateProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'allowGreater':
      case 'allowLesser':
      case 'page':
      case 'minValue':
      case 'maxValue':
      case 'step':
      case 'value':
        this.requestRedraw()
        break
    }
  }
}
