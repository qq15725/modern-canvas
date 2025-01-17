import type { Node } from '../main'
import type { ScrollBarProperties } from './ScrollBar'
import { customNode } from '../../core'
import { ScrollBar } from './ScrollBar'

export interface XScrollBarProperties extends Omit<ScrollBarProperties, 'direction'> {
  //
}

@customNode<ScrollBarProperties>('XScrollBar', {
  direction: 'horizontal',
})
export class XScrollBar extends ScrollBar {
  constructor(properties?: Partial<XScrollBarProperties>, children: Node[] = []) {
    super()

    this
      .setProperties(properties)
      .append(children)
  }
}
