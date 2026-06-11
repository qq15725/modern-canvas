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
   * 刻意不读 `this.texture.source`：那张 ImageBitmap 由纹理管线持有，会经 GPU
   * 上传（premultiply）/ 资源 GC 而被消费或 `close()`，其内容与尺寸随运行环境
   * （含 headless / 自定义 canvas factory）漂移——实测过空白、尺寸异常（如
   * 3552×3552 全透明）。这份副本一律由 `_resolveSourceCanvas` 从 image 独立解码，
   * 与 GPU 纹理生命周期彻底解耦。
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

  /** 把原图 + effects 烘焙成一张运行时纹理（gif/无 effects 时跳过） */
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
    const patterns = await this._resolvePatterns()
    const canvas = bakeImageEffects(base, this.effects, w, h, patterns)
    // 必须用普通 Texture2D 包裹烘焙结果，不能用 CanvasTexture：后者在设置
    // width/height 时会 `source.width = ...` 重设 canvas，从而清空已烘焙的像素 → 前景空白。
    this.texture = new Texture2D({ source: canvas, width: w, height: h, uploadMethodId: 'image' })
  }

  /**
   * 预解码 effects 里 fill.image 用到的图案。烘焙是同步的，图案须先就绪；
   * 按 url 在资源层缓存复用，未提供的图案在烘焙时会被跳过（不重上色）。
   */
  protected async _resolvePatterns(): Promise<Record<string, HTMLCanvasElement>> {
    const patterns: Record<string, HTMLCanvasElement> = {}
    for (const effect of this.effects ?? []) {
      const image = (effect.fill as { image?: string } | undefined)?.image
      if (!image || isNone(image) || patterns[image])
        continue
      const canvas = await assets.loadBy(`${image}#mc-foreground-pattern`, async () => {
        const bitmap = await assets.fetchImageBitmap(image)
        const snapshot = this._snapshot(bitmap as unknown as Snapshotable)
        if (SUPPORTS_IMAGE_BITMAP && bitmap instanceof ImageBitmap)
          bitmap.close()
        return snapshot
      })
      if (canvas)
        patterns[image] = canvas
    }
    return patterns
  }

  /**
   * 取得用于烘焙的 CPU 副本：始终从 image 独立解码一份（createImageBitmap 保证解码
   * 就绪），快照进 canvas，按 url 在资源层缓存复用。不读 `this.texture.source`——见
   * `_sourceCanvas` 注释。只缓存真正拿到的副本，避免把空/未就绪结果钉死。
   */
  protected async _resolveSourceCanvas(): Promise<HTMLCanvasElement | undefined> {
    if (this._sourceImage !== this.image) {
      this._sourceCanvas = undefined
      this._sourceImage = this.image
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
    // 只缓存真正拿到的副本，避免把空/未就绪结果钉死
    if (this._sourceImage === url && canvas)
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
