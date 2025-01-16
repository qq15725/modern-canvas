import type { PropertyDeclaration } from '../../../core'
import { property } from '../../../core'
import { Texture2D } from './Texture2D'

export class CanvasTexture extends Texture2D<HTMLCanvasElement> {
  @property({ default: 2 }) declare pixelRatio: number

  constructor(source = document.createElement('canvas')) {
    super(source)
  }

  protected override _onUpdateProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    switch (key) {
      case 'width':
        this.source.width = value * this.pixelRatio
        break
      case 'height':
        this.source.height = value * this.pixelRatio
        break
    }

    super._onUpdateProperty(key, value, oldValue, declaration)
  }
}
