import { describe, expect, it } from 'vitest'
import { Element2D } from '../src'

// the table coalesces updates into a microtask; this flushes that.
function flush(): Promise<void> {
  return Promise.resolve()
}

describe('element2DTable', () => {
  it('expands cells into back-layer nodes sized by the grid', () => {
    const el = new Element2D({
      table: {
        columns: [{ width: 100 }, { width: 200 }],
        rows: [{ height: 40 }, { height: 60 }],
        cells: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 1, col: 0 },
          { row: 1, col: 1 },
        ],
      },
    })
    el.table.update()

    const cells = el.getChildren('back') as Element2D[]
    expect(cells).toHaveLength(4)
    // element is sized to the grid extent
    expect(el.size.width).toBe(300)
    expect(el.size.height).toBe(100)
    // cell (row 1, col 1) → width 200 (col 1), height 60 (row 1)
    const c11 = cells[3]
    expect(c11.size.width).toBe(200)
    expect(c11.size.height).toBe(60)
  })

  it('honors colSpan / rowSpan', () => {
    const el = new Element2D({
      table: {
        columns: [{ width: 100 }, { width: 100 }, { width: 100 }],
        rows: [{ height: 50 }, { height: 50 }, { height: 50 }],
        cells: [
          { row: 0, col: 0, colSpan: 3 },
          { row: 1, col: 0, rowSpan: 2 },
        ],
      },
    })
    el.table.update()

    const [header, tall] = el.getChildren('back') as Element2D[]
    expect(header.size.width).toBe(300) // spans all 3 columns
    expect(header.size.height).toBe(50)
    expect(tall.size.height).toBe(100) // spans 2 rows
  })

  it('falls back to default column/row sizes', () => {
    const el = new Element2D({
      table: { columns: [{}], rows: [{}], cells: [{ row: 0, col: 0 }] },
    })
    el.table.update()
    expect(el.size.width).toBe(100) // DEFAULT_COLUMN_WIDTH
    expect(el.size.height).toBe(40) // DEFAULT_ROW_HEIGHT
  })

  it('clears generated cells when disabled', () => {
    const el = new Element2D({
      table: { columns: [{ width: 50 }], rows: [{ height: 50 }], cells: [{ row: 0, col: 0 }] },
    })
    el.table.update()
    expect(el.getChildren('back')).toHaveLength(1)

    el.table.enabled = false
    el.table.update()
    expect(el.getChildren('back')).toHaveLength(0)
  })

  it('does not leak cells into default children or toJSON', () => {
    const el = new Element2D({
      table: { columns: [{ width: 50 }], rows: [{ height: 50 }], cells: [{ row: 0, col: 0 }] },
    })
    el.table.update()
    expect(el.children).toHaveLength(0) // default layer stays empty
    expect(el.getChildren('back')).toHaveLength(1)
    const json = el.toJSON()
    expect(json.children).toBeUndefined() // cells are not serialized
    expect(json.table).toBeTruthy() // the table structure is
  })

  it('reuses cell nodes incrementally across updates', () => {
    const el = new Element2D({
      table: {
        columns: [{ width: 50 }, { width: 50 }],
        rows: [{ height: 50 }],
        cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
      },
    })
    el.table.update()
    const before = (el.getChildren('back') as Element2D[]).slice()

    // change only one cell's background — the node identities must be preserved
    el.table.cells = [
      { row: 0, col: 0, background: { color: '#FF0000FF' } },
      { row: 0, col: 1 },
    ]
    el.table.update()
    const after = el.getChildren('back') as Element2D[]
    expect(after).toHaveLength(2)
    expect(after[0]).toBe(before[0])
    expect(after[1]).toBe(before[1])
  })

  it('removes cells that disappear from the structure', () => {
    const el = new Element2D({
      table: {
        columns: [{ width: 50 }, { width: 50 }],
        rows: [{ height: 50 }],
        cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
      },
    })
    el.table.update()
    expect(el.getChildren('back')).toHaveLength(2)

    el.table.cells = [{ row: 0, col: 0 }]
    el.table.update()
    expect(el.getChildren('back')).toHaveLength(1)
  })

  it('coalesces multiple property changes into one async rebuild', async () => {
    const el = new Element2D()
    el.table = {
      columns: [{ width: 50 }],
      rows: [{ height: 50 }],
      cells: [{ row: 0, col: 0 }],
    }
    // debounced: the rebuild has not run synchronously yet
    expect(el.getChildren('back')).toHaveLength(0)
    await flush()
    // after the microtask, exactly one rebuild produced the cell
    expect(el.getChildren('back')).toHaveLength(1)
  })
})
