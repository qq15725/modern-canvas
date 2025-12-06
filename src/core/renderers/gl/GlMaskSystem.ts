import type { GlRenderer } from './GlRenderer'
import type { GlRenderable } from './types'
import { Clear, StencilMode } from './const'
import { GlSystem } from './system'

export type MaskLike = GlRenderable

export interface MaskStackItem {
  source: GlRenderable
  mask: MaskLike
}

export class GlMaskSystem extends GlSystem {
  override install(renderer: GlRenderer): void {
    super.install(renderer)
    renderer.mask = this
  }

  stack: MaskStackItem[] = []
  protected _maskStackHash: Record<number, number> = {}

  get length(): number { return this.stack.length }
  get last(): MaskStackItem { return this.stack[this.length - 1] }

  push(source: GlRenderable, mask: MaskLike): void {
    const data = { source, mask }
    this.stack.push(data)

    const instanceId = this._renderer.renderTarget.current?.instanceId ?? -1
    let index = this._maskStackHash[instanceId] ?? 0

    if ('render' in mask) {
      // pushMaskBegin
      this._renderer.flush()
      this._renderer.renderTarget.ensureDepthStencil()
      this._renderer.stencil.bind(StencilMode.renderingMaskAdd, index)
      this._renderer.colorMask.bind(0)
      index++

      mask.render(this._renderer)
      this._renderer.flush()

      // pushMaskEnd
      this._renderer.stencil.bind(StencilMode.maskActive, index)
      this._renderer.colorMask.bind(0xF)
    }

    this._maskStackHash[instanceId] = index
  }

  pop(source: GlRenderable): void {
    const data = this.stack.pop()

    if (!data || data.source !== source) {
      return
    }

    const { mask } = data

    const instanceId = this._renderer.renderTarget.current?.instanceId ?? -1
    let index = this._maskStackHash[instanceId] ?? 0

    if ('render' in mask) {
      // popMaskBegin
      this._renderer.flush()
      if (index !== 0) {
        this._renderer.stencil.bind(StencilMode.renderingMaskRemove, index)
      }
      else {
        this._renderer.clear(Clear.stencil)
        this._renderer.stencil.bind(StencilMode.disabled, index)
      }
      index--

      mask.render(this._renderer)
      this._renderer.flush()

      // popMaskEnd
      this._renderer.stencil.bind(StencilMode.maskActive, index)
      this._renderer.colorMask.bind(0xF)
    }

    this._maskStackHash[instanceId] = index
  }
}
