import type { Rectangle } from '../../../core'

export interface RectangulableEvents {
  updateRect: []
}

export interface Rectangulable {
  on: <K extends keyof RectangulableEvents & string>(event: K, listener: (...args: RectangulableEvents[K]) => void) => this
  once: <K extends keyof RectangulableEvents & string>(event: K, listener: (...args: RectangulableEvents[K]) => void) => this
  off: <K extends keyof RectangulableEvents & string>(event: K, listener: (...args: RectangulableEvents[K]) => void) => this
  emit: <K extends keyof RectangulableEvents & string>(event: K, ...args: RectangulableEvents[K]) => this
}

export interface Rectangulable {
  getRect: () => Rectangle
}
