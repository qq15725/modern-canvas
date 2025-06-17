import type { EventListenerOptions, EventListenerValue } from '../object'
import type { Cursor } from './Cursor'
import type { MouseInputEvent } from './MouseInputEvent'
import { EventEmitter } from '../object'
import { SUPPORTS_POINTER_EVENTS, SUPPORTS_TOUCH_EVENTS, SUPPORTS_WHEEL_EVENTS } from '../shared'
import { PointerInputEvent } from './PointerInputEvent'
import { WheelInputEvent } from './WheelInputEvent'

const TOUCH_TO_POINTER: Record<string, string> = {
  touchstart: 'pointerdown',
  touchend: 'pointerup',
  touchendoutside: 'pointerupoutside',
  touchmove: 'pointermove',
  touchcancel: 'pointercancel',
}

export interface InputEventMap {
  pointerdown: (ev: PointerInputEvent) => void
  pointerover: (ev: PointerInputEvent) => void
  pointermove: (ev: PointerInputEvent) => void
  pointerup: (ev: PointerInputEvent) => void
  wheel: (ev: WheelInputEvent) => void
}

export type InputEventKey = keyof InputEventMap

export interface Input {
  on: (<K extends keyof InputEventMap>(type: K, listener: InputEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  once: (<K extends keyof InputEventMap>(type: K, listener: InputEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  off: (<K extends keyof InputEventMap>(type: K, listener?: InputEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  emit: (<K extends keyof InputEventMap>(type: K, ...args: Parameters<InputEventMap[K]>) => boolean)
    & ((type: string, ...args: any[]) => boolean)
}

export class Input extends EventEmitter {
  target?: HTMLElement
  cursor: Cursor | string = 'default'
  cursorStyles: Record<string, any> = {
    default: 'inherit',
    pointer: 'pointer',
  }

  setuped = false

  /**
   * Current event
   */
  event?: PointerInputEvent | WheelInputEvent

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
      this.target.removeEventListener('pointerdown', this.onPointerDown)
      this.target.removeEventListener('pointerleave', this.onPointerOver)
      this.target.removeEventListener('pointerover', this.onPointerOver)
      this.target.removeEventListener('pointermove', this.onPointerMove)
      this.target.removeEventListener('pointerup', this.onPointerUp)
    }
    else {
      this.target.removeEventListener('mousedown', this.onPointerDown)
      this.target.removeEventListener('mouseout', this.onPointerOver)
      this.target.removeEventListener('mouseover', this.onPointerOver)
      this.target.removeEventListener('mousemove', this.onPointerMove)
      this.target.removeEventListener('mouseup', this.onPointerUp)
    }
    if (SUPPORTS_TOUCH_EVENTS) {
      this.target.removeEventListener('touchstart', this.onPointerDown)
      this.target.removeEventListener('touchmove', this.onPointerMove)
      this.target.removeEventListener('touchend', this.onPointerUp)
    }
    this.target.removeEventListener('wheel', this.onWheel)
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
      this.target.addEventListener('pointerdown', this.onPointerDown)
      this.target.addEventListener('pointerleave', this.onPointerOver)
      this.target.addEventListener('pointerover', this.onPointerOver)
      this.target.addEventListener('pointermove', this.onPointerMove)
      this.target.addEventListener('pointerup', this.onPointerUp)
    }
    else {
      this.target.addEventListener('mousedown', this.onPointerDown)
      this.target.addEventListener('mouseout', this.onPointerOver)
      this.target.addEventListener('mouseover', this.onPointerOver)
      this.target.addEventListener('mousemove', this.onPointerMove)
      this.target.addEventListener('mouseup', this.onPointerUp)
    }
    if (SUPPORTS_TOUCH_EVENTS) {
      this.target.addEventListener('touchstart', this.onPointerDown)
      this.target.addEventListener('touchmove', this.onPointerMove)
      this.target.addEventListener('touchend', this.onPointerUp)
    }
    this.target.addEventListener('wheel', this.onWheel)
    this.setuped = true
  }

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

  protected cloneWheelEvent(nativeEvent: WheelEvent): WheelInputEvent {
    const event = new WheelInputEvent()
    this.copyMouseEvent(event, nativeEvent)
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
    event.nativeEvent = nativeEvent
    event.type = nativeEvent.type
    return event
  }

  protected clonePointerEvent(nativeEvent: PointerEvent): PointerInputEvent {
    const event = new PointerInputEvent()
    event.originalEvent = null
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
    this.copyMouseEvent(event, nativeEvent)
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

  protected copyMouseEvent(event: MouseInputEvent, nativeEvent: MouseEvent): void {
    event.preventDefault = nativeEvent.preventDefault.bind(nativeEvent)
    event.stopPropagation = nativeEvent.stopPropagation.bind(nativeEvent)
    event.isTrusted = nativeEvent.isTrusted
    event.timeStamp = performance.now()
    event.type = nativeEvent.type
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

  setCursor(mode?: Cursor): void {
    if (!this.target)
      return
    mode = mode || 'default'
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
    const width = Number(this.target.getAttribute('width')) || 0
    const height = Number(this.target.getAttribute('height')) || 0
    const pixelRatio = Number(this.target.getAttribute('data-pixel-ratio')) || 1
    const rect = this.target.isConnected
      ? this.target.getBoundingClientRect()
      : { x: 0, y: 0, width, height, left: 0, top: 0 }
    const multiplier = 1.0 / pixelRatio
    point.x = ((x - rect.left) * (width / rect.width)) * multiplier
    point.y = ((y - rect.top) * (height / rect.height)) * multiplier
  }

  protected onPointerDown = (nativeEvent: PointerEvent | TouchEvent | MouseEvent): void => {
    if (SUPPORTS_TOUCH_EVENTS && (nativeEvent as PointerEvent).pointerType === 'touch')
      return
    const events = this.normalize(nativeEvent)
    for (let i = 0, len = events.length; i < len; i++) {
      this.emit('pointerdown', this.event = this.clonePointerEvent(events[i]))
    }
    this.setCursor(this.cursor)
  }

  protected onPointerOver = (nativeEvent: PointerEvent | TouchEvent | MouseEvent): void => {
    if (!this.enableClickEvent)
      return
    if (SUPPORTS_TOUCH_EVENTS && (nativeEvent as PointerEvent).pointerType === 'touch')
      return
    const events = this.normalize(nativeEvent)
    for (let i = 0, len = events.length; i < len; i++) {
      this.emit('pointerover', this.event = this.clonePointerEvent(events[i]))
    }
  }

  protected onPointerMove = (nativeEvent: PointerEvent | TouchEvent | MouseEvent): void => {
    if (!this.enableMoveEvent)
      return
    if (SUPPORTS_TOUCH_EVENTS && (nativeEvent as PointerEvent).pointerType === 'touch')
      return
    const events = this.normalize(nativeEvent)
    for (let i = 0, len = events.length; i < len; i++) {
      this.emit('pointermove', this.event = this.clonePointerEvent(events[i]))
    }
  }

  protected onPointerUp = (nativeEvent: PointerEvent | TouchEvent | MouseEvent): void => {
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
      const event = this.clonePointerEvent(events[i])
      event.type += outside
      this.emit('pointerup', this.event = event)
    }
  }

  protected onWheel = (nativeEvent: WheelEvent): void => {
    if (!this.enableWheelEvent)
      return
    const events = this.normalize(nativeEvent)
    for (let i = 0, len = events.length; i < len; i++) {
      this.emit('wheel', this.event = this.cloneWheelEvent(events[i]))
    }
  }
}
