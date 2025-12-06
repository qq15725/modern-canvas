import type { Texture2DProperties } from './Texture2D'
import { Texture2D } from './Texture2D'

export interface CanvasTextureProperties extends Texture2DProperties<HTMLCanvasElement> {
  //
}

export class CanvasTexture extends Texture2D<HTMLCanvasElement> {
  constructor(properties: CanvasTextureProperties = {}) {
    super({
      pixelRatio: 2,
      ...properties,
      source: properties.source ?? document.createElement('canvas'),
      uploadMethodId: 'image',
    })
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
