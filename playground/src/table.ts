import { fonts } from 'modern-font'
import { Engine } from '../../src'

// Demonstrates the idoc `table` structure: each cell is expanded into a positioned
// Element2D (grid layout from column widths / row heights), with cell background,
// borders (via cell.style) and nested text children. Includes a colSpan header.

async function init(): Promise<void> {
  const engine = new Engine({ autoStart: true, autoResize: true })
  ;(window as any).engine = engine
  document.body.append(engine.view!)

  await fonts.loadFallbackFont({ family: 'fallbackFont', src: '/fonts/AaHouDiHei.woff' })

  engine.on('pointerdown', (e: any) => {
    // eslint-disable-next-line no-console
    console.log('hit:', e.target?.id, e.target)
  })

  const colW = 180
  const rowH = 56

  // a text element that fills its cell and centers the text
  const cell = (text: string, w: number, h: number, style: Record<string, any> = {}): Record<string, any> => ({
    is: 'Element2D',
    style: {
      width: w,
      height: h,
      textAlign: 'center', // horizontal
      verticalAlign: 'middle', // vertical — flex align* doesn't affect a node's own text
      fontSize: 18,
      color: '#1F2937FF',
      ...style,
    },
    text,
  })

  const border = { borderWidth: 1, borderColor: '#CBD5E1FF' }

  engine.root.append([
    {
      is: 'Element2D',
      style: { left: 80, top: 80 },
      table: {
        columns: [{ width: colW }, { width: colW }, { width: colW }],
        rows: [{ height: rowH }, { height: rowH }, { height: rowH }, { height: rowH }],
        cells: [
          // header spanning all 3 columns
          {
            row: 0,
            col: 0,
            colSpan: 3,
            background: { color: '#4A90D9FF' },
            style: { borderWidth: 1, borderColor: '#FFFFFF66' },
            children: [cell('Quarterly Report', colW * 3, rowH, { fontSize: 22, color: '#FFFFFFFF' })],
          },
          // column headers
          { row: 1, col: 0, background: { color: '#EFF6FFFF' }, style: border, children: [cell('Region', colW, rowH, { fontSize: 18, color: '#1E3A8AFF' })] },
          { row: 1, col: 1, background: { color: '#EFF6FFFF' }, style: border, children: [cell('Q1', colW, rowH, { color: '#1E3A8AFF' })] },
          { row: 1, col: 2, background: { color: '#EFF6FFFF' }, style: border, children: [cell('Q2', colW, rowH, { color: '#1E3A8AFF' })] },
          // data rows
          { row: 2, col: 0, style: border, children: [cell('North', colW, rowH)] },
          { row: 2, col: 1, style: border, children: [cell('$1.2M', colW, rowH)] },
          { row: 2, col: 2, style: border, children: [cell('$1.5M', colW, rowH)] },
          { row: 3, col: 0, style: border, children: [cell('South', colW, rowH)] },
          { row: 3, col: 1, style: border, children: [cell('$0.9M', colW, rowH)] },
          { row: 3, col: 2, style: border, children: [cell('$1.1M', colW, rowH)] },
        ],
      },
    },
  ])
}

init()
