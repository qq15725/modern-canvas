export class UIInputEvent<N extends UIEvent = UIEvent> implements UIEvent {
  /** Flags whether this event bubbles. This will take effect only if it is set before propagation. */
  bubbles = true
  readonly cancelable = false
  which!: number
  cancelBubble = true
  returnValue!: boolean
  srcElement!: EventTarget
  readonly composed = false

  /** The listeners of the event target that are being notified. */
  currentTarget!: any

  /** Flags whether the default response of the user agent was prevent through this event. */
  defaultPrevented = false

  /**
   * The propagation phase.
   */
  eventPhase = UIInputEvent.prototype.NONE

  /** Flags whether this is a user-trusted event */
  isTrusted!: boolean

  /** The event target that this will be dispatched to. */
  target!: any

  /** The timestamp of when the event was created. */
  timeStamp!: number

  /** The type of event, e.g. {@code "mouseup"}. */
  type!: string

  /** The native event that caused the foremost original event. */
  nativeEvent!: N

  /** The original event that caused this event, if any. */
  originalEvent!: UIInputEvent<N> | null

  /** Flags whether propagation was stopped. */
  propagationStopped = false

  /** Flags whether propagation was immediately stopped. */
  propagationImmediatelyStopped = false

  /** The composed path of the event's propagation. The {@code target} is at the end. */
  path!: any[]

  /** Event-specific detail */
  detail!: number

  /** The global Window object. */
  view!: WindowProxy

  /** The coordinates of the evnet relative to the nearest DOM layer. This is a non-standard property. */
  layer = { x: 0, y: 0 }

  get layerX(): number { return this.layer.x }
  get layerY(): number { return this.layer.y }

  /** The coordinates of the event relative to the DOM document. This is a non-standard property. */
  page = { x: 0, y: 0 }

  get pageX(): number { return this.page.x }
  get pageY(): number { return this.page.y }

  initEvent(..._args: any[]): void {
    throw new Error('initEvent() is a legacy DOM API. It is not implemented in the Federated Events API.')
  }

  initUIEvent(..._args: any[]): void {
    throw new Error('initUIEvent() is a legacy DOM API. It is not implemented in the Federated Events API.')
  }

  /** The propagation path for this event. */
  composedPath(): any[] {
    return this.path
  }

  /** Prevent default behavior of PixiJS and the user agent. */
  preventDefault(): void {
    if (this.nativeEvent instanceof Event && this.nativeEvent.cancelable) {
      this.nativeEvent.preventDefault()
    }
    this.defaultPrevented = true
  }

  stopImmediatePropagation(): void {
    this.propagationImmediatelyStopped = true
  }

  stopPropagation(): void {
    this.propagationStopped = true
  }

  readonly NONE = 0
  readonly CAPTURING_PHASE = 1
  readonly AT_TARGET = 2
  readonly BUBBLING_PHASE = 3
}
