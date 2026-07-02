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

    // unit tangent (toward tip) and the perpendicular
    const tx = dx / len
    const ty = dy / len

    const factor = LINE_END_SIZE_FACTOR[String(end.width ?? end.height ?? 'md')] ?? 6
    const ctx = this._parent.context
    const endColor = (end as any).color ?? color

    // 'bar'：垂直于线端切线的短竖线端点标记（如工作流连接点）。以 tip 为中心、
    // 沿切线取厚度、沿法线取长度，画一个矩形。
    if ((end as unknown as { type?: string }).type === 'bar') {
      const half = strokeWidth * factor * 0.6 // 竖线半长
      const thick = Math.max(strokeWidth * 0.9, 1.5) // 竖线厚度（沿轴）
      // 把切线吸附到最近的坐标轴，使端点标记对齐节点边缘（左右端口→竖直、上下端口→水平），
      // 不随曲线到端点的斜率歪掉。
      let ax = 0
      let ay = 0
      if (Math.abs(tx) >= Math.abs(ty)) {
        ax = Math.sign(tx) || 1
      }
      else {
        ay = Math.sign(ty) || 1
      }
      const nx = -ay * half // 沿轴法线取半长
      const ny = ax * half
      const hx = ax * (thick / 2) // 沿轴取半厚
      const hy = ay * (thick / 2)
      ctx.fillStyle = endColor
      ctx
        .moveTo(tip.x + nx - hx, tip.y + ny - hy)
        .lineTo(tip.x - nx - hx, tip.y - ny - hy)
        .lineTo(tip.x - nx + hx, tip.y - ny + hy)
        .lineTo(tip.x + nx + hx, tip.y + ny + hy)
        .closePath()
        .fill()
      return
    }

    const arrowLen = strokeWidth * factor
    const arrowHalf = strokeWidth * factor * 0.5
    const baseX = tip.x - tx * arrowLen
    const baseY = tip.y - ty * arrowLen
    const px = -ty * arrowHalf
    const py = tx * arrowHalf

    ctx.fillStyle = endColor
    ctx
      .moveTo(tip.x, tip.y)
      .lineTo(baseX + px, baseY + py)
      .lineTo(baseX - px, baseY - py)
      .closePath()
      .fill()
  }
}
