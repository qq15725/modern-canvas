import { property, Reactivable } from 'modern-idoc'
import { DEVICE_PIXEL_RATIO } from '../../shared'

export abstract class Renderer extends Reactivable {
  @property({ fallback: DEVICE_PIXEL_RATIO }) declare pixelRatio: number
  @property({ internal: true }) declare view?: HTMLCanvasElement

  readonly screen = { x: 0, y: 0, width: 0, height: 0 }

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
