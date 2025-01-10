import type { ControlProperties } from './Control'
import { customNode } from '../../core'
import { Control } from './Control'

export interface DrawboardProperties extends ControlProperties {
  //
}

@customNode('Drawboard')
export class Drawboard extends Control {
  constructor(properties?: Partial<DrawboardProperties>) {
    super()
    this.setProperties(properties)
  }
}
