import { property, Reactivable } from 'modern-idoc'
import { DEVICE_PIXEL_RATIO, RawWeakMap } from '../shared'

export abstract class Renderer extends Reactivable {
  @property({ fallback: DEVICE_PIXEL_RATIO }) declare pixelRatio: number
  @property({ internal: true }) declare view?: HTMLCanvasElement

  readonly screen = { x: 0, y: 0, width: 0, height: 0 }
  readonly related = new RawWeakMap<object, any>()

  protected _updateProperty(key: string, newValue: any, oldValue: any): void {
    super._updateProperty(key, newValue, oldValue)

    switch (key) {
      case 'view':
      case 'pixelRatio':
        if (this.view) {
          this.view.dataset.pixelRatio = String(this.pixelRatio)
        }
        break
    }
  }

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

  override destroy(): void {
    super.destroy()
  }
}
