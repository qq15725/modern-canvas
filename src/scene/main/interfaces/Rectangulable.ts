import type { Rect2 } from '../../../core'

export interface RectangulableEvents {
  updateRect: () => void
}

export interface Rectangulable {
  on: <K extends keyof RectangulableEvents & string>(event: K, listener: RectangulableEvents[K]) => this
  once: <K extends keyof RectangulableEvents & string>(event: K, listener: RectangulableEvents[K]) => this
  off: <K extends keyof RectangulableEvents & string>(event: K, listener: RectangulableEvents[K]) => this
  emit: <K extends keyof RectangulableEvents & string>(event: K, ...args: Parameters<RectangulableEvents[K]>) => this
}

export interface Rectangulable {
  getRect: () => Rect2
}
