import type { GlRenderer } from './GlRenderer'
import { GlSystem } from './system'

export class GlColorMaskSystem extends GlSystem {
  override install(renderer: GlRenderer): void {
    super.install(renderer)
    renderer.colorMask = this
  }

  current = 0b1111

  bind(colorMask: number): void {
    if (this.current === colorMask)
      return

    this.current = colorMask

    this._gl.colorMask(
      !!(colorMask & 0b1000),
      !!(colorMask & 0b0100),
      !!(colorMask & 0b0010),
      !!(colorMask & 0b0001),
    )
  }
}
