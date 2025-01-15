import type { InputEvent, InputEventKey, WheelInputEvent } from '../../core'
import type { NodeProperties } from '../main'
import type { Node2D } from './Node2D'
import { customNode } from '../../core'
import { Node } from '../main'

export interface Scalable2DProperties extends NodeProperties {
  //
}

@customNode('Scalable2D')
export class Scalable2D extends Node {
  get target(): Node2D | undefined {
    if (this.parent?.tag === 'Node2D') {
      return this.parent as Node2D
    }
    return undefined
  }

  constructor(properties?: Partial<Scalable2DProperties>, children: Node[] = []) {
    super()
    this.setProperties(properties)
    this.append(children)
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
      target.style.scaleX = Math.max(0.05, target.style.scaleX + distance)
      target.style.scaleY = target.style.scaleX
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
