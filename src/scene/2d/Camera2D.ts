import type { InputEvent, InputEventKey, WheelInputEvent } from '../../core'
import type { Node } from '../main'
import type { Node2DProperties } from './Node2D'
import { property } from 'modern-idoc'
import { customNode, Vector2 } from '../../core'
import { Node2D } from './Node2D'

export interface Camera2DProperties extends Node2DProperties {
  //
}

@customNode('Camera2D')
export class Camera2D extends Node2D {
  readonly zoom = new Vector2(1, 1).on('update', () => this.updateCanvasTransform())

  @property({ fallback: 6 }) declare maxZoom: number
  @property({ fallback: 0.1 }) declare minZoom: number

  constructor(properties?: Partial<Camera2DProperties>, nodes: Node[] = []) {
    super()

    this
      .setProperties(properties)
      .append(nodes)
  }

  protected override _input(event: InputEvent, key: InputEventKey): void {
    super._input(event, key)

    if (key === 'wheel') {
      const e = event as unknown as WheelInputEvent

      if (e.ctrlKey) {
        const isTouchPad = (e as any).wheelDeltaY
          ? Math.abs(Math.abs((e as any).wheelDeltaY) - Math.abs(3 * e.deltaY)) < 3
          : e.deltaMode === 0

        if (!isTouchPad) {
          e.preventDefault()
          const value = this.zoom.x + e.deltaY * -0.015
          const zoom = Math.min(this.maxZoom, Math.max(this.minZoom, value))
          const ratio = 1 - zoom / this.zoom.x
          this.zoom.set([
            zoom,
            zoom,
          ])
          this.position.add([
            (e.screenX - this.position.x) * ratio,
            (e.screenY - this.position.y) * ratio,
          ])
        }
      }
      else {
        e.preventDefault()
        this.position.add([
          -e.deltaX,
          -e.deltaY,
        ])
      }
    }
  }

  override updateTransform(): void {
    super.updateTransform()
    this.updateCanvasTransform()
  }

  updateCanvasTransform(): void {
    const viewport = this.getViewport()

    if (!viewport)
      return

    viewport.canvasTransform
      .identity()
      .scale(this.zoom.x, this.zoom.y)
      .translate(this.position.x, this.position.y)
  }
}
