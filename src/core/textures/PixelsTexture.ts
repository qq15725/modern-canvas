import type { TexturePixelsSource } from './Texture'
import { Texture } from './Texture'

export class PixelsTexture extends Texture<TexturePixelsSource> {
  constructor(
    pixels?: ArrayLike<number> | ArrayBufferLike | ArrayBufferView | null,
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
        source.pixels = new Uint8Array(pixels)
      }
    }

    super(source)
  }
}
