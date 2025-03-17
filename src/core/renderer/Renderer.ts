import { DEVICE_PIXEL_RATIO, RawWeakMap } from '../shared'

export abstract class Renderer {
  view?: HTMLCanvasElement
  pixelRatio = DEVICE_PIXEL_RATIO
  readonly screen = { x: 0, y: 0, width: 0, height: 0 }
  readonly related = new RawWeakMap<object, any>()

  getRelated<T>(source: object, createFn?: () => T): T {
    let related = this.related.get(source)
    if (related)
      return related
    if (!createFn) {
      console.warn('Failed to get related', source)
      return null as T
    }
    this.related.set(source, related = createFn())
    return related
  }

  resize(width: number, height: number, updateStyle = true): void {
    if (this.view) {
      this.view.width = Math.floor(width * this.pixelRatio)
      this.view.height = Math.floor(height * this.pixelRatio)
    }
    this.screen.width = width
    this.screen.height = height
    if (updateStyle && this.view) {
      this.view.style.width = `${width}px`
      this.view.style.height = `${height}px`
    }
  }
}
