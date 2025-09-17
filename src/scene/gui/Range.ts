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
  @property({ fallback: false }) declare allowGreater: boolean
  @property({ fallback: false }) declare allowLesser: boolean
  @property({ fallback: 1 }) declare page: number
  @property({ fallback: 0 }) declare minValue: number
  @property({ fallback: 100 }) declare maxValue: number
  @property({ fallback: 0.01 }) declare step: number
  @property({ fallback: 0 }) declare value: number

  constructor(properties?: Partial<RangeProperties>, children: Node[] = []) {
    super()

    this
      .setProperties(properties)
      .append(children)
  }

  protected override _updateProperty(key: string, value: any, oldValue: any): void {
    super._updateProperty(key, value, oldValue)

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
