import type { InputEvent, InputEventKey, PointerInputEvent } from '../core'
import type { CanvasItemStyle } from '../scene'
import { CanvasItem, Node2D, Ruler, Scalable2D } from '../scene'

export class Editor2D extends CanvasItem {
  ruler = new Ruler({
    name: 'ruler',
    offsetX: 100,
    offsetY: 100,
  })

  hover = new Node2D({
    name: 'hover',
    internalMode: 'back',
    visibility: 'hidden',
    style: {
      outlineStyle: 'solid',
      outlineColor: 0x00FF00FF,
      outlineWidth: 2,
      pointerEvents: 'none',
    },
  })

  selectionRect = new Node2D({
    name: 'selectionRect',
    internalMode: 'back',
    visibility: 'hidden',
    style: {
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
    },
  })

  protected _pointerStart?: CanvasItemStyle
  protected _pointerOffset?: { x: number, y: number }
  selected?: CanvasItem

  constructor() {
    super()
    this._onPointerdown = this._onPointerdown.bind(this)
    this._onPointermove = this._onPointermove.bind(this)
    this._onPointerup = this._onPointerup.bind(this)
    this
      .append(
        this.ruler.addChild(
          this.drawboard
            .addChild(new Scalable2D(), 'back'),
        )
          .append(
            this.hover,
            this.selectionRect,
          ),
      )
  }

  protected override _input(key: InputEventKey, event: InputEvent): void {
    super._input(key, event)

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
      this.selectionRect.visibility = 'visible'
      this.selectionRect.style.left = e.screen.x
      this.selectionRect.style.top = e.screen.y
      this.selectionRect.style.width = 0
      this.selectionRect.style.height = 0
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
      this.selectionRect.style.width = offset.x
      this.selectionRect.style.height = offset.y
    }
    this._onHover()
  }

  protected _onPointerup(): void {
    this.selected = undefined
    this.selectionRect.visibility = 'hidden'
    this._onHover()
  }

  protected _onHover(): void {
    const selected = this.selected
    if (selected instanceof Node2D) {
      this.hover.visibility = 'visible'
      this.hover.style.width = selected.style.width
      this.hover.style.height = selected.style.height
      this.hover._transform.set(selected._transform)
      // TODO
      ;(this.hover as any)._updateOverflow()
      this.hover.requestRedraw()
    }
    else {
      this.hover.visibility = 'hidden'
    }
  }
}
