import type { EventListenerOptions, EventListenerValue, PropertyDeclaration } from 'modern-idoc'
import type { Node } from '../main'
import type { BaseElement2DEventMap, BaseElement2DProperties, Element2DStyleProperties } from './element'
import { customNode } from '../../core'
import { BaseElement2D, Element2DStyle } from './element'

export interface Element2DEventMap extends BaseElement2DEventMap {
  //
}

export interface Element2D {
  on: (<K extends keyof Element2DEventMap>(type: K, listener: Element2DEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  once: (<K extends keyof Element2DEventMap>(type: K, listener: Element2DEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  off: (<K extends keyof Element2DEventMap>(type: K, listener?: Element2DEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  emit: (<K extends keyof Element2DEventMap>(type: K, ...args: Parameters<Element2DEventMap[K]>) => boolean)
    & ((type: string, ...args: any[]) => boolean)
}

export interface Element2DProperties extends BaseElement2DProperties {
  style: Partial<Element2DStyleProperties>
}

@customNode('Element2D')
export class Element2D extends BaseElement2D {
  protected declare _style: Element2DStyle
  get style(): Element2DStyle { return this._style }
  set style(style) {
    const cb = (...args: any[]): void => {
      this.emit('updateStyleProperty', ...args)
      this._updateStyleProperty(args[0], args[1], args[2], args[3])
    }
    style.on('updateProperty', cb)
    this._style?.off('updateProperty', cb)
    this._style = style
  }

  constructor(properties?: Partial<Element2DProperties>, nodes: Node[] = []) {
    super()

    this.style = new Element2DStyle()

    this
      .setProperties(properties)
      .append(nodes)
  }

  protected _updateStyleProperty(key: string, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateStyleProperty(key, value, oldValue, declaration)

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

    switch (key) {
      case 'width':
      case 'height':
        if (this.mask instanceof BaseElement2D) {
          this.mask.size.width = this.size.width
          this.mask.size.height = this.size.height
        }
        break
    }
  }
}
