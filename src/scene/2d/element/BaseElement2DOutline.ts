import type { NormalizedOutline, Outline } from 'modern-idoc'
import { isNone, normalizeOutline, property } from 'modern-idoc'
import { ViewportTexture } from '../../resources'
import { BaseElement2DFill } from './BaseElement2DFill'
import { getDrawOptions } from './utils'

export class BaseElement2DOutline extends BaseElement2DFill {
  @property({ fallback: '#00000000' }) declare color: NormalizedOutline['color']
  @property({ fallback: 0 }) declare width: NormalizedOutline['width']
  @property({ fallback: 'solid' }) declare style: NormalizedOutline['style']
  @property({ fallback: 'butt' }) declare lineCap: NormalizedOutline['lineCap']
  @property({ fallback: 'miter' }) declare lineJoin: NormalizedOutline['lineJoin']

  override setProperties(properties?: Outline): this {
    return super._setProperties(
      isNone(properties)
        ? undefined
        : normalizeOutline(properties),
    )
  }

  protected _updateProperty(key: string, value: any, oldValue: any): void {
    super._updateProperty(key, value, oldValue)

    switch (key) {
      case 'width':
      case 'style':
      case 'lineCap':
      case 'lineJoin':
      case 'enabled':
        this.parent.requestRedraw()
        break
    }
  }

  isValid(): boolean {
    return Boolean(
      this.enabled && (
        this.width
        || this.color
        || super.isValid()
      ),
    )
  }

  draw(): void {
    const { width, height } = this.parent.size
    const ctx = this.parent.context
    let uvTransform
    let disableWrapMode = false
    if (this.image === 'viewport') {
      ctx.fillStyle = new ViewportTexture()
    }
    else {
      ({ uvTransform, disableWrapMode } = getDrawOptions(this, { width, height }))
      ctx.fillStyle = this.animatedTexture?.currentFrame.texture
        ?? this.texture
        ?? this.color
    }
    ctx.lineWidth = this.width || 1
    ctx.strokeStyle = this.texture ?? this.color
    ctx.lineCap = this.lineCap
    ctx.lineJoin = this.lineJoin
    ctx.stroke({
      uvTransform,
      disableWrapMode,
    })
  }
}
