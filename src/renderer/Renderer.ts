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
    const viewWidth = Math.floor(width * this.pixelRatio)
    const viewHeight = Math.floor(height * this.pixelRatio)
    const screenWidth = viewWidth / this.pixelRatio
    const screenHeight = viewHeight / this.pixelRatio
    if (this.view) {
      this.view.width = viewWidth
      this.view.height = viewHeight
    }
    this.screen.width = screenWidth
    this.screen.height = screenHeight
    if (updateStyle && this.view) {
      this.view.style.width = `${screenWidth}px`
      this.view.style.height = `${screenHeight}px`
    }
  }
}
