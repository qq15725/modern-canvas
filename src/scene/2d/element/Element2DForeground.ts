import type { Foreground, NormalizedEffect, NormalizedForeground } from 'modern-idoc'
import { isNone, normalizeForeground, property } from 'modern-idoc'
import { assets } from '../../../asset'
import { createHTMLCanvas, SUPPORTS_IMAGE_BITMAP } from '../../../core'
import { Texture2D } from '../../resources'
import { bakeImageEffects } from './bakeImageEffects'
import { Element2DFill } from './Element2DFill'

type Snapshotable = CanvasImageSource & { width: number, height: number }

export class Element2DForeground extends Element2DFill implements NormalizedForeground {
  @property() declare fillWithShape: NormalizedForeground['fillWithShape']
  /** 图片效果叠层（filling/strokes/offset...）；加载后烘焙到运行时 canvas，不持久化 */
  @property() declare effects?: NormalizedEffect[]

  /**
   * 原图的 CPU 副本（HTMLCanvas），供烘焙 effects 使用。
   *
   * 不能依赖 `this.texture.source`：那是张 ImageBitmap，经 GPU 上传 / 资源 GC 后
   * 会被 `close()`（detached，width/height 归零），此时 drawImage 会抛
   * `InvalidStateError`。实测纹理加载返回时 source 往往已是 detached，故这份副本
   * 必须从图片自身独立解码（见 `_resolveSourceCanvas`），与 GPU 纹理生命周期解耦。
   */
  protected _sourceCanvas?: HTMLCanvasElement
  /** `_sourceCanvas` 对应的图片地址，image 变更时用于失效旧副本 */
  protected _sourceImage?: string

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
    await this._applyEffects()
  }

  /** 把原图 + effects 烘焙成一张运行时 canvas，包成 CanvasTexture（gif/无 effects 时跳过） */
  protected async _applyEffects(): Promise<void> {
    if (!this.effects?.length || this.animatedTexture || !this.texture) {
      this._sourceCanvas = undefined
      this._sourceImage = undefined
      return
    }
    const base = await this._resolveSourceCanvas()
    if (!base)
      return
    const w = base.width
    const h = base.height
    const canvas = bakeImageEffects(base, this.effects, w, h)
    // 必须用普通 Texture2D 包裹烘焙结果，不能用 CanvasTexture：后者在设置
    // width/height 时会 `source.width = ...` 重设 canvas，从而清空已烘焙的像素 → 前景空白。
    this.texture = new Texture2D({ source: canvas, width: w, height: h, uploadMethodId: 'image' })
  }

  /**
   * 取得用于烘焙的 CPU 副本：
   * 1) 若纹理 source 仍存活（width>0），直接快照（省一次解码）；
   * 2) 否则从 image 重新解码一份（资源层按 url 缓存复用，避免重复烘焙时反复解码）。
   */
  protected async _resolveSourceCanvas(): Promise<HTMLCanvasElement | undefined> {
    if (this._sourceImage !== this.image) {
      this._sourceCanvas = undefined
      this._sourceImage = this.image
    }

    const live = this.texture?.source as Snapshotable | undefined
    if (live && live.width > 0 && live.height > 0) {
      return (this._sourceCanvas = this._snapshot(live))
    }

    if (this._sourceCanvas)
      return this._sourceCanvas

    if (isNone(this.image) || this.image === 'viewport')
      return undefined

    const url = this.image
    const canvas = await assets.loadBy(`${url}#mc-foreground-source`, async () => {
      const bitmap = await assets.fetchImageBitmap(url)
      const snapshot = this._snapshot(bitmap as unknown as Snapshotable)
      if (SUPPORTS_IMAGE_BITMAP && bitmap instanceof ImageBitmap)
        bitmap.close()
      return snapshot
    })
    if (this._sourceImage === url)
      this._sourceCanvas = canvas
    return canvas
  }

  /** 把一张存活的图源画进新 canvas（不会被 close，可反复用于烘焙） */
  protected _snapshot(source: Snapshotable): HTMLCanvasElement | undefined {
    const w = Math.max(1, Math.round(source.width))
    const h = Math.max(1, Math.round(source.height))
    const canvas = createHTMLCanvas(w, h)
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx)
      return undefined
    ctx.drawImage(source, 0, 0, w, h)
    return canvas
  }
}
