import { property } from 'modern-idoc'
import { Texture2D } from './Texture2D'

export class CanvasTexture extends Texture2D<HTMLCanvasElement> {
  @property({ fallback: 2 }) declare pixelRatio: number

  constructor(source = document.createElement('canvas')) {
    super(source)
  }

  protected override _updateProperty(key: string, value: any, oldValue: any): void {
    switch (key) {
      case 'width':
        this.source.width = Math.max(1, Math.ceil(value * this.pixelRatio))
        break
      case 'height':
        this.source.height = Math.max(1, Math.ceil(value * this.pixelRatio))
        break
    }

    super._updateProperty(key, value, oldValue)
  }
}
