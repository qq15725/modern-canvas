import type { Node, Rectangulable } from '../main'
import type { BaseElement2DEvents, BaseElement2DProperties, FlexElement2DStyleProperties } from './element'
import { customNode } from '../../core'
import { BaseElement2D, FlexElement2DStyle } from './element'
import { directionMap, FlexLayout } from './FlexLayout'

export interface FlexBaseElement2DEvents extends BaseElement2DEvents {
  updateStyleProperty: [key: string, value: any, oldValue: any]
}

export interface FlexElement2D {
  on: <K extends keyof FlexBaseElement2DEvents & string>(event: K, listener: (...args: FlexBaseElement2DEvents[K]) => void) => this
  once: <K extends keyof FlexBaseElement2DEvents & string>(event: K, listener: (...args: FlexBaseElement2DEvents[K]) => void) => this
  off: <K extends keyof FlexBaseElement2DEvents & string>(event: K, listener: (...args: FlexBaseElement2DEvents[K]) => void) => this
  emit: <K extends keyof FlexBaseElement2DEvents & string>(event: K, ...args: FlexBaseElement2DEvents[K]) => this
}

export interface FlexElement2DProperties extends BaseElement2DProperties {
  style: Partial<FlexElement2DStyleProperties>
}

@customNode('FlexElement2D')
export class FlexElement2D extends BaseElement2D implements Rectangulable {
  protected declare _style: FlexElement2DStyle
  override get style(): FlexElement2DStyle { return this._style }
  set style(style) {
    const cb = (...args: any[]): void => {
      this.emit('updateStyleProperty', args[0], args[1], args[2])
      this._updateStyleProperty(args[0], args[1], args[2])
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

  protected _updateStyleProperty(key: string, value: any, oldValue: any): void {
    super._updateStyleProperty(key, value, oldValue)

    this._layout.updateStyleProperty(key, value, oldValue)

    if (this._layout._node.isDirty()) {
      this.requestRelayout()
    }
  }

  override updateTransform(): void {
    this.calculateLayout(undefined, undefined, directionMap.ltr)
    const { left, top, width, height } = this._layout.getComputedLayout()
    this.position.x = left
    this.position.y = top
    this.size.x = width
    this.size.y = height
    super.updateTransform()
  }

  calculateLayout(width?: number | 'auto', height?: number | 'auto', direction?: typeof directionMap[keyof typeof directionMap]): void {
    const parent = this.getParent<FlexElement2D>()
    if (parent?._layout?.calculateLayout) {
      parent?._layout.calculateLayout(width, height, direction)
    }
    else {
      this._layout.calculateLayout(width, height, direction)
    }
  }
}
