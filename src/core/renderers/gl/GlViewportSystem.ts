import type { RectangleLike } from '../../math'
import type { GlRenderer } from './GlRenderer'
import { Rectangle } from '../../math'
import { GlSystem } from './system'

export class GlViewportSystem extends GlSystem {
  readonly current = new Rectangle(0, 0, 0, 0)

  override install(renderer: GlRenderer): void {
    super.install(renderer)
    renderer.viewport = this
  }

  bind(rect: RectangleLike): void {
    const viewport = this.current
    const x = Math.floor(rect.x)
    const y = Math.floor(rect.y)
    const width = Math.floor(rect.width)
    const height = Math.floor(rect.height)
    if (
      viewport.x === x
      && viewport.y === y
      && viewport.width === width
      && viewport.height === height
    ) {
      return
    }
    this._gl.viewport(x, y, width, height)
    viewport.x = x
    viewport.y = y
    viewport.width = width
    viewport.height = height
  }
}
