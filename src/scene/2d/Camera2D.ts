import type {
  InputEvent,
  InputEventKey,
  KeyboardInputEvent,
  PointerInputEvent,
  Vector2Like,
  WheelInputEvent } from '../../core'
import type { Node, SceneTree } from '../main'
import type { Node2DEvents, Node2DProperties } from './Node2D'
import { property } from 'modern-idoc'
import { clamp, customNode, IN_MAC_OS, Transform2D, Vector2 } from '../../core'
import { Node2D } from './Node2D'

export interface Camera2DProperties extends Node2DProperties {
  position?: Vector2Like
  zoom?: Vector2Like
  minZoom?: Vector2Like
  maxZoom?: Vector2Like
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
  @property({ internal: true, fallback: false }) declare spaceKey: boolean
  @property({ internal: true, fallback: false }) declare grabbing: boolean
  readonly canvasTransform = new Transform2D()
  protected _screenOffset = { x: 0, y: 0 }

  protected _zoom = new Vector2(1, 1, () => this._updateTransform())
  get zoom(): Vector2 { return this._zoom }
  set zoom(val: Vector2Like) { this._zoom.set(val.x, val.y) }

  protected _minZoom = new Vector2(0.02, 0.02)
  get minZoom(): Vector2 { return this._minZoom }
  set minZoom(val: Vector2Like) { this._minZoom.set(val.x, val.y) }

  protected _maxZoom = new Vector2(256, 256)
  get maxZoom(): Vector2 { return this._maxZoom }
  set maxZoom(val: Vector2Like) { this._maxZoom.set(val.x, val.y) }

  constructor(properties?: Partial<Camera2DProperties>, nodes: Node[] = []) {
    super()

    this
      .setProperties(properties)
      .append(nodes)
  }

  override setProperties(properties?: Record<string, any>): this {
    if (properties) {
      const {
        position,
        zoom,
        minZoom,
        maxZoom,
        ...restProperties
      } = properties

      if (position)
        this.position.set(position.x, position.y)

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

  setZoomAtOrigin(x: number, y: number, origin: Vector2Like | 'screenCenter'): void {
    let oldOrigin
    if (origin === 'screenCenter') {
      const root = this._tree?.root
      if (root) {
        oldOrigin = { x: root.width / 2, y: root.height / 2 }
      }
      else {
        oldOrigin = { x: 0, y: 0 }
      }
    }
    else {
      oldOrigin = origin
    }
    const globalOrigin = this.toGlobal(oldOrigin)
    this.setZoom(x, y)
    const newOrigin = this.toScreen(globalOrigin)
    this.position.add({
      x: newOrigin.x - oldOrigin.x,
      y: newOrigin.y - oldOrigin.y,
    })
  }

  protected _zoomStep(val: number): number {
    if (val < 0.15) {
      return 0.05
    }
    else if (val < 0.5) {
      return 0.1
    }
    else if (val < 3) {
      return 0.25
    }
    else {
      return 1
    }
  }

  zoomIn(): void {
    const step = this._zoomStep(this._zoom.x)
    let val = this._zoom.x + step
    val = Math.floor(val / step) * step
    this.setZoomAtOrigin(val, val, 'screenCenter')
  }

  zoomOut(): void {
    const step = this._zoomStep(this._zoom.x)
    let val = this._zoom.x - step
    val = Math.ceil(val / step) * step
    this.setZoomAtOrigin(val, val, 'screenCenter')
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
        this.position.add({
          x: Math.round(this._screenOffset.x - e.screenX),
          y: Math.round(this._screenOffset.y - e.screenY),
        })
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
    e.preventDefault()
    if (e.ctrlKey || e.metaKey) {
      const val = this._getZoomByWheel(e, this._zoom.x)
      this.setZoomAtOrigin(val, val, { x: e.screenX, y: e.screenY })
    }
    else {
      this.position.add({
        x: Math.round(e.deltaX),
        y: Math.round(e.deltaY),
      })
    }
  }

  protected _getZoomByWheel(e: WheelInputEvent, val: number): number {
    const factor = e.ctrlKey && IN_MAC_OS ? 10 : 1
    const delta = -e.deltaY * (e.deltaMode === 1 ? 0.05 : e.deltaMode ? 1 : 0.002) * factor
    const logCur = Math.log(val)
    const logNew = logCur + delta
    const zoom = Math.exp(logNew)
    return Math.round(zoom * 10_000) / 10_000
  }

  override _updateTransform(): void {
    super._updateTransform()
    this._updateCanvasTransform()
  }

  protected _updateCanvasTransform(): void {
    this.canvasTransform
      .identity()
      .scale(this._zoom.x, this._zoom.y)
      .prepend(this.transform.affineInverse())

    this.syncCanvasTransform()

    this.emit('updateCanvasTransform')
  }

  syncCanvasTransform(): void {
    this.getViewport()?.canvasTransform.copyFrom(this.canvasTransform)
  }

  protected override _treeEnter(tree: SceneTree): void {
    super._treeEnter(tree)
    this.updateGlobalTransform()
  }

  toGlobal<P extends Vector2Like = Vector2>(screenPos: Vector2Like, newPos?: P): P {
    return this.canvasTransform.applyAffineInverse(screenPos, newPos)
  }

  toScreen<P extends Vector2Like = Vector2>(globalPos: Vector2Like, newPos?: P): P {
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
