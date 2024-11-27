import type { AnyColor, Colord } from 'colord'
import { colord, extend } from 'colord'
import namesPlugin from 'colord/plugins/names'

extend([namesPlugin])

export type ColorValue = number | AnyColor

export class Color {
  protected declare _colord: Colord
  protected declare _value: ColorValue

  get value(): ColorValue { return this._value }
  set value(value) {
    if (this._value === value)
      return
    this._value = value
    let input
    if (typeof value === 'number') {
      input = {
        r: (value >> 24) & 0xFF,
        g: (value >> 16) & 0xFF,
        b: (value >> 8) & 0xFF,
        a: value & 0xFF,
      }
    }
    else {
      input = value
    }
    const parsed = colord(input)
    if (parsed.isValid()) {
      this._colord = parsed
    }
    else {
      console.warn(`Unable to convert color ${value}`)
    }
  }

  get r8(): number { return this._colord.rgba.r }
  get g8(): number { return this._colord.rgba.g }
  get b8(): number { return this._colord.rgba.b }
  get a8(): number { return (this._colord.rgba.a * 255) & 0xFF }
  get r(): number { return this.r8 / 255 }
  get g(): number { return this.g8 / 255 }
  get b(): number { return this.b8 / 255 }
  get a(): number { return this._colord.rgba.a }
  get rgb(): number { return (this.r8 << 16) + (this.g8 << 8) + this.b8 }
  get bgr(): number { return (this.b8 << 16) + (this.g8 << 8) + this.r8 }
  get abgr(): number { return (this.a8 << 24) + this.bgr }

  constructor(value: ColorValue = 0x00000000) {
    this.value = value
  }

  toArgb(alpha = this.a, applyToRGB = true): number {
    if (alpha === 1.0) {
      return (0xFF << 24) + this.rgb
    }

    if (alpha === 0.0) {
      return applyToRGB ? 0 : this.rgb
    }

    let r = this.r8
    let g = this.g8
    let b = this.b8

    if (applyToRGB) {
      r = ((r * alpha) + 0.5) | 0
      g = ((g * alpha) + 0.5) | 0
      b = ((b * alpha) + 0.5) | 0
    }

    return (alpha * 255 << 24) + (r << 16) + (g << 8) + b
  }

  toHex(): string { return this._colord.toHex() }

  toArray(): [number, number, number, number] {
    return [this.r, this.g, this.b, this.a]
  }
}
