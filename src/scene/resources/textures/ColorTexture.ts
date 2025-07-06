import type { ColorValue } from '../../../core'
import { Color } from '../../../core'
import { Texture2D } from './Texture2D'

export class ColorTexture extends Texture2D {
  protected static _cached = new Map<string, ColorTexture>()

  static get(value: ColorValue): Texture2D {
    const color = new Color(value)
    const hex = color.toHex()
    let result = this._cached.get(hex)
    if (!result) {
      result = new Texture2D({
        width: 1,
        height: 1,
        pixels: new Uint8Array([color.r8, color.g8, color.b8, color.a8]),
      })
      this._cached.set(hex, result)
    }
    return result
  }

  constructor(value: ColorValue) {
    const color = new Color(value)
    super({
      width: 1,
      height: 1,
      pixels: new Uint8Array([color.r8, color.g8, color.b8, color.a8]),
    })
  }
}
