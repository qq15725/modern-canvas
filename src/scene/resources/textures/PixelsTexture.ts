import type { PropertyDeclaration } from 'modern-idoc'
import type { Texture2DPixelsSource } from './Texture2D'
import { Texture2D } from './Texture2D'

export class PixelsTexture extends Texture2D<Texture2DPixelsSource> {
  constructor(
    pixels?: number[] | ArrayBufferLike | ArrayBufferView | null,
    width = 1,
    height = 1,
  ) {
    const source = {
      width,
      height,
      pixels: null as null | Uint8Array,
    }

    if (pixels) {
      if (ArrayBuffer.isView(pixels)) {
        source.pixels = new Uint8Array(pixels.buffer)
      }
      else {
        source.pixels = new Uint8Array(pixels as any)
      }
    }

    super(source)
  }

  protected override _updateProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    switch (key) {
      case 'width':
        this.source.width = Math.round(this.width * this.pixelRatio)
        break
      case 'height':
        this.source.height = Math.round(this.height * this.pixelRatio)
        break
      case 'pixelRatio':
        this.source.width = Math.round(this.width * this.pixelRatio)
        this.source.height = Math.round(this.height * this.pixelRatio)
        break
    }

    super._updateProperty(key, value, oldValue, declaration)
  }
}
