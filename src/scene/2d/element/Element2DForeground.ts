import type { Foreground, NormalizedEffect, NormalizedForeground } from 'modern-idoc'
import { isNone, normalizeForeground, property } from 'modern-idoc'
import { CanvasTexture } from '../../resources'
import { bakeImageEffects } from './bakeImageEffects'
import { Element2DFill } from './Element2DFill'

export class Element2DForeground extends Element2DFill implements NormalizedForeground {
  @property() declare fillWithShape: NormalizedForeground['fillWithShape']
  /** 图片效果叠层（filling/strokes/offset...）；加载后烘焙到运行时 canvas，不持久化 */
  @property() declare effects?: NormalizedEffect[]

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
    if (!source || typeof source.width !== 'number')
      return
    const w = source.width
    const h = source.height
    const canvas = bakeImageEffects(source, this.effects, w, h)
    this.texture = new CanvasTexture({ source: canvas, width: w, height: h })
  }
}
