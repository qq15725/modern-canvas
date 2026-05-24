import type { Texture2DProperties } from './Texture2D'
import { createHTMLCanvas } from '../../../core'
import { Texture2D } from './Texture2D'

export interface CanvasTextureProperties extends Texture2DProperties<HTMLCanvasElement> {
  //
}

export class CanvasTexture extends Texture2D<HTMLCanvasElement> {
  constructor(properties: CanvasTextureProperties = {}) {
    super({
      pixelRatio: 2,
      ...properties,
      source: properties.source ?? createHTMLCanvas(),
      uploadMethodId: 'image',
    })
  }

  protected override _updateProperty(key: string, value: any, oldValue: any): void {
    switch (key) {
      case 'width':
        if (this.source) {
          this.source.width = Math.max(1, Math.ceil(value * this.pixelRatio))
        }
        break
      case 'height':
        if (this.source) {
          this.source.height = Math.max(1, Math.ceil(value * this.pixelRatio))
        }
        break
    }

    super._updateProperty(key, value, oldValue)
  }
}
