import type { ColorValue } from '../../../core'
import { Color } from '../../../core'
import { Texture } from './Texture'

export class ColorTexture extends Texture {
  constructor(value: ColorValue) {
    const color = new Color(value)
    super({
      width: 1,
      height: 1,
      pixels: new Uint8Array([color.r8, color.g8, color.b8, color.a8]),
    })
  }
}
