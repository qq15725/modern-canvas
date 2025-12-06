import type { Texture2DProperties } from './Texture2D'
import { Texture2D } from './Texture2D'

export interface PixelsTextureProperties extends Texture2DProperties<ArrayBufferView | null> {
  //
}

export class PixelsTexture extends Texture2D<ArrayBufferView | null> {
  constructor(properties: PixelsTextureProperties = {}) {
    super({
      ...properties,
      uploadMethodId: 'buffer',
    })
  }
}
