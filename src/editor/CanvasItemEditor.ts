import type { InputEvent, InputEventKey, PointerInputEvent, PropertyDeclaration } from '../core'
import type { CSElement2DStyle } from '../scene'
import { Control, CSElement2D, Ruler, Scaler, TransformRect2D, XScrollBar, YScrollBar } from '../scene'

export class CanvasItemEditor extends Control {
  protected _pointerStart?: CSElement2DStyle
  protected _pointerOffset?: { x: number, y: number }
  selected?: CSElement2D
  dragging?: CSElement2D
  hovered?: CSElement2D
  hover = new CSElement2D({
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

  transformRect = new TransformRect2D({
    name: 'transformRect',
    internalMode: 'back',
    style: {
      visibility: 'hidden',
      pointerEvents: 'none',
    },
  })

  scaler = new Scaler({
    internalMode: 'back',
  }).on('updateScale', (scale) => {
    this.ruler.gapScale = scale
    this._updateScrollbars()
    this._updateSelectionRect()
  })

  xScrollBar = new XScrollBar({
    internalMode: 'back',
    style: {
      visibility: 'hidden',
    },
  })

  yScrollBar = new YScrollBar({
    internalMode: 'back',
    style: {
      visibility: 'hidden',
    },
  })

  drawboard = new CSElement2D({
    name: 'drawboard',
    style: {
      width: 500,
      height: 500,
      backgroundColor: 0xFFFFFFFF,
      overflow: 'hidden',
      pointerEvents: 'none',
      boxShadow: '2px 2px 2px 1px rgba(0, 0, 0, 0.2)',
    },
  }, [
    this.scaler,
  ])

  ruler = new Ruler({
    name: 'ruler',
    offsetX: 100,
    offsetY: 100,
    style: {
      pointerEvents: 'none',
    },
  }, [
    this.drawboard,
    this.hover,
    this.transformRect,
    this.xScrollBar,
    this.yScrollBar,
  ])

  constructor() {
    super()
    this._onPointerdown = this._onPointerdown.bind(this)
    this._onPointermove = this._onPointermove.bind(this)
    this._onPointerup = this._onPointerup.bind(this)
    this.append(this.ruler)
  }

  protected override _updateStyleProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateStyleProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'width':
        this.drawboard.style.left = (this.size.width - this.drawboard.size.width) / 2
        this.ruler.offsetX = this.drawboard.style.left
        break
      case 'height':
        this.drawboard.style.top = (this.size.height - this.drawboard.size.height) / 2
        this.ruler.offsetY = this.drawboard.style.top
        break
    }
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
    let target = e.target
    if (target.is(this)) {
      target = undefined
    }
    if (target?.is(this.transformRect)) {
      target = this.selected
    }
    this._pointerOffset = { x: e.offsetX, y: e.offsetY }
    this.selected = target
    this.dragging = target
    if (target instanceof CSElement2D) {
      this._pointerStart = target.style.clone()
    }
    else {
      this._pointerStart = undefined
    }
    this._updateHover()
    this._updateSelectionRect()
  }

  protected _onPointermove(e: PointerInputEvent): void {
    let target = e.target
    if (target.is(this)) {
      target = undefined
    }
    if (target?.is(this.transformRect)) {
      target = this.selected
    }
    const { selected, dragging, _pointerStart, _pointerOffset } = this
    if (selected && target?.is(selected)) {
      this.hovered = undefined
    }
    else {
      this.hovered = target
    }
    const offset = _pointerOffset
      ? { x: (e.offsetX - _pointerOffset.x), y: (e.offsetY - _pointerOffset.y) }
      : { x: 0, y: 0 }
    if (dragging && _pointerStart) {
      dragging.style.left = _pointerStart.left + offset.x
      dragging.style.top = _pointerStart.top + offset.y
      dragging.update()
    }
    this._updateHover()
    this._updateSelectionRect()
  }

  protected _onPointerup(): void {
    this.dragging = undefined
    this._updateHover()
    this._updateSelectionRect()
  }

  protected _copyGlobalTransform(a: CSElement2D, b: CSElement2D): void {
    a.style.visibility = 'visible'
    a.style.width = b.size.x
    a.style.height = b.size.y
    a.style.left = b.globalPosition.x
    a.style.top = b.globalPosition.y
    a.style.scaleX = b.globalScale.x
    a.style.scaleY = b.globalScale.y
    a.style.skewX = b.globalSkew.x
    a.style.skewY = b.globalSkew.y
    a.style.rotate = b.globalRotation
  }

  protected _updateHover(): void {
    const hovered = this.hovered
    if (hovered instanceof CSElement2D) {
      this.hover.style.visibility = 'visible'
      this._copyGlobalTransform(this.hover, hovered)
      this.hover.requestRedraw()
    }
    else {
      this.hover.style.visibility = 'hidden'
    }
  }

  protected _updateSelectionRect(): void {
    if (this.selected) {
      this.transformRect.style.visibility = 'visible'
      this._copyGlobalTransform(this.transformRect, this.selected)
    }
    else {
      this.transformRect.style.visibility = 'hidden'
    }
  }

  protected _updateScrollbars(): void {
    const scale = this.ruler.gapScale
    const scrollHeight = this.drawboard.size.height * scale
    const scrollWidth = this.drawboard.size.width * scale
    if (scrollHeight > this.size.height) {
      this.yScrollBar.style.visibility = 'visible'
      this.yScrollBar.maxValue = scrollHeight
      this.yScrollBar.page = this.size.height
    }
    else {
      this.yScrollBar.style.visibility = 'hidden'
    }
    if (scrollWidth > this.size.width) {
      this.xScrollBar.style.visibility = 'visible'
      this.xScrollBar.maxValue = scrollWidth
      this.xScrollBar.page = this.size.width
    }
    else {
      this.xScrollBar.style.visibility = 'hidden'
    }
  }
}
