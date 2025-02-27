import type {
  EventListenerOptions,
  EventListenerValue,
  PropertyDeclaration,
} from '../../core'
import type { Node, Rectangulable } from '../main'
import type { BaseElement2DEventMap, BaseElement2DProperties } from './BaseElement2D'
import type { FlexElement2DStyleProperties } from './FlexElement2DStyle'
import { Direction } from 'yoga-layout/load'
import { customNode } from '../../core'
import { BaseElement2D } from './BaseElement2D'
import { FlexElement2DStyle } from './FlexElement2DStyle'
import { FlexLayout } from './FlexLayout'

export interface FlexBaseElement2DEventMap extends BaseElement2DEventMap {
  updateStyleProperty: (key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration) => void
}

export interface FlexElement2D {
  on: (<K extends keyof FlexBaseElement2DEventMap>(type: K, listener: FlexBaseElement2DEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  once: (<K extends keyof FlexBaseElement2DEventMap>(type: K, listener: FlexBaseElement2DEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  off: (<K extends keyof FlexBaseElement2DEventMap>(type: K, listener?: FlexBaseElement2DEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  emit: (<K extends keyof FlexBaseElement2DEventMap>(type: K, ...args: Parameters<FlexBaseElement2DEventMap[K]>) => boolean)
    & ((type: string, ...args: any[]) => boolean)
}

export interface FlexElement2DProperties extends BaseElement2DProperties {
  style: Partial<FlexElement2DStyleProperties>
}

/**
 * Flexbox Element 2D
 */
@customNode('FlexElement2D')
export class FlexElement2D extends BaseElement2D implements Rectangulable {
  protected declare _style: FlexElement2DStyle
  override get style(): FlexElement2DStyle { return this._style }
  set style(style) {
    const cb = (...args: any[]): void => {
      this.emit('updateStyleProperty', ...args)
      this._updateStyleProperty(args[0], args[1], args[2], args[3])
    }
    style.on('updateProperty', cb)
    this._style?.off('updateProperty', cb)
    this._style = style
  }

  _layout = new FlexLayout(this)

  get offsetLeft(): number {
    return this._layout.offsetLeft
  }

  get offsetTop(): number {
    return this._layout.offsetTop
  }

  get offsetWidth(): number {
    return this._layout.offsetWidth
  }

  get offsetHeight(): number {
    return this._layout.offsetHeight
  }

  constructor(properties?: Partial<FlexElement2DProperties>, nodes: Node[] = []) {
    super()

    this.style = new FlexElement2DStyle()

    this
      .setProperties(properties)
      .append(nodes)
  }

  protected override _parented(parent: Node): void {
    super._parented(parent)

    if ((parent as FlexElement2D)._layout && this._layout._node) {
      (parent as FlexElement2D)._layout._node!.insertChild(
        this._layout._node,
        (parent as FlexElement2D)._layout._node!.getChildCount(),
      )
    }
  }

  protected override _unparented(oldParent: Node): void {
    super._unparented(oldParent)

    if ((oldParent as FlexElement2D)._layout?._node) {
      (oldParent as FlexElement2D)._layout._node!.removeChild(this._layout._node)
    }
  }

  protected _updateStyleProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateStyleProperty(key, value, oldValue, declaration)

    this._layout.updateStyleProperty(key, value, oldValue, declaration)

    if (this._layout._node.isDirty()) {
      this.requestRelayout()
    }
  }

  protected override _updateTransform(): void {
    this.calculateLayout(undefined, undefined, Direction.LTR)
    const { left, top, width, height } = this._layout.getComputedLayout()
    this.position.x = left
    this.position.y = top
    this.size.x = width
    this.size.y = height
    super._updateTransform()
  }

  calculateLayout(width?: number | 'auto', height?: number | 'auto', direction?: Direction): void {
    const parent = this.getParent<FlexElement2D>()
    if (parent?._layout?.calculateLayout) {
      parent?._layout.calculateLayout(width, height, direction)
    }
    else {
      this._layout.calculateLayout(width, height, direction)
    }
  }
}
