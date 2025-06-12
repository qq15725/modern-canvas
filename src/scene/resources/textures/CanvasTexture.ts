import type { PropertyDeclaration } from 'modern-idoc'
import { property } from 'modern-idoc'
import { Texture2D } from './Texture2D'

export class CanvasTexture extends Texture2D<HTMLCanvasElement> {
  @property({ default: 2 }) declare pixelRatio: number

  constructor(source = document.createElement('canvas')) {
    super(source)
  }

  protected override _updateProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    switch (key) {
      case 'width':
        this.source.width = Math.max(1, Math.ceil(value * this.pixelRatio))
        break
      case 'height':
        this.source.height = Math.max(1, Math.ceil(value * this.pixelRatio))
        break
    }

    super._updateProperty(key, value, oldValue, declaration)
  }
}
