import type { Node } from '../main'
import type { ScrollBarProperties } from './ScrollBar'
import { customNode } from '../../core'
import { ScrollBar } from './ScrollBar'

export interface YScrollBarProperties extends Omit<ScrollBarProperties, 'direction'> {
  //
}

@customNode<ScrollBarProperties>('YScrollBar', {
  direction: 'vertical',
})
export class YScrollBar extends ScrollBar {
  constructor(properties?: Partial<YScrollBarProperties>, children: Node[] = []) {
    super()

    this
      .setProperties(properties)
      .append(children)
  }
}
