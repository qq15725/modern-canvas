import type { Chart, NormalizedChart } from 'modern-idoc'
import type { Element2D } from './Element2D'
import { isNone, normalizeChart, property } from 'modern-idoc'
import { Transform2D } from 'modern-path2d'
import { CoreObject } from '../../../core'
import { CanvasTexture } from '../../resources'

// echarts is an optional peer dependency, loaded lazily so it's never bundled or
// required unless charts are actually used. A single shared import promise so
// concurrent charts all await the same load.
let _echartsPromise: Promise<any> | undefined

function loadECharts(): Promise<any> {
  if (!_echartsPromise) {
    _echartsPromise = import('echarts')
      .then((mod: any) => (mod?.init ? mod : mod?.default))
      .catch(() => undefined)
  }
  return _echartsPromise
}

function legendOption(legend: NormalizedChart['legend']): Record<string, any> {
  if (!legend) {
    return { show: false }
  }
  switch (legend) {
    case 'bottom': return { show: true, bottom: 8 }
    case 'left': return { show: true, left: 8, orient: 'vertical' }
    case 'right': return { show: true, right: 8, orient: 'vertical' }
    case 'top':
    default: return { show: true, top: 8 }
  }
}

/**
 * Renders an idoc chart with echarts (optional dependency). echarts draws into an
 * offscreen canvas, which is uploaded as a CanvasTexture and drawn directly onto the
 * parent element in `draw()` — the same way fill/background paint a texture, so the
 * chart is the element's own content (no extra child node). Updates are
 * microtask-coalesced. Without echarts installed, charts render nothing (warned once).
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

  protected _instance?: any // echarts instance
  protected _container?: HTMLElement
  protected _texture?: CanvasTexture
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
        void this.update()
      }
    })
  }

  isValid(): boolean {
    return Boolean(this.enabled && this.series.some(s => s.values.length))
  }

  /** Render with echarts into the offscreen canvas backing `_texture`. */
  async update(): Promise<void> {
    this._dirty = false
    const { width, height } = this._parent.size

    if (!this.isValid() || !width || !height) {
      this._teardown()
      this._parent.requestDraw()
      return
    }

    const echarts = await loadECharts()
    if (!echarts) {
      console.warn('[modern-canvas] chart rendering requires the optional "echarts" dependency (e.g. `pnpm add echarts`)')
      // 不再静默空白：画一个占位提示，让缺少可选依赖这件事在画布上可见。
      this._renderPlaceholder(width, height)
      return
    }
    // a later update / destroy may have run while awaiting the import
    if (this.destroyed || !this.isValid()) {
      return
    }

    if (!this._instance) {
      if (typeof document === 'undefined') {
        console.warn('[modern-canvas] echarts chart rendering requires a DOM environment')
        return
      }
      this._container = document.createElement('div')
      this._instance = echarts.init(this._container, undefined, { renderer: 'canvas', width, height })
      this._instance.on('finished', () => {
        this._texture?.requestUpdate('source')
        this._parent.requestDraw()
      })
    }

    this._instance.resize({ width, height })
    this._instance.setOption(this._toOption(), true) // builds + renders the canvas

    if (!this._texture) {
      // echarts builds its canvas lazily on first render, so grab it after setOption
      const canvas = this._container!.querySelector('canvas') as HTMLCanvasElement | null
      if (!canvas) {
        return
      }
      this._texture = new CanvasTexture({ source: canvas, pixelRatio: 1 })
    }

    this._texture.requestUpdate('source')
    this._parent.requestDraw()
  }

  /** echarts 缺失时画一个虚线框 + 文案的占位纹理，而非静默空白。 */
  protected _renderPlaceholder(width: number, height: number): void {
    if (typeof document === 'undefined' || !width || !height) {
      return
    }
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(width)
    canvas.height = Math.ceil(height)
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }
    ctx.fillStyle = '#f3f4f6'
    ctx.fillRect(0, 0, width, height)
    ctx.strokeStyle = '#d1d5db'
    ctx.setLineDash([6, 4])
    ctx.strokeRect(1, 1, width - 2, height - 2)
    ctx.fillStyle = '#9ca3af'
    ctx.font = '14px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('图表需安装 echarts', width / 2, height / 2)
    if (!this._texture) {
      this._texture = new CanvasTexture({ source: canvas, pixelRatio: 1 })
    }
    else {
      this._texture.source = canvas
    }
    this._texture.requestUpdate('source')
    this._parent.requestDraw()
  }

  /** Paint the echarts texture onto the element, like fill/background do. */
  draw(): void {
    const texture = this._texture
    if (!texture?.isValid()) {
      return
    }
    const { width, height } = this._parent.size
    const ctx = this._parent.context
    this._parent.shape.draw(true) // element rect geometry
    ctx.fillStyle = texture
    const { a, c, tx, b, d, ty } = new Transform2D().scale(1 / width, 1 / height)
    let x, y
    ctx.fill({
      transformUv: (uvs, i) => {
        x = uvs[i]
        y = uvs[i + 1]
        uvs[i] = (a * x) + (c * y) + tx
        uvs[i + 1] = (b * x) + (d * y) + ty
      },
    })
  }

  /** Map the normalized idoc chart to an echarts option. */
  protected _toOption(): Record<string, any> {
    const { type, categories: cat } = this
    const pie = type === 'pie' || type === 'doughnut'
    const horizontal = type === 'bar'
    const stack = this.grouping === 'stacked' || this.grouping === 'percentStacked'

    const option: Record<string, any> = {
      title: this.title ? { text: this.title, left: 'center' } : undefined,
      legend: legendOption(this.legend),
      tooltip: {},
    }

    if (pie) {
      const s = this.series[0]
      option.series = [{
        type: 'pie',
        radius: type === 'doughnut' ? ['45%', '70%'] : '70%',
        data: (s?.values ?? []).map((v, i) => ({ value: v, name: cat[i] ?? String(i) })),
      }]
      return option
    }

    const valueAxis = {
      type: 'value',
      show: this.valueAxis?.visible !== false,
      name: this.valueAxis?.title,
      min: this.valueAxis?.min,
      max: this.valueAxis?.max,
    }
    const categoryAxis = {
      type: 'category',
      data: cat,
      show: this.categoryAxis?.visible !== false,
      name: this.categoryAxis?.title,
    }
    option.xAxis = horizontal ? valueAxis : categoryAxis
    option.yAxis = horizontal ? categoryAxis : valueAxis

    const seriesType = type === 'column' || type === 'bar'
      ? 'bar'
      : type === 'area'
        ? 'line'
        : type // line / scatter / radar pass through

    option.series = this.series.map(s => ({
      name: s.name,
      type: seriesType,
      data: type === 'scatter' && s.xValues
        ? s.values.map((v, i) => [s.xValues![i], v])
        : s.values,
      stack: stack ? 'total' : undefined,
      areaStyle: type === 'area' ? {} : undefined,
      itemStyle: s.color ? { color: s.color } : undefined,
    }))
    return option
  }

  protected _teardown(): void {
    this._instance?.dispose()
    this._instance = undefined
    this._container = undefined
    this._texture = undefined
  }

  protected override _destroy(): void {
    this._teardown()
  }
}
