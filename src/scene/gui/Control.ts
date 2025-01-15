import type { InputEvent, InputEventKey } from '../../core'
import type { CanvasItemProperties, Node } from '../main'
import { customNode, Rect2 } from '../../core'
import { CanvasItem } from '../main'

export interface ControlProperties extends CanvasItemProperties {
  //
}

@customNode('Control')
export class Control extends CanvasItem {
  constructor(properties?: Partial<ControlProperties>, children: Node[] = []) {
    super()
    this.setProperties(properties)
    this.append(children)
  }

  protected override _input(event: InputEvent, key: InputEventKey): void {
    super._input(event, key)
    this._guiInput(event, key)
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  protected _guiInput(event: InputEvent, key: InputEventKey): void {}

  getRect(): Rect2 {
    let { left, top, width, height, rotate } = this.style
    if (rotate) {
      rotate = Math.abs(rotate % 180)
      rotate = (rotate / 180) * Math.PI
      const sin = Math.abs(Math.sin(rotate))
      const cos = Math.abs(Math.cos(rotate))
      const newWidth = height * sin + width * cos
      const newHeight = height * cos + width * sin
      left += (width - newWidth) / 2
      top += (height - newHeight) / 2
      width = newWidth
      height = newHeight
    }
    return new Rect2(left, top, width, height)
  }
}
