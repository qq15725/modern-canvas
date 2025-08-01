import type { EventListenerValue } from 'modern-idoc'
import type { InputEvent, InputEventKey, KeyboardInputEvent, PointerInputEvent, WheelInputEvent } from '../../core'
import type { Node } from '../main'
import type { Node2DEventMap, Node2DProperties } from './Node2D'
import { property } from 'modern-idoc'
import { clamp, customNode, Vector2 } from '../../core'
import { Node2D } from './Node2D'

export interface Camera2DProperties extends Node2DProperties {
  //
}

export interface Camera2DEventMap extends Node2DEventMap {
  updateCanvasTransform: () => void
}

export interface Camera2D {
  on: (<K extends keyof Camera2DEventMap>(type: K, listener: Camera2DEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  once: (<K extends keyof Camera2DEventMap>(type: K, listener: Camera2DEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  off: (<K extends keyof Camera2DEventMap>(type: K, listener?: Camera2DEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  emit: (<K extends keyof Camera2DEventMap>(type: K, ...args: Parameters<Camera2DEventMap[K]>) => boolean)
    & ((type: string, ...args: any[]) => boolean)
}

@customNode<Camera2D>('Camera2D', {
  processMode: 'disabled',
  renderMode: 'disabled',
})
export class Camera2D extends Node2D {
  readonly zoom = new Vector2(1, 1).on('update', () => this.updateCanvasTransform())
  readonly maxZoom = new Vector2(6, 6)
  readonly minZoom = new Vector2(0.1, 0.1)

  @property({ protected: true, fallback: false }) declare spaceKey: boolean
  @property({ protected: true, fallback: false }) declare grabbing: boolean
  protected _screenOffset = { x: 0, y: 0 }

  constructor(properties?: Partial<Camera2DProperties>, nodes: Node[] = []) {
    super()

    this
      .setProperties(properties)
      .append(nodes)
  }

  addZoom(x: number, y = x): this {
    this.zoom.set(
      clamp(this.zoom.x + x, this.minZoom.x, this.maxZoom.x),
      clamp(this.zoom.y + y, this.minZoom.y, this.maxZoom.y),
    )
    return this
  }

  setZoom(x: number, y = x): this {
    this.zoom.set(
      clamp(x, this.minZoom.x, this.maxZoom.x),
      clamp(y, this.minZoom.y, this.maxZoom.y),
    )
    return this
  }

  protected override _input(event: InputEvent, key: InputEventKey): void {
    super._input(event, key)

    if (key === 'keydown') {
      const e = event as KeyboardInputEvent
      if (!this.spaceKey && e.code === 'Space') {
        e.cursor = 'grab'
        this.spaceKey = true
      }
    }
    else if (key === 'keyup') {
      const e = event as KeyboardInputEvent
      if (e.code === 'Space') {
        e.cursor = 'default'
        this.spaceKey = false
        this.grabbing = false
      }
    }
    else if (key === 'pointerdown') {
      const e = event as PointerInputEvent
      if (!this.grabbing && (this.spaceKey || e.button === 1)) {
        this.grabbing = true
        e.cursor = 'grabbing'
        this._screenOffset = { x: e.screenX, y: e.screenY }
      }
    }
    else if (key === 'pointermove') {
      const e = event as PointerInputEvent
      if (this.grabbing) {
        this.position.add(
          -(this._screenOffset.x - e.screenX),
          -(this._screenOffset.y - e.screenY),
        )
        this._screenOffset = { x: e.screenX, y: e.screenY }
      }
    }
    else if (key === 'pointerup') {
      const e = event as PointerInputEvent
      if (this.grabbing) {
        this.grabbing = false
        if (this.spaceKey) {
          e.cursor = 'grab'
        }
        else {
          e.cursor = 'default'
        }
      }
    }
    else if (key === 'wheel') {
      this._onWheel(event as WheelInputEvent)
    }
  }

  protected _onWheel(e: WheelInputEvent): void {
    if (e.ctrlKey) {
      const isTouchPad = (e as any).wheelDeltaY
        ? Math.abs(Math.abs((e as any).wheelDeltaY) - Math.abs(3 * e.deltaY)) < 3
        : e.deltaMode === 0

      if (!isTouchPad) {
        e.preventDefault()
        const oldZoom = this.zoom.x
        this.addZoom(e.deltaY * -0.015)
        const ratio = 1 - this.zoom.x / oldZoom
        this.position.add(
          (e.screenX - this.position.x) * ratio,
          (e.screenY - this.position.y) * ratio,
        )
      }
    }
    else {
      e.preventDefault()
      this.position.add(-e.deltaX, -e.deltaY)
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

    this.emit('updateCanvasTransform')
  }
}
