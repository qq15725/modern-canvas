import type { Foreground, NormalizedEffect, NormalizedForeground } from 'modern-idoc'
import { isNone, normalizeForeground, property } from 'modern-idoc'
import { createHTMLCanvas } from '../../../core'
import { CanvasTexture } from '../../resources'
import { bakeImageEffects } from './bakeImageEffects'
import { Element2DFill } from './Element2DFill'

export class Element2DForeground extends Element2DFill implements NormalizedForeground {
  @property() declare fillWithShape: NormalizedForeground['fillWithShape']
  /** 图片效果叠层（filling/strokes/offset...）；加载后烘焙到运行时 canvas，不持久化 */
  @property() declare effects?: NormalizedEffect[]

  /**
   * 原图的 CPU 副本（HTMLCanvas），在纹理刚加载、source 仍存活时拍下。
   * 用于烘焙 effects：纹理的 ImageBitmap source 上传 GPU 后可能被
   * `close()`（detached，width/height 归零），此时直接 drawImage 会抛
   * InvalidStateError，故始终从这份不会失效的副本烘焙。
   */
  protected _sourceCanvas?: HTMLCanvasElement

  override setProperties(properties?: Foreground): this {
    return super._setProperties(
      isNone(properties)
        ? undefined
        : normalizeForeground(properties),
    )
  }

  protected _updateProperty(key: string, value: any, oldValue: any): void {
    super._updateProperty(key, value, oldValue)

    switch (key) {
      case 'fillWithShape':
        this._parent.requestDraw()
        break
      case 'effects':
        // 重新加载并按新 effects 烘焙
        this._updateTexture()
        break
    }
  }

  override async loadTexture(): Promise<void> {
    await super.loadTexture()
    this._applyEffects()
  }

  /** 把原纹理 + effects 烘焙成一张运行时 canvas，包成 CanvasTexture（gif/无 effects 时跳过） */
  protected _applyEffects(): void {
    if (!this.effects?.length || this.animatedTexture || !this.texture)
      return
    const source = this.texture.source as any
    // source 存活（未被 close）时刷新 CPU 副本；detached 的 ImageBitmap
    // 其 width/height 为 0，此时退回上一份副本，避免 drawImage 抛错。
    if (source && source.width > 0 && source.height > 0) {
      const w = Math.max(1, Math.round(source.width))
      const h = Math.max(1, Math.round(source.height))
      const snapshot = createHTMLCanvas(w, h)
      const ctx = snapshot?.getContext('2d')
      if (snapshot && ctx) {
        ctx.drawImage(source, 0, 0, w, h)
        this._sourceCanvas = snapshot
      }
    }
    const base = this._sourceCanvas
    if (!base)
      return
    const w = base.width
    const h = base.height
    const canvas = bakeImageEffects(base, this.effects, w, h)
    this.texture = new CanvasTexture({ source: canvas, width: w, height: h })
  }
}
