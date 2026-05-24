import { Engine } from '../../src'

// Demonstrates the idoc `chart` structure: Element2DChart expands a chart into
// positioned Element2D nodes (bars = background rects, line/area/pie = shape paths)
// in the parent's back layer. Covers column / bar / line / area / pie / doughnut.

async function init(): Promise<void> {
  const engine = new Engine({ autoStart: true, autoResize: true })
  ;(window as any).engine = engine
  document.body.append(engine.view!)

  const categories = ['Q1', 'Q2', 'Q3', 'Q4']
  const series = [
    { name: 'North', values: [120, 150, 90, 170], color: '#4A90D9FF' },
    { name: 'South', values: [80, 110, 130, 100], color: '#5CB85CFF' },
  ]

  const at = (left: number, top: number, w: number, h: number, chart: Record<string, any>): Record<string, any> => ({
    is: 'Element2D',
    style: { left, top, width: w, height: h },
    outline: { color: '#E5E7EBFF', width: 1 },
    chart,
  })

  engine.root.append([
    at(40, 40, 320, 200, { type: 'column', categories, series }),
    at(400, 40, 320, 200, { type: 'bar', categories, series }),
    at(760, 40, 320, 200, { type: 'line', categories, series }),
    at(40, 280, 320, 200, { type: 'area', categories, series: [series[0]] }),
    at(400, 280, 220, 220, { type: 'pie', categories, series: [{ values: [30, 25, 20, 25] }] }),
    at(660, 280, 220, 220, { type: 'doughnut', categories, series: [{ values: [40, 35, 25] }] }),
  ])
}

init()
