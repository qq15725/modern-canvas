import type { Cursor } from './Cursor'

export class InputEvent<N extends UIEvent = UIEvent> implements UIEvent {
  declare nativeEvent: N
  cursor?: Cursor

  // Event
  bubbles = false
  cancelBubble = false
  cancelable = false
  composed = false
  declare currentTarget: any
  defaultPrevented = false
  eventPhase = InputEvent.prototype.NONE
  isTrusted = false
  declare returnValue: boolean
  declare srcElement: EventTarget | null
  declare target: any
  timeStamp: number = 0
  type: string = ''

  declare path: any[]
  composedPath(): any[] {
    return this.path
  }

  initEvent(..._args: any[]): void {
    throw new Error('initEvent() is a legacy DOM API. It is not implemented in the Federated Events API.')
  }

  preventDefault(): void {
    if ('preventDefault' in this.nativeEvent && this.nativeEvent.cancelable) {
      this.nativeEvent.preventDefault()
    }
    this.defaultPrevented = true
  }

  propagationImmediatelyStopped = false
  stopImmediatePropagation(): void {
    this.propagationImmediatelyStopped = true
  }

  propagationStopped = false
  stopPropagation(): void {
    if ('stopPropagation' in this.nativeEvent) {
      this.nativeEvent.stopPropagation()
    }
    this.propagationStopped = true
  }

  readonly NONE = 0
  readonly CAPTURING_PHASE = 1
  readonly AT_TARGET = 2
  readonly BUBBLING_PHASE = 3

  // UIEvent
  declare detail: number
  declare view: WindowProxy
  declare which: number

  initUIEvent(..._args: any[]): void {
    throw new Error('initUIEvent() is a legacy DOM API. It is not implemented in the Federated Events API.')
  }
}
