import type { InputEvent, InputEventKey, PointerInputEvent } from '../core'
import type { CanvasItem, CanvasItemStyle } from '../scene'
import { Control, Node2D, Ruler, Scaler, ScrollBar } from '../scene'

export class CanvasEditor extends Control {
  name = 'CanvasEditor'

  hover = new Node2D({
    name: 'hover',
    internalMode: 'back',
    style: {
      visibility: 'hidden',
      outlineStyle: 'solid',
      outlineColor: 0x00FF00FF,
      outlineWidth: 2,
      pointerEvents: 'none',
    },
  })

  selectionRect = new Node2D({
    name: 'selectionRect',
    internalMode: 'back',
    style: {
      visibility: 'hidden',
      width: 1,
      height: 1,
      backgroundColor: 0x00FF000F,
      outlineStyle: 'solid',
      outlineColor: 0x00FF00FF,
      outlineWidth: 2,
      pointerEvents: 'none',
    },
  })

  selector = new Node2D({
    name: 'selector',
  })

  scaler = new Scaler({
    internalMode: 'back',
  }).on('updateScale', (scale) => {
    this.ruler.scale = scale
  })

  xScrollBar = new ScrollBar({
    internalMode: 'back',
    direction: 'horizontal',
  })

  yScrollBar = new ScrollBar({
    internalMode: 'back',
    direction: 'vertical',
  })

  drawboard = new Node2D({
    name: 'drawboard',
    style: {
      left: 100,
      top: 100,
      width: 500,
      height: 500,
      backgroundColor: 0xFFFFFFFF,
      overflow: 'hidden',
      borderStyle: 'solid',
      borderWidth: 2,
      pointerEvents: 'none',
      transformOrigin: 'left top',
    },
  }).append(
    this.scaler,
  )

  ruler = new Ruler({
    name: 'ruler',
    offsetX: 100,
    offsetY: 100,
  }).append(
    this.drawboard,
    this.hover,
    this.selectionRect,
    this.xScrollBar,
    this.yScrollBar,
  )

  protected _pointerStart?: CanvasItemStyle
  protected _pointerOffset?: { x: number, y: number }
  selected?: CanvasItem

  constructor() {
    super()
    this._onPointerdown = this._onPointerdown.bind(this)
    this._onPointermove = this._onPointermove.bind(this)
    this._onPointerup = this._onPointerup.bind(this)
    this.append(this.ruler)
  }

  protected override _guiInput(event: InputEvent, key: InputEventKey): void {
    super._guiInput(event, key)

    switch (key) {
      case 'pointerdown':
        this._onPointerdown(event as any)
        break
      case 'pointermove':
        this._onPointermove(event as any)
        break
      case 'pointerup':
        this._onPointerup()
        break
    }
  }

  protected _onPointerdown(e: PointerInputEvent): void {
    const target = e.target
    this._pointerOffset = { x: e.offsetX, y: e.offsetY }
    if (target instanceof Node2D) {
      this.selected = target
      this._pointerStart = target.style.clone()
    }
    else {
      this.selected = undefined
      this._pointerStart = undefined
      this.selectionRect.style.visibility = 'visible'
      this.selectionRect.style.left = e.screen.x
      this.selectionRect.style.top = e.screen.y
      this.selectionRect.style.width = 1
      this.selectionRect.style.height = 1
    }
    this._onHover()
  }

  protected _onPointermove(e: PointerInputEvent): void {
    const { selected, _pointerStart, _pointerOffset } = this
    const offset = _pointerOffset
      ? { x: (e.offsetX - _pointerOffset.x), y: (e.offsetY - _pointerOffset.y) }
      : { x: 0, y: 0 }
    if (selected && _pointerStart) {
      selected.style.left = _pointerStart.left + offset.x
      selected.style.top = _pointerStart.top + offset.y
    }
    else {
      if (this.selectionRect.isVisibleInTree()) {
        this.selectionRect.style.width = offset.x
        this.selectionRect.style.height = offset.y
      }
    }
    this._onHover()
  }

  protected _onPointerup(): void {
    this.selected = undefined
    this.selectionRect.style.visibility = 'hidden'
    this._onHover()
  }

  protected _onHover(): void {
    const selected = this.selected
    if (selected instanceof Node2D) {
      this.hover.style.visibility = 'visible'
      this.hover.style.width = selected.style.width
      this.hover.style.height = selected.style.height
      this.hover.transform.set(selected.transform)
      this.hover.requestRedraw()
    }
    else {
      this.hover.style.visibility = 'hidden'
    }
  }
}
