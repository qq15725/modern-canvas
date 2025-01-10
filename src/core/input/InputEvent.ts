export class InputEvent<N extends UIEvent = UIEvent> implements UIEvent {
  bubbles = true
  readonly cancelable = false
  which!: number
  cancelBubble = true
  returnValue!: boolean
  srcElement!: EventTarget
  readonly composed = false
  currentTarget!: any
  defaultPrevented = false
  eventPhase = InputEvent.prototype.NONE
  isTrusted!: boolean
  target!: any
  timeStamp!: number
  type!: string
  nativeEvent!: N
  originalEvent!: InputEvent<N> | null
  propagationStopped = false
  propagationImmediatelyStopped = false
  path!: any[]
  detail!: number
  view!: WindowProxy
  layer = { x: 0, y: 0 }
  get layerX(): number { return this.layer.x }
  get layerY(): number { return this.layer.y }
  page = { x: 0, y: 0 }
  get pageX(): number { return this.page.x }
  get pageY(): number { return this.page.y }
  initEvent(..._args: any[]): void {
    throw new Error('initEvent() is a legacy DOM API. It is not implemented in the Federated Events API.')
  }

  initUIEvent(..._args: any[]): void {
    throw new Error('initUIEvent() is a legacy DOM API. It is not implemented in the Federated Events API.')
  }

  composedPath(): any[] {
    return this.path
  }

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
