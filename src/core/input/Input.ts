import type { ObservableEvents } from 'modern-idoc'
import type { Cursor } from './Cursor'
import type { InputEvent } from './InputEvent'
import type { MouseInputEvent } from './MouseInputEvent'
import { Observable } from 'modern-idoc'
import { SUPPORTS_POINTER_EVENTS, SUPPORTS_TOUCH_EVENTS, SUPPORTS_WHEEL_EVENTS } from '../shared'
import { KeyboardInputEvent } from './KeyboardInputEvent'
import { PointerInputEvent } from './PointerInputEvent'
import { WheelInputEvent } from './WheelInputEvent'

const TOUCH_TO_POINTER: Record<string, string> = {
  touchstart: 'pointerdown',
  touchend: 'pointerup',
  touchendoutside: 'pointerupoutside',
  touchmove: 'pointermove',
  touchcancel: 'pointercancel',
}

export interface InputEvents extends ObservableEvents {
  pointerdown: [ev: PointerInputEvent]
  pointerover: [ev: PointerInputEvent]
  pointermove: [ev: PointerInputEvent]
  pointerup: [ev: PointerInputEvent]
  wheel: [ev: WheelInputEvent]
  keydown: [ev: KeyboardInputEvent]
  keypress: [ev: KeyboardInputEvent]
  keyup: [ev: KeyboardInputEvent]
}

export type InputEventKey = keyof InputEvents

export interface Input {
  on: <K extends keyof InputEvents & string>(event: K, listener: (...args: InputEvents[K]) => void) => this
  once: <K extends keyof InputEvents & string>(event: K, listener: (...args: InputEvents[K]) => void) => this
  off: <K extends keyof InputEvents & string>(event: K, listener: (...args: InputEvents[K]) => void) => this
  emit: <K extends keyof InputEvents & string>(event: K, ...args: InputEvents[K]) => this
}

export class Input extends Observable {
  /**
   * Current event
   */
  event?: PointerInputEvent | WheelInputEvent | KeyboardInputEvent

  target?: HTMLElement
  cursor: Cursor = 'default'
  cursorStyles: Record<string, any> = {
    default: 'inherit',
    pointer: 'pointer',
  }

  setuped = false

  enableMoveEvent = true
  enableWheelEvent = true
  enableClickEvent = true

  setTarget(target: HTMLElement): void {
    this.removeEventListeners()
    this.target = target
    this.addEventListeners()
  }

  removeEventListeners(): void {
    if (!this.setuped || !this.target) {
      return
    }
    const style = this.target.style as Record<string, any>
    if ((globalThis.navigator as any).msPointerEnabled) {
      style.msContentZooming = ''
      style.msTouchAction = ''
    }
    else if (SUPPORTS_POINTER_EVENTS) {
      style.touchAction = ''
    }

    if (SUPPORTS_POINTER_EVENTS) {
      this.target.removeEventListener('pointerdown', this._onPointerDown)
      this.target.removeEventListener('pointerleave', this._onPointerOver)
      this.target.removeEventListener('pointerover', this._onPointerOver)
      this.target.removeEventListener('pointermove', this._onPointerMove)
      this.target.removeEventListener('pointerup', this._onPointerUp)
    }
    else {
      this.target.removeEventListener('mousedown', this._onPointerDown)
      this.target.removeEventListener('mouseout', this._onPointerOver)
      this.target.removeEventListener('mouseover', this._onPointerOver)
      this.target.removeEventListener('mousemove', this._onPointerMove)
      this.target.removeEventListener('mouseup', this._onPointerUp)
    }

    if (SUPPORTS_TOUCH_EVENTS) {
      this.target.removeEventListener('touchstart', this._onPointerDown)
      this.target.removeEventListener('touchmove', this._onPointerMove)
      this.target.removeEventListener('touchend', this._onPointerUp)
    }

    this.target.removeEventListener('wheel', this._onWheel)
    document.removeEventListener('keydown', this._onKeyDown)
    document.removeEventListener('keypress', this._onKeyPress)
    document.removeEventListener('keyup', this._onKeyUp)
    this.target = undefined
    this.setuped = false
  }

  addEventListeners(): void {
    if (this.setuped || !this.target) {
      return
    }

    const style = this.target.style as Record<string, any>

    if (style) {
      if ((globalThis.navigator as any).msPointerEnabled) {
        style.msContentZooming = 'none'
        style.msTouchAction = 'none'
      }
      else if (SUPPORTS_POINTER_EVENTS) {
        style.touchAction = 'none'
      }
    }

    if (SUPPORTS_POINTER_EVENTS) {
      this.target.addEventListener('pointerdown', this._onPointerDown)
      this.target.addEventListener('pointerleave', this._onPointerOver)
      this.target.addEventListener('pointerover', this._onPointerOver)
      this.target.addEventListener('pointermove', this._onPointerMove)
      this.target.addEventListener('pointerup', this._onPointerUp)
    }
    else {
      this.target.addEventListener('mousedown', this._onPointerDown)
      this.target.addEventListener('mouseout', this._onPointerOver)
      this.target.addEventListener('mouseover', this._onPointerOver)
      this.target.addEventListener('mousemove', this._onPointerMove)
      this.target.addEventListener('mouseup', this._onPointerUp)
    }

    if (SUPPORTS_TOUCH_EVENTS) {
      this.target.addEventListener('touchstart', this._onPointerDown)
      this.target.addEventListener('touchmove', this._onPointerMove)
      this.target.addEventListener('touchend', this._onPointerUp)
    }

    this.target.addEventListener('wheel', this._onWheel)
    document.addEventListener('keydown', this._onKeyDown)
    document.addEventListener('keypress', this._onKeyPress)
    document.addEventListener('keyup', this._onKeyUp)
    this.setuped = true
  }

  protected normalize(event: KeyboardEvent): KeyboardEvent[]
  protected normalize(event: WheelEvent): WheelEvent[]
  protected normalize(event: TouchEvent | PointerEvent | MouseEvent): PointerEvent[]
  protected normalize(event: any): any[] {
    const events = []
    if (SUPPORTS_TOUCH_EVENTS && event instanceof globalThis.TouchEvent) {
      for (let i = 0, li = event.changedTouches.length; i < li; i++) {
        const touch = event.changedTouches[i] as Record<string, any>
        if (typeof touch.button === 'undefined')
          touch.button = 0
        if (typeof touch.buttons === 'undefined')
          touch.buttons = 1
        if (typeof touch.isPrimary === 'undefined') {
          touch.isPrimary = event.touches.length === 1 && event.type === 'touchstart'
        }
        if (typeof touch.width === 'undefined')
          touch.width = touch.radiusX || 1
        if (typeof touch.height === 'undefined')
          touch.height = touch.radiusY || 1
        if (typeof touch.tiltX === 'undefined')
          touch.tiltX = 0
        if (typeof touch.tiltY === 'undefined')
          touch.tiltY = 0
        if (typeof touch.pointerType === 'undefined')
          touch.pointerType = 'touch'
        if (typeof touch.pointerId === 'undefined')
          touch.pointerId = touch.identifier || 0
        if (typeof touch.pressure === 'undefined')
          touch.pressure = touch.force || 0.5
        if (typeof touch.twist === 'undefined')
          touch.twist = 0
        if (typeof touch.tangentialPressure === 'undefined')
          touch.tangentialPressure = 0
        if (typeof touch.layerX === 'undefined')
          touch.layerX = touch.offsetX = touch.clientX
        if (typeof touch.layerY === 'undefined')
          touch.layerY = touch.offsetY = touch.clientY
        touch.type = event.type
        events.push(touch)
      }
    }
    else if (SUPPORTS_WHEEL_EVENTS && event instanceof globalThis.WheelEvent) {
      events.push(event)
    }
    else if (SUPPORTS_POINTER_EVENTS && event instanceof globalThis.PointerEvent) {
      events.push(event)
    }
    else {
      const mouse = event as any
      if (typeof mouse.isPrimary === 'undefined')
        mouse.isPrimary = true
      if (typeof mouse.width === 'undefined')
        mouse.width = 1
      if (typeof mouse.height === 'undefined')
        mouse.height = 1
      if (typeof mouse.tiltX === 'undefined')
        mouse.tiltX = 0
      if (typeof mouse.tiltY === 'undefined')
        mouse.tiltY = 0
      if (typeof mouse.pointerType === 'undefined')
        mouse.pointerType = 'mouse'
      if (typeof mouse.pointerId === 'undefined')
        mouse.pointerId = 1
      if (typeof mouse.pressure === 'undefined')
        mouse.pressure = 0.5
      if (typeof mouse.twist === 'undefined')
        mouse.twist = 0
      if (typeof mouse.tangentialPressure === 'undefined')
        mouse.tangentialPressure = 0
      events.push(mouse)
    }

    return events as any
  }

  protected _clonePointerEvent(nativeEvent: PointerEvent): PointerInputEvent {
    const event = new PointerInputEvent()
    event.nativeEvent = nativeEvent
    event.pointerId = nativeEvent.pointerId
    event.width = nativeEvent.width
    event.height = nativeEvent.height
    event.isPrimary = nativeEvent.isPrimary
    event.pointerType = nativeEvent.pointerType
    event.pressure = nativeEvent.pressure
    event.tangentialPressure = nativeEvent.tangentialPressure
    event.tiltX = nativeEvent.tiltX
    event.tiltY = nativeEvent.tiltY
    event.twist = nativeEvent.twist
    event.isTrusted = nativeEvent.isTrusted
    this._copyMouseEvent(event, nativeEvent)
    this.mapPositionToPoint(event.screen, nativeEvent.clientX, nativeEvent.clientY)
    event.global.x = event.screen.x
    event.global.y = event.screen.y
    event.offset.x = event.screen.x
    event.offset.y = event.screen.y
    if (event.type === 'pointerleave') {
      event.type = 'pointerout'
    }
    else if (event.type.startsWith('mouse')) {
      event.type = event.type.replace('mouse', 'pointer')
    }
    else if (event.type.startsWith('touch')) {
      event.type = TOUCH_TO_POINTER[event.type] || event.type
    }
    return event
  }

  protected _copyInputEvent(event: InputEvent, nativeEvent: UIEvent): void {
    event.nativeEvent = nativeEvent
    event.bubbles = nativeEvent.bubbles
    event.cancelBubble = nativeEvent.cancelBubble
    event.cancelable = nativeEvent.cancelable
    event.composed = nativeEvent.composed
    event.currentTarget = nativeEvent.currentTarget
    event.defaultPrevented = nativeEvent.defaultPrevented
    event.eventPhase = nativeEvent.eventPhase
    event.isTrusted = nativeEvent.isTrusted
    event.returnValue = nativeEvent.returnValue
    event.srcElement = nativeEvent.srcElement
    event.timeStamp = nativeEvent.timeStamp
    event.type = nativeEvent.type
  }

  protected _copyMouseEvent(event: MouseInputEvent, nativeEvent: MouseEvent): void {
    this._copyInputEvent(event, nativeEvent)
    event.altKey = nativeEvent.altKey
    event.button = nativeEvent.button
    event.buttons = nativeEvent.buttons
    event.client.x = nativeEvent.clientX
    event.client.y = nativeEvent.clientY
    event.ctrlKey = nativeEvent.ctrlKey
    event.metaKey = nativeEvent.metaKey
    event.movement.x = nativeEvent.movementX
    event.movement.y = nativeEvent.movementY
    event.page.x = nativeEvent.pageX
    event.page.y = nativeEvent.pageY
    event.relatedTarget = null
    event.shiftKey = nativeEvent.shiftKey
  }

  protected _cloneWheelEvent(nativeEvent: WheelEvent): WheelInputEvent {
    const event = new WheelInputEvent()
    this._copyMouseEvent(event, nativeEvent)
    ;(event as any).wheelDeltaY = (nativeEvent as any).wheelDeltaY
    event.deltaX = nativeEvent.deltaX
    event.deltaY = nativeEvent.deltaY
    event.deltaZ = nativeEvent.deltaZ
    event.deltaMode = nativeEvent.deltaMode
    this.mapPositionToPoint(event.screen, nativeEvent.clientX, nativeEvent.clientY)
    event.global.x = event.screen.x
    event.global.y = event.screen.y
    event.offset.x = event.screen.x
    event.offset.y = event.screen.y
    return event
  }

  protected _cloneKeyboardEvent(nativeEvent: KeyboardEvent): KeyboardInputEvent {
    const event = new KeyboardInputEvent()
    this._copyInputEvent(event, nativeEvent)
    event.altKey = nativeEvent.altKey
    event.charCode = nativeEvent.charCode
    event.code = nativeEvent.code
    event.ctrlKey = nativeEvent.ctrlKey
    event.isComposing = nativeEvent.isComposing
    event.key = nativeEvent.key
    event.keyCode = nativeEvent.keyCode
    event.location = nativeEvent.location
    event.metaKey = nativeEvent.metaKey
    event.repeat = nativeEvent.repeat
    event.shiftKey = nativeEvent.shiftKey
    return event
  }

  setCursor(mode: Cursor = 'default'): void {
    if (!this.target)
      return

    if (this.cursor === mode) {
      return
    }

    this.cursor = mode
    const applyStyles = !(globalThis.OffscreenCanvas && this.target instanceof OffscreenCanvas)
    const style = this.cursorStyles[mode]
    if (style) {
      switch (typeof style) {
        case 'string':
          if (applyStyles) {
            this.target.style.cursor = style
          }
          break
        case 'function':
          style(mode)
          break
        case 'object':
          if (applyStyles) {
            Object.assign(this.target.style, style)
          }
          break
      }
    }
    else if (
      applyStyles
      && typeof mode === 'string'
      && !Object.prototype.hasOwnProperty.call(this.cursorStyles, mode)
    ) {
      this.target.style.cursor = mode
    }
  }

  mapPositionToPoint(point: { x: number, y: number }, x: number, y: number): void {
    if (!this.target)
      return
    const clientRect = this.target.isConnected
      ? this.target.getBoundingClientRect()
      : undefined
    const pixelRatio = Number(this.target.getAttribute('data-pixel-ratio')) || 1
    const width = Number(this.target.getAttribute('width')) || (clientRect ? clientRect.width * pixelRatio : 0)
    const height = Number(this.target.getAttribute('height')) || (clientRect ? clientRect.height * pixelRatio : 0)
    const rect = clientRect ?? { x: 0, y: 0, width, height, left: 0, top: 0 }
    const multiplier = 1.0 / pixelRatio
    point.x = ((x - rect.left) * (width / rect.width)) * multiplier
    point.y = ((y - rect.top) * (height / rect.height)) * multiplier
  }

  protected _onKeyDown = (nativeEvent: KeyboardEvent): void => {
    const events = this.normalize(nativeEvent)
    for (let i = 0, len = events.length; i < len; i++) {
      this.emit('keydown', this.event = this._cloneKeyboardEvent(events[i]))
    }
    if (this.event?.cursor) {
      this.setCursor(this.event.cursor)
    }
  }

  protected _onKeyPress = (nativeEvent: KeyboardEvent): void => {
    const events = this.normalize(nativeEvent)
    for (let i = 0, len = events.length; i < len; i++) {
      this.emit('keypress', this.event = this._cloneKeyboardEvent(events[i]))
    }
    if (this.event?.cursor) {
      this.setCursor(this.event.cursor)
    }
  }

  protected _onKeyUp = (nativeEvent: KeyboardEvent): void => {
    const events = this.normalize(nativeEvent)
    for (let i = 0, len = events.length; i < len; i++) {
      this.emit('keyup', this.event = this._cloneKeyboardEvent(events[i]))
    }
    if (this.event?.cursor) {
      this.setCursor(this.event.cursor)
    }
  }

  protected _onPointerDown = (nativeEvent: PointerEvent | TouchEvent | MouseEvent): void => {
    if (SUPPORTS_TOUCH_EVENTS && (nativeEvent as PointerEvent).pointerType === 'touch')
      return
    const events = this.normalize(nativeEvent)
    for (let i = 0, len = events.length; i < len; i++) {
      this.emit('pointerdown', this.event = this._clonePointerEvent(events[i]))
    }
    if (this.event?.cursor) {
      this.setCursor(this.event.cursor)
    }
  }

  protected _onPointerOver = (nativeEvent: PointerEvent | TouchEvent | MouseEvent): void => {
    if (!this.enableClickEvent)
      return
    if (SUPPORTS_TOUCH_EVENTS && (nativeEvent as PointerEvent).pointerType === 'touch')
      return
    const events = this.normalize(nativeEvent)
    for (let i = 0, len = events.length; i < len; i++) {
      this.emit('pointerover', this.event = this._clonePointerEvent(events[i]))
    }
    if (this.event?.cursor) {
      this.setCursor(this.event.cursor)
    }
  }

  protected _onPointerMove = (nativeEvent: PointerEvent | TouchEvent | MouseEvent): void => {
    if (!this.enableMoveEvent)
      return
    if (SUPPORTS_TOUCH_EVENTS && (nativeEvent as PointerEvent).pointerType === 'touch')
      return
    const events = this.normalize(nativeEvent)
    for (let i = 0, len = events.length; i < len; i++) {
      this.emit('pointermove', this.event = this._clonePointerEvent(events[i]))
    }
    if (this.event?.cursor) {
      this.setCursor(this.event.cursor)
    }
  }

  protected _onPointerUp = (nativeEvent: PointerEvent | TouchEvent | MouseEvent): void => {
    if (!this.enableClickEvent)
      return
    if (SUPPORTS_TOUCH_EVENTS && (nativeEvent as PointerEvent).pointerType === 'touch')
      return
    let target = nativeEvent.target
    if (nativeEvent.composedPath && nativeEvent.composedPath().length > 0) {
      target = nativeEvent.composedPath()[0]
    }
    const outside = target !== this.target ? 'outside' : ''
    const events = this.normalize(nativeEvent)
    for (let i = 0, len = events.length; i < len; i++) {
      const event = this._clonePointerEvent(events[i])
      event.type += outside
      this.emit('pointerup', this.event = event)
    }
    if (this.event?.cursor) {
      this.setCursor(this.event.cursor)
    }
  }

  protected _onWheel = (nativeEvent: WheelEvent): void => {
    if (!this.enableWheelEvent)
      return
    const events = this.normalize(nativeEvent)
    for (let i = 0, len = events.length; i < len; i++) {
      this.emit('wheel', this.event = this._cloneWheelEvent(events[i]))
    }
    if (this.event?.cursor) {
      this.setCursor(this.event.cursor)
    }
  }

  override destroy(): void {
    this.removeEventListeners()
    super.destroy()
  }
}
