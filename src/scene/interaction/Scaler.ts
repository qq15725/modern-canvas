import type {
  EventListenerOptions,
  EventListenerValue,
  InputEvent,
  InputEventKey, PropertyDeclaration, WheelInputEvent,
} from '../../core'
import type { CanvasItem, NodeEventMap, NodeProperties } from '../main'
import { clamp, customNode, property } from '../../core'
import { Node } from '../main'

export interface ScalerEventMap extends NodeEventMap {
  updateScale: (scale: number) => void
}

export interface Scaler {
  on: (<K extends keyof ScalerEventMap>(type: K, listener: ScalerEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  off: (<K extends keyof ScalerEventMap>(type: K, listener: ScalerEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  emit: (<K extends keyof ScalerEventMap>(type: K, ...args: Parameters<ScalerEventMap[K]>) => boolean)
    & ((type: string, ...args: any[]) => boolean)
}

export interface ScalerProperties extends NodeProperties {
  //
}

@customNode<ScalerProperties>('Scaler', {
  processMode: 'disabled',
  renderMode: 'disabled',
})
export class Scaler extends Node {
  @property({ default: 1 }) declare scale: number
  @property({ default: 0.05 }) declare min: number
  @property({ default: 10 }) declare max: number

  get target(): CanvasItem | undefined {
    if ((this.parent as CanvasItem)?.style) {
      return this.parent as CanvasItem
    }
    return undefined
  }

  constructor(properties?: Partial<ScalerProperties>, children: Node[] = []) {
    super()
    this.setProperties(properties)
    this.append(children)
  }

  protected override _updateProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'scale':
      case 'min':
      case 'max': {
        const target = this.target
        if (target) {
          const scale = clamp(this.min, this.scale, this.max)
          target.style.scaleX = scale
          target.style.scaleY = scale
          this.emit('updateScale', scale)
        }
        break
      }
    }
  }

  protected _onWheel(e: WheelInputEvent): void {
    const target = this.target

    if (!target)
      return

    e.preventDefault()

    const isTouchPad = (e as any).wheelDeltaY
      ? Math.abs(Math.abs((e as any).wheelDeltaY) - Math.abs(3 * e.deltaY)) < 3
      : e.deltaMode === 0

    if (!isTouchPad && e.ctrlKey) {
      e.preventDefault()
      let distance = e.deltaY / (e.ctrlKey ? 1 : 100)
      distance *= -0.015
      this.scale += distance
    }
  }

  protected override _input(event: InputEvent, key: InputEventKey): void {
    super._input(event, key)

    switch (key) {
      case 'wheel':
        this._onWheel(event as WheelInputEvent)
        break
    }
  }
}
