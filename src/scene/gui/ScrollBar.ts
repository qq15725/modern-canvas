import type { InputEvent, InputEventKey, PropertyDeclaration } from '../../core'
import type { Node } from '../main'
import type { RangeProperties } from './Range'
import { customNode, property } from '../../core'
import { Range } from './Range'

export interface ScrollBarProperties extends RangeProperties {
  direction: 'vertical' | 'horizontal'
}

@customNode<ScrollBarProperties>('ScrollBar')
export class ScrollBar extends Range {
  @property({ default: 'vertical' }) declare direction: 'vertical' | 'horizontal'

  constructor(properties?: Partial<ScrollBarProperties>, children: Node[] = []) {
    super()

    this
      .setProperties(properties)
      .append(children)
  }

  protected override _updateStyleProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateStyleProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'width':
      case 'height':
      case 'left':
      case 'top':
        this.requestRedraw()
        break
    }
  }

  protected override _guiInput(event: InputEvent, key: InputEventKey): void {
    super._guiInput(event, key)

    switch (key) {
      case 'pointermove':
        break
    }
  }

  protected override _draw(): void {
    let left, top, width, height, radii
    if (this.direction === 'vertical') {
      width = 10
      height = this.style.height * (this.page / (this.maxValue - this.minValue))
      left = (this.style.left + this.style.width) - width
      top = this.style.height * (this.value / (this.maxValue - this.minValue))
      radii = width / 2
    }
    else {
      width = this.style.width * (this.page / (this.maxValue - this.minValue))
      height = 10
      left = this.style.width * (this.value / (this.maxValue - this.minValue))
      top = (this.style.top + this.style.height) - height
      radii = height / 2
    }
    this.context.roundRect(left, top, width, height, radii)
    this.context.fillStyle = 0x00000022
    this.context.fill()
  }
}
