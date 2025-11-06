import type {
  InputEvent,
  InputEventKey,
  KeyboardInputEvent,
  PointerInputEvent,
  Vector2Data,
  WheelInputEvent,
} from '../../core'
import type { Node } from '../main'
import type { Node2DEvents, Node2DProperties } from './Node2D'
import { property } from 'modern-idoc'
import { clamp, customNode, Transform2D, Vector2 } from '../../core'
import { Node2D } from './Node2D'

export interface Camera2DProperties extends Node2DProperties {
  zoom?: Vector2Data
  minZoom?: Vector2Data
  maxZoom?: Vector2Data
  wheelSensitivity?: number
}

export interface Camera2DEvents extends Node2DEvents {
  updateCanvasTransform: []
}

export interface Camera2D {
  on: <K extends keyof Camera2DEvents & string>(event: K, listener: (...args: Camera2DEvents[K]) => void) => this
  once: <K extends keyof Camera2DEvents & string>(event: K, listener: (...args: Camera2DEvents[K]) => void) => this
  off: <K extends keyof Camera2DEvents & string>(event: K, listener: (...args: Camera2DEvents[K]) => void) => this
  emit: <K extends keyof Camera2DEvents & string>(event: K, ...args: Camera2DEvents[K]) => this
}

@customNode<Camera2D>('Camera2D', {
  processMode: 'disabled',
  renderMode: 'disabled',
})
export class Camera2D extends Node2D {
  @property({ fallback: 0.02 }) declare wheelSensitivity: number
  @property({ internal: true, fallback: false }) declare spaceKey: boolean
  @property({ internal: true, fallback: false }) declare grabbing: boolean
  readonly canvasTransform = new Transform2D()
  protected _screenOffset = { x: 0, y: 0 }

  protected _zoom = new Vector2(1, 1).on('update', () => this.updateTransform())
  get zoom(): Vector2 { return this._zoom }
  set zoom(val: Vector2Data) { this._zoom.set(val.x, val.y) }

  protected _minZoom = new Vector2(0.02, 0.02)
  get minZoom(): Vector2 { return this._minZoom }
  set minZoom(val: Vector2Data) { this._minZoom.set(val.x, val.y) }

  protected _maxZoom = new Vector2(256, 256)
  get maxZoom(): Vector2 { return this._maxZoom }
  set maxZoom(val: Vector2Data) { this._maxZoom.set(val.x, val.y) }

  constructor(properties?: Partial<Camera2DProperties>, nodes: Node[] = []) {
    super()

    this
      .setProperties(properties)
      .append(nodes)
  }

  override setProperties(properties?: Record<string, any>): this {
    if (properties) {
      const {
        zoom,
        minZoom,
        maxZoom,
        ...restProperties
      } = properties

      if (zoom)
        this.zoom = zoom
      if (minZoom)
        this.minZoom = minZoom
      if (maxZoom)
        this.maxZoom = maxZoom

      super.setProperties(restProperties)
    }
    return this
  }

  addZoom(x: number, y = x): this {
    return this.setZoom(
      this._zoom.x + x,
      this._zoom.y + y,
    )
  }

  setZoom(x: number, y = x): this {
    this._zoom.set(
      clamp(x, this._minZoom.x, this._maxZoom.x),
      clamp(y, this._minZoom.y, this._maxZoom.y),
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
          this._screenOffset.x - e.screenX,
          this._screenOffset.y - e.screenY,
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
        const oldScreen = { x: e.screenX, y: e.screenY }
        const oldGlobal = this.toGlobal(oldScreen)
        this.zoomWithWheel(e.deltaY)
        const newScreen = this.toScreen(oldGlobal)
        this.position.add(
          newScreen.x - oldScreen.x,
          newScreen.y - oldScreen.y,
        )
      }
    }
    else {
      e.preventDefault()
      this.position.add(e.deltaX, e.deltaY)
    }
  }

  zoomWithWheel(wheelDeltaY: number): void {
    const logCur = Math.log(this._zoom.x)
    const logDelta = -wheelDeltaY * this.wheelSensitivity
    const logNew = logCur + logDelta
    this.setZoom(Math.exp(logNew))
  }

  override updateTransform(): void {
    super.updateTransform()
    this.updateCanvasTransform()
  }

  updateCanvasTransform(): void {
    this.canvasTransform
      .identity()
      .scale(this._zoom.x, this._zoom.y)
      .premultiply(this.transform.affineInverse())

    this.getViewport()?.canvasTransform.copy(this.canvasTransform)

    this.emit('updateCanvasTransform')
  }

  toGlobal<P extends Vector2Data = Vector2>(screenPos: Vector2Data, newPos?: P): P {
    return this.canvasTransform.applyAffineInverse(screenPos, newPos)
  }

  toScreen<P extends Vector2Data = Vector2>(globalPos: Vector2Data, newPos?: P): P {
    return this.canvasTransform.apply(globalPos, newPos)
  }

  override toJSON(): Record<string, any> {
    return {
      zoom: this._zoom.toJSON(),
      minZoom: this._minZoom.toJSON(),
      maxZoom: this._maxZoom.toJSON(),
      ...super.toJSON(),
    }
  }
}
