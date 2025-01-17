import type {
  EventListenerOptions,
  EventListenerValue,
  InputEvent,
  InputEventKey, PropertyDeclaration,
} from '../../core'
import type { CanvasItemEventMap, CanvasItemProperties, Node } from '../main'
import type { Rectangulable, RectangulableEventMap } from '../main/interfaces'
import { customNode, Rect2 } from '../../core'
import { CanvasItem } from '../main'

export interface ControlEventMap extends CanvasItemEventMap, RectangulableEventMap {
  //
}

export interface Control {
  on: (<K extends keyof ControlEventMap>(type: K, listener: ControlEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  off: (<K extends keyof ControlEventMap>(type: K, listener: ControlEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  emit: (<K extends keyof ControlEventMap>(type: K, ...args: Parameters<ControlEventMap[K]>) => boolean)
    & ((type: string, ...args: any[]) => boolean)
}

export interface ControlProperties extends CanvasItemProperties {
  //
}

@customNode('Control')
export class Control extends CanvasItem implements Rectangulable {
  constructor(properties?: Partial<ControlProperties>, children: Node[] = []) {
    super()
    this._updateRect = this._updateRect.bind(this)
    this.setProperties(properties)
    this.append(children)
  }

  protected override _parented(parent: any): void {
    super._parented(parent)
    ;(parent as Rectangulable).on('updateRect', this._updateRect)
  }

  protected override _unparented(oldParent: any): void {
    super._unparented(oldParent)
    ;(oldParent as Rectangulable).off('updateRect', this._updateRect)
  }

  protected _updateRect(): void {
    const rect = (this._parent as unknown as Rectangulable).getRect()
    this.style.left = rect.left
    this.style.top = rect.top
    this.style.width = rect.width
    this.style.height = rect.height
  }

  protected override _input(event: InputEvent, key: InputEventKey): void {
    super._input(event, key)
    this._guiInput(event, key)
  }

  protected override _updateStyleProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateStyleProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'width':
      case 'height':
      case 'left':
      case 'top':
        this.emit('updateRect')
        break
    }
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
