import type { NormalizedOutline, Outline } from 'modern-idoc'
import { isNone, normalizeOutline, property } from 'modern-idoc'
import { ViewportTexture } from '../../resources'
import { Element2DFill } from './Element2DFill'
import { getFillDrawOptions } from './utils'

export class Element2DOutline extends Element2DFill {
  @property() declare color?: NormalizedOutline['color']
  @property() declare width?: NormalizedOutline['width']
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
        this.parent.requestDraw()
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
    if (this.image === 'viewport') {
      ctx.strokeStyle = new ViewportTexture()
    }
    else {
      ctx.strokeStyle = this.texture
        ?? this.color
        ?? '#000000FF'
    }
    ctx.lineWidth = this.width || 1
    ctx.lineCap = this.lineCap
    ctx.lineJoin = this.lineJoin
    ctx.stroke({
      ...getFillDrawOptions(this, { x: 0, y: 0, width, height }),
    })
  }
}
