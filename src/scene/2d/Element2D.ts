import type { Node } from '../main'
import type { BaseElement2DEvents, BaseElement2DProperties, Element2DStyleProperties } from './element'
import { property } from 'modern-idoc'
import { customNode } from '../../core'
import { BaseElement2D } from './element'
import { directionMap, FlexLayout } from './FlexLayout'

export type LayoutMode = 'inherit' | 'absolute' | 'flex'

export interface Element2DEvents extends BaseElement2DEvents {
  //
}

export interface Element2D {
  on: <K extends keyof Element2DEvents & string>(event: K, listener: (...args: Element2DEvents[K]) => void) => this
  once: <K extends keyof Element2DEvents & string>(event: K, listener: (...args: Element2DEvents[K]) => void) => this
  off: <K extends keyof Element2DEvents & string>(event: K, listener: (...args: Element2DEvents[K]) => void) => this
  emit: <K extends keyof Element2DEvents & string>(event: K, ...args: Element2DEvents[K]) => this
}

export interface Element2DProperties extends BaseElement2DProperties {
  style: Partial<Element2DStyleProperties>
  layoutMode: LayoutMode
}

@customNode('Element2D')
export class Element2D extends BaseElement2D {
  @property({ fallback: 'inherit' }) declare layoutMode: LayoutMode
  _flex = new FlexLayout(this)

  constructor(properties?: Partial<Element2DProperties>, nodes: Node[] = []) {
    super()

    this
      .setProperties(properties)
      .append(nodes)
  }

  getGlobalLayoutMode(): Omit<LayoutMode, 'inherit'> {
    const layoutMode = this.layoutMode
    switch (layoutMode) {
      case 'inherit':
        return this.parent instanceof Element2D
          ? this.parent.getGlobalLayoutMode()
          : 'absolute'
      default:
        return layoutMode
    }
  }

  protected _updateStyleProperty(key: string, value: any, oldValue: any): void {
    super._updateStyleProperty(key, value, oldValue)

    switch (key) {
      case 'left':
        this.position.x = Number(value)
        break
      case 'top':
        this.position.y = Number(value)
        break
      case 'width':
        this.size.width = Number(value)
        break
      case 'height':
        this.size.height = Number(value)
        break
    }

    this._flex.updateStyleProperty(key, value, oldValue)

    if (this._flex._node?.isDirty()) {
      this.requestLayout()
    }
  }

  protected override _parented(parent: Node): void {
    super._parented(parent)

    if (
      parent instanceof Element2D
      && parent._flex._node
      && this._flex._node
    ) {
      parent._flex._node.insertChild(
        this._flex._node,
        parent._flex._node.getChildCount(),
      )
    }
  }

  protected override _unparented(oldParent: Node): void {
    super._unparented(oldParent)

    if (
      oldParent instanceof Element2D
      && oldParent._flex?._node
      && this._flex._node
    ) {
      oldParent._flex._node.removeChild(this._flex._node)
    }
  }

  updateLayout(): void {
    this.calculateLayout(undefined, undefined, directionMap.ltr)
    if (this._flex._node) {
      const { left, top, width, height } = this._flex._node.getComputedLayout()
      this.position.x = left
      this.position.y = top
      this.size.x = width
      this.size.y = height
    }
  }

  calculateLayout(width?: number | 'auto', height?: number | 'auto', direction?: typeof directionMap[keyof typeof directionMap]): void {
    const parent = this.getParent<Element2D>()
    if (parent?._flex?.calculateLayout) {
      parent?._flex.calculateLayout(width, height, direction)
    }
    else {
      this._flex.calculateLayout(width, height, direction)
    }
  }
}
