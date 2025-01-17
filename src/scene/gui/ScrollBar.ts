import type { InputEvent, InputEventKey } from '../../core'
import type { Node } from '../main'
import type { Rectangulable } from '../main/interfaces'
import type { ControlProperties } from './Control'
import { customNode, property } from '../../core'
import { Control } from './Control'

export interface ScrollBarProperties extends ControlProperties {
  direction: 'vertical' | 'horizontal'
}

@customNode<ScrollBarProperties>('ScrollBar')
export class ScrollBar extends Control {
  @property({ default: 'vertical' }) declare direction: 'vertical' | 'horizontal'
  @property({ default: 10 }) declare padding: number

  constructor(properties: Partial<ScrollBarProperties>, children: Node[] = []) {
    super()
    this
      .setProperties(properties)
      .append(children)
  }

  protected override _updateRect(): void {
    super._updateRect()
    const rect = (this._parent as unknown as Rectangulable).getRect()
    if (rect && rect.width && rect.height) {
      if (this.direction === 'vertical') {
        this.style.width = 10
        this.style.height = rect.height - this.padding * 2
        this.style.left = rect.right - this.style.width
        this.style.top = this.padding
      }
      else {
        this.style.height = 10
        this.style.width = rect.width - this.padding * 2
        this.style.left = this.padding
        this.style.top = rect.bottom - this.style.height
      }
    }
    this.requestRedraw()
  }

  protected override _guiInput(event: InputEvent, key: InputEventKey): void {
    super._guiInput(event, key)

    switch (key) {
      case 'pointermove':
        break
    }
  }

  protected override _draw(): void {
    this.context.roundRect(
      this.style.left,
      this.style.top,
      this.style.width,
      this.style.height,
      this.style.borderRadius ?? 20,
    )
    this.context.fillStyle = 0x0000000F
    this.context.fill()
  }
}
