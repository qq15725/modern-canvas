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
  @property() accessor allowGreater: boolean = false
  @property() accessor allowLesser: boolean = false
  @property() accessor page: number = 1
  @property() accessor minValue: number = 0
  @property() accessor maxValue: number = 100
  @property() accessor step: number = 0.01
  @property() accessor value: number = 0

  constructor(properties?: Partial<RangeProperties>, children: Node[] = []) {
    super()

    this
      .setProperties(properties)
      .append(children)
  }

  protected override _updateProperty(key: string, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
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
