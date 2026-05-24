import type { Chart, NormalizedChart, NormalizedChartSeries } from 'modern-idoc'
import type { Element2D } from './Element2D'
import { isNone, normalizeChart, property } from 'modern-idoc'
import { CoreObject } from '../../../core'
import { Node } from '../../main'

const PALETTE = ['#4A90D9FF', '#5CB85CFF', '#FF6B35FF', '#9B59B6FF', '#F0AD4EFF', '#1ABC9CFF', '#E74C3CFF']
const PADDING = 16

/**
 * Renders an idoc chart by expanding it into positioned Element2D nodes placed in
 * the parent's `back` layer (like Element2DTable) — bars use a background rect, while
 * line/area/pie use a shape SVG path sized 1:1 to the element. Updates are
 * microtask-coalesced. Supports column/bar/line/area/pie/doughnut; scatter/radar
 * fall back to no render. Axis lines / legend / title are not drawn yet.
 */
export class Element2DChart extends CoreObject implements NormalizedChart {
  @property({ fallback: true }) declare enabled: boolean
  @property({ fallback: 'column' }) declare type: NormalizedChart['type']
  @property() declare grouping: NormalizedChart['grouping']
  @property({ fallback: () => [] }) declare categories: NormalizedChart['categories']
  @property({ fallback: () => [] }) declare series: NormalizedChart['series']
  @property() declare title: NormalizedChart['title']
  @property() declare legend: NormalizedChart['legend']
  @property() declare categoryAxis: NormalizedChart['categoryAxis']
  @property() declare valueAxis: NormalizedChart['valueAxis']

  protected _nodes: Node[] = []
  protected _dirty = false
  protected _scheduled = false

  constructor(
    protected _parent: Element2D,
  ) {
    super()
  }

  override setProperties(properties?: Chart): this {
    return super.setProperties(
      isNone(properties)
        ? undefined
        : normalizeChart(properties),
    )
  }

  protected _updateProperty(key: string, value: any, oldValue: any): void {
    super._updateProperty(key, value, oldValue)

    switch (key) {
      case 'enabled':
      case 'type':
      case 'grouping':
      case 'categories':
      case 'series':
      case 'title':
      case 'legend':
      case 'categoryAxis':
      case 'valueAxis':
        this._requestUpdate()
        break
    }
  }

  protected _requestUpdate(): void {
    this._dirty = true
    if (this._scheduled) {
      return
    }
    this._scheduled = true
    queueMicrotask(() => {
      this._scheduled = false
      if (this._dirty && !this.destroyed) {
        this.update()
      }
    })
  }

  isValid(): boolean {
    return Boolean(this.enabled && this.series.some(s => s.values.length))
  }

  protected _color(i: number, series: NormalizedChartSeries): string {
    return series.color ?? PALETTE[i % PALETTE.length]
  }

  protected _clear(): void {
    for (const node of this._nodes) {
      this._parent.removeChild(node)
      node.destroy()
    }
    this._nodes.length = 0
  }

  protected _add(props: Record<string, any>): void {
    const node = Node.parse({ is: 'Element2D', ...props }, 'Element2D') as Node
    this._parent.appendChild(node, 'back')
    this._nodes.push(node)
  }

  /** Value range across all series, honoring axis min/max; baseline defaults to 0. */
  protected _range(): [number, number] {
    let lo = Infinity
    let hi = -Infinity
    for (const s of this.series) {
      for (const v of s.values) {
        lo = Math.min(lo, v)
        hi = Math.max(hi, v)
      }
    }
    if (!Number.isFinite(lo)) {
      lo = 0
      hi = 1
    }
    const min = this.valueAxis?.min ?? Math.min(0, lo)
    let max = this.valueAxis?.max ?? hi
    if (max <= min) {
      max = min + 1
    }
    return [min, max]
  }

  update(): void {
    this._dirty = false
    this._clear()

    if (!this.isValid()) {
      this._parent.requestDraw()
      return
    }
    const { width, height } = this._parent.size
    if (!width || !height) {
      this._parent.requestDraw()
      return
    }

    const x = PADDING
    const y = PADDING
    const w = Math.max(width - PADDING * 2, 1)
    const h = Math.max(height - PADDING * 2, 1)

    switch (this.type) {
      case 'bar':
        this._drawBars(x, y, w, h, true)
        break
      case 'line':
      case 'area':
        this._drawLines(width, height, x, y, w, h, this.type === 'area')
        break
      case 'pie':
      case 'doughnut':
        this._drawPie(width, height, x, y, w, h, this.type === 'doughnut')
        break
      case 'column':
        this._drawBars(x, y, w, h, false)
        break
      default:
        // scatter / radar not supported yet
        break
    }

    this._parent.requestDraw()
  }

  protected _drawBars(x: number, y: number, w: number, h: number, horizontal: boolean): void {
    const [min, max] = this._range()
    const span = max - min
    const count = Math.max(this.categories.length, ...this.series.map(s => s.values.length), 1)
    const seriesCount = this.series.length || 1
    const axisLen = horizontal ? h : w
    const group = axisLen / count
    const barThickness = (group * 0.8) / seriesCount
    const groupPad = (group * 0.2) / 2

    for (let si = 0; si < this.series.length; si++) {
      const s = this.series[si]
      const color = this._color(si, s)
      for (let ci = 0; ci < s.values.length; ci++) {
        const ratio = (s.values[ci] - min) / span
        const length = Math.max(ratio * (horizontal ? w : h), 0)
        const offset = ci * group + groupPad + si * barThickness
        const style = horizontal
          ? { left: x, top: y + offset, width: length, height: barThickness }
          : { left: x + offset, top: y + h - length, width: barThickness, height: length }
        this._add({ style, background: { color } })
      }
    }
  }

  protected _drawLines(vw: number, vh: number, x: number, y: number, w: number, h: number, area: boolean): void {
    const [min, max] = this._range()
    const span = max - min
    const count = Math.max(...this.series.map(s => s.values.length), 1)
    const stepX = count > 1 ? w / (count - 1) : 0

    for (let si = 0; si < this.series.length; si++) {
      const s = this.series[si]
      const color = this._color(si, s)
      const pts = s.values.map((v, i) => {
        const px = x + (count > 1 ? i * stepX : w / 2)
        const py = y + h - ((v - min) / span) * h
        return [px, py] as const
      })
      if (!pts.length) {
        continue
      }
      let d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ')
      if (area) {
        d += ` L ${pts[pts.length - 1][0]} ${y + h} L ${pts[0][0]} ${y + h} Z`
      }
      // viewBox matches the element so absolute pixel coords render 1:1
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} ${vh}"><path d="${d}"/></svg>`
      this._add({
        style: { left: 0, top: 0, width: vw, height: vh },
        shape: { svg },
        ...(area
          ? { fill: { color }, outline: { color, width: 2 } }
          : { outline: { color, width: 2 } }),
      })
    }
  }

  protected _drawPie(vw: number, vh: number, x: number, y: number, w: number, h: number, doughnut: boolean): void {
    // pie uses the first series' values as slices
    const s = this.series[0]
    if (!s?.values.length) {
      return
    }
    const total = s.values.reduce((sum, v) => sum + Math.max(v, 0), 0) || 1
    const cx = x + w / 2
    const cy = y + h / 2
    const r = Math.min(w, h) / 2
    const ir = doughnut ? r * 0.55 : 0
    let angle = -Math.PI / 2 // start at top

    for (let i = 0; i < s.values.length; i++) {
      const value = Math.max(s.values[i], 0)
      const sweep = (value / total) * Math.PI * 2
      const a0 = angle
      const a1 = angle + sweep
      angle = a1
      const large = sweep > Math.PI ? 1 : 0
      const ox0 = cx + r * Math.cos(a0)
      const oy0 = cy + r * Math.sin(a0)
      const ox1 = cx + r * Math.cos(a1)
      const oy1 = cy + r * Math.sin(a1)
      let d: string
      if (doughnut) {
        const ix1 = cx + ir * Math.cos(a1)
        const iy1 = cy + ir * Math.sin(a1)
        const ix0 = cx + ir * Math.cos(a0)
        const iy0 = cy + ir * Math.sin(a0)
        d = `M ${ox0} ${oy0} A ${r} ${r} 0 ${large} 1 ${ox1} ${oy1} L ${ix1} ${iy1} A ${ir} ${ir} 0 ${large} 0 ${ix0} ${iy0} Z`
      }
      else {
        d = `M ${cx} ${cy} L ${ox0} ${oy0} A ${r} ${r} 0 ${large} 1 ${ox1} ${oy1} Z`
      }
      const color = s.color && s.values.length === 1 ? s.color : PALETTE[i % PALETTE.length]
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} ${vh}"><path d="${d}"/></svg>`
      this._add({
        style: { left: 0, top: 0, width: vw, height: vh },
        shape: { svg },
        fill: { color },
      })
    }
  }

  protected override _destroy(): void {
    this._clear()
  }
}
