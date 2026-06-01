import type { HeadEnd, NormalizedOutline, Outline, TailEnd } from 'modern-idoc'
import type { Vector2Like } from 'modern-path2d'
import { isNone, normalizeOutline, property } from 'modern-idoc'
import { ViewportTexture } from '../../resources'
import { Element2DFill } from './Element2DFill'
import { getFillDrawOptions } from './utils'

// Line-end ('sm' | 'md' | 'lg') in units of outline width. 'md' is the default.
const LINE_END_SIZE_FACTOR: Record<string, number> = { sm: 4, md: 6, lg: 8 }

export class Element2DOutline extends Element2DFill implements NormalizedOutline {
  @property() declare color?: NormalizedOutline['color']
  @property() declare width?: NormalizedOutline['width']
  @property({ fallback: 'solid' }) declare style: NormalizedOutline['style']
  @property({ fallback: 'butt' }) declare lineCap: NormalizedOutline['lineCap']
  @property({ fallback: 'miter' }) declare lineJoin: NormalizedOutline['lineJoin']
  @property() declare headEnd?: HeadEnd
  @property() declare tailEnd?: TailEnd

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
      case 'headEnd':
      case 'tailEnd':
      case 'enabled':
        this._parent.requestDraw()
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
    const { width, height } = this._parent.size
    const ctx = this._parent.context
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

    // Filled markers at the polyline's endpoints. Only routed connections set a
    // local path; for other shapes (closed rects/ellipses) there is no
    // unambiguous head/tail, so we skip.
    if (this.headEnd || this.tailEnd) {
      this._drawLineEnds()
    }
  }

  protected _drawLineEnds(): void {
    const path = this._parent.shape.localPath
    const segs = path?.curves[0]?.curves as { p1: Vector2Like, p2: Vector2Like }[] | undefined
    if (!segs?.length)
      return

    const strokeWidth = this.width || 1
    const fillColor = this.color ?? '#000000FF'

    if (this.headEnd) {
      const last = segs[segs.length - 1]
      this._fillEnd(last.p2, last.p1, this.headEnd, strokeWidth, fillColor)
    }
    if (this.tailEnd) {
      const first = segs[0]
      this._fillEnd(first.p1, first.p2, this.tailEnd, strokeWidth, fillColor)
    }
  }

  // Draw a triangle endpoint marker with `tip` at the path end and the base
  // pointing back along (anchor → tip). Other LineEndType values fall back to
  // the triangle shape for now — the data model accepts them but the renderer
  // only differentiates triangles here.
  protected _fillEnd(
    tip: Vector2Like,
    anchor: Vector2Like,
    end: HeadEnd | TailEnd,
    strokeWidth: number,
    color: string,
  ): void {
    const dx = tip.x - anchor.x
    const dy = tip.y - anchor.y
    const len = Math.hypot(dx, dy)
    if (len < 1e-3)
      return

    const factor = LINE_END_SIZE_FACTOR[String(end.width ?? end.height ?? 'md')] ?? 6
    const arrowLen = strokeWidth * factor
    const arrowHalf = strokeWidth * factor * 0.5

    // unit tangent (toward tip) and the perpendicular for the triangle base
    const tx = dx / len
    const ty = dy / len
    const baseX = tip.x - tx * arrowLen
    const baseY = tip.y - ty * arrowLen
    const px = -ty * arrowHalf
    const py = tx * arrowHalf

    const ctx = this._parent.context
    ctx.fillStyle = color
    ctx
      .moveTo(tip.x, tip.y)
      .lineTo(baseX + px, baseY + py)
      .lineTo(baseX - px, baseY - py)
      .closePath()
      .fill()
  }
}
