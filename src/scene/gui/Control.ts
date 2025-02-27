import type { BaseElement2DProperties } from '../2d'
import type {
  EventListenerOptions,
  EventListenerValue,
  InputEvent,
  InputEventKey, PropertyDeclaration,
} from '../../core'
import type { CanvasItemEventMap, Node, Rectangulable, RectangulableEventMap } from '../main'
import { Element2D } from '../2d'
import { customNode } from '../../core'

export interface ControlEventMap extends CanvasItemEventMap, RectangulableEventMap {
  //
}

export interface Control {
  on: (<K extends keyof ControlEventMap>(type: K, listener: ControlEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  once: (<K extends keyof ControlEventMap>(type: K, listener: ControlEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  off: (<K extends keyof ControlEventMap>(type: K, listener?: ControlEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  emit: (<K extends keyof ControlEventMap>(type: K, ...args: Parameters<ControlEventMap[K]>) => boolean)
    & ((type: string, ...args: any[]) => boolean)
}

export interface ControlProperties extends BaseElement2DProperties {
  //
}

@customNode('Control')
export class Control extends Element2D implements Rectangulable {
  constructor(properties?: Partial<ControlProperties>, children: Node[] = []) {
    super()
    this._parentUpdateRect = this._parentUpdateRect.bind(this)
    this.setProperties(properties)
    this.append(children)
  }

  protected override _parented(parent: any): void {
    super._parented(parent)
    ;(parent as Rectangulable).on('updateRect', this._parentUpdateRect)
  }

  protected override _unparented(oldParent: any): void {
    super._unparented(oldParent)
    ;(oldParent as Rectangulable).off('updateRect', this._parentUpdateRect)
  }

  protected _parentUpdateRect(): void {
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
}
