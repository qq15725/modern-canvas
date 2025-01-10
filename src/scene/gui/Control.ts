import type { CanvasItemProperties } from '../main'
import { customNode } from '../../core'
import { CanvasItem } from '../main'

export interface ControlProperties extends CanvasItemProperties {
  //
}

@customNode('Control')
export class Control extends CanvasItem {
  constructor(properties?: Partial<ControlProperties>) {
    super()
    this.setProperties(properties)
  }
}
