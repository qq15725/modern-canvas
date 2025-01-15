import type { PropertyDeclaration } from '../../../core'
import { property } from '../../../core'
import { Texture2D } from './Texture2D'

export class CanvasTexture extends Texture2D<HTMLCanvasElement> {
  @property({ default: 2 }) declare pixelRatio: number

  constructor(source = document.createElement('canvas')) {
    super(source)
  }

  protected override _onUpdateProperty(key: PropertyKey, newValue: any, oldValue: any, declaration?: PropertyDeclaration): void {
    switch (key) {
      case 'width':
        this.source.width = newValue * this.pixelRatio
        break
      case 'height':
        this.source.height = newValue * this.pixelRatio
        break
    }

    super._onUpdateProperty(key, newValue, oldValue, declaration)
  }
}
