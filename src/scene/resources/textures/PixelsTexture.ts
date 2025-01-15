import type { Texture2DPixelsSource } from './Texture2D'
import { Texture2D } from './Texture2D'

export class PixelsTexture extends Texture2D<Texture2DPixelsSource> {
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
        source.pixels = new Uint8Array(pixels as any)
      }
    }

    super(source)
  }
}
