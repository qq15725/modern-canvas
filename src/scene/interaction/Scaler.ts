import type { Element2D } from '../2d'
import type {
  InputEvent,
  InputEventKey,
  WheelInputEvent,
} from '../../core'
import type { NodeEvents, NodeProperties } from '../main'
import { property } from 'modern-idoc'
import { clamp, customNode } from '../../core'
import { Node } from '../main'

export interface ScalerEvents extends NodeEvents {
  updateScale: (scale: number) => void
}

export interface Scaler {
  on: <K extends keyof ScalerEvents & string>(event: K, listener: ScalerEvents[K]) => this
  once: <K extends keyof ScalerEvents & string>(event: K, listener: ScalerEvents[K]) => this
  off: <K extends keyof ScalerEvents & string>(event: K, listener: ScalerEvents[K]) => this
  emit: <K extends keyof ScalerEvents & string>(event: K, ...args: Parameters<ScalerEvents[K]>) => this
}

export interface ScalerProperties extends NodeProperties {
  scale: number
  minScale: number
  maxScale: number
}

@customNode<ScalerProperties>('Scaler', {
  processMode: 'disabled',
  renderMode: 'disabled',
})
export class Scaler extends Node {
  @property({ default: 1 }) declare translateX: number
  @property({ default: 1 }) declare translateY: number
  @property({ default: 1 }) declare scale: number
  @property({ default: 0.05 }) declare minScale: number
  @property({ default: 10 }) declare maxScale: number

  get target(): Element2D | undefined {
    if ((this.parent as Element2D)?.style) {
      return this.parent as Element2D
    }
    return undefined
  }

  constructor(properties?: Partial<ScalerProperties>, children: Node[] = []) {
    super()
    this.setProperties(properties)
    this.append(children)
  }

  protected override _updateProperty(key: string, value: any, oldValue: any): void {
    super._updateProperty(key, value, oldValue)

    switch (key) {
      case 'translateY':
      case 'translateX':
      case 'scale':
      case 'min':
      case 'max': {
        this.scale = clamp(this.scale, this.minScale, this.maxScale)
        this._updateTarget()
        break
      }
    }
  }

  protected _updateTarget(): void {
    const target = this.target
    if (target) {
      target.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`
      this.emit('updateScale', this.scale)
    }
  }

  protected _onWheel(e: WheelInputEvent): void {
    const target = this.target

    if (!target)
      return

    e.preventDefault()

    if (e.ctrlKey) {
      const isTouchPad = (e as any).wheelDeltaY
        ? Math.abs(Math.abs((e as any).wheelDeltaY) - Math.abs(3 * e.deltaY)) < 3
        : e.deltaMode === 0
      if (!isTouchPad) {
        e.preventDefault()
        this.scale += e.deltaY * -0.015
      }
    }
    else {
      this.translateX -= e.deltaX
      this.translateY -= e.deltaY
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
