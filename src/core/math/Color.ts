import type { Colord, HslaColor, HsvaColor, RgbaColor } from 'colord'
import type { Color as ColorValue } from 'modern-idoc'
import { extend } from 'colord'
import namesPlugin from 'colord/plugins/names'
import { parseColor } from 'modern-idoc'

extend([namesPlugin])

export { ColorValue }

export class Color {
  protected declare _colord: Colord
  protected declare _value: ColorValue

  get value(): ColorValue { return this._value }
  set value(value: ColorValue | undefined) {
    this._colord = parseColor(value ?? 'none')
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

  toHex(): string { return this._colord.toHex() }
  toRgb(): RgbaColor { return this._colord.toRgb() }
  toRgbString(): string { return this._colord.toRgbString() }
  toHsl(): HslaColor { return this._colord.toHsl() }
  toHslString(): string { return this._colord.toHslString() }
  toHsv(): HsvaColor { return this._colord.toHsv() }

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

  toInt8Array(): [number, number, number, number] {
    return [this.r8, this.g8, this.b8, this.a8]
  }

  toArray(): [number, number, number, number] {
    return [this.r, this.g, this.b, this.a]
  }
}
