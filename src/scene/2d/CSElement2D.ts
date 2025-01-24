import type {
  EventListenerOptions,
  EventListenerValue, PropertyDeclaration,
} from '../../core'
import type { Node } from '../main'
import type { CSElement2DStyleProperties } from './CSElement2DStyle'
import type { Element2DEventMap, Element2DProperties } from './Element2D'
import { customNode } from '../../core'
import { CSElement2DStyle } from './CSElement2DStyle'
import { Element2D } from './Element2D'

export interface CSElement2DEventMap extends Element2DEventMap {
  //
}

export interface CSElement2D {
  on: (<K extends keyof CSElement2DEventMap>(type: K, listener: CSElement2DEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  once: (<K extends keyof CSElement2DEventMap>(type: K, listener: CSElement2DEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  off: (<K extends keyof CSElement2DEventMap>(type: K, listener?: CSElement2DEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  emit: (<K extends keyof CSElement2DEventMap>(type: K, ...args: Parameters<CSElement2DEventMap[K]>) => boolean)
    & ((type: string, ...args: any[]) => boolean)
}

export interface CSElement2DProperties extends Element2DProperties {
  style: Partial<CSElement2DStyleProperties>
}

/**
 * Coordinate System Element 2D
 */
@customNode('CSElement2D')
export class CSElement2D extends Element2D {
  protected declare _style: CSElement2DStyle
  get style(): CSElement2DStyle { return this._style }
  set style(style) {
    const cb = (...args: any[]): void => {
      this.emit('updateStyleProperty', ...args)
      this._updateStyleProperty(args[0], args[1], args[2], args[3])
    }
    style.on('updateProperty', cb)
    this._style?.off('updateProperty', cb)
    this._style = style
  }

  constructor(properties?: Partial<CSElement2DProperties>, nodes: Node[] = []) {
    super()

    this.style = new CSElement2DStyle()

    this
      .setProperties(properties)
      .append(nodes)
  }

  protected _updateStyleProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateStyleProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'left':
        this.position.x = this.style.left
        this.requestRelayout()
        break
      case 'top':
        this.position.y = this.style.top
        this.requestRelayout()
        break
      case 'width':
        this.size.width = this.style.width
        this.requestRelayout()
        break
      case 'height':
        this.size.height = this.style.height
        this.requestRelayout()
        break
    }
  }
}
