import type { EventListenerOptions, EventListenerValue, Rect2 } from '../../../core'

export interface RectangulableEventMap {
  updateRect: () => void
}

export interface Rectangulable {
  on: (<K extends keyof RectangulableEventMap>(type: K, listener: RectangulableEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  once: (<K extends keyof RectangulableEventMap>(type: K, listener: RectangulableEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  off: (<K extends keyof RectangulableEventMap>(type: K, listener?: RectangulableEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  emit: (<K extends keyof RectangulableEventMap>(type: K, ...args: Parameters<RectangulableEventMap[K]>) => boolean)
    & ((type: string, ...args: any[]) => boolean)
}

export interface Rectangulable {
  getRect: () => Rect2
}
