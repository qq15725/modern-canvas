import type { NormalizedTable, NormalizedTableCell, Table } from 'modern-idoc'
import type { Element2D } from './Element2D'
import { isNone, normalizeTable, property } from 'modern-idoc'
import { CoreObject } from '../../../core'
import { Node } from '../../main'

const DEFAULT_COLUMN_WIDTH = 100
const DEFAULT_ROW_HEIGHT = 40

interface CellRect { left: number, top: number, width: number, height: number }

/**
 * Renders an idoc table by expanding each cell into a positioned `Element2D`
 * placed in the parent's `back` layer — so cells render and hit-test like normal
 * nodes but never leak into the user's `children` or `toJSON`.
 *
 * Updates are coalesced (multiple property changes in one tick → one rebuild) and
 * incremental: cell nodes are keyed by `row:col` and reused; only cells whose
 * content or geometry changed are re-applied, and only removed cells are destroyed.
 */
export class Element2DTable extends CoreObject implements NormalizedTable {
  @property({ fallback: true }) declare enabled: boolean
  @property({ fallback: () => [] }) declare columns: NormalizedTable['columns']
  @property({ fallback: () => [] }) declare rows: NormalizedTable['rows']
  @property({ fallback: () => [] }) declare cells: NormalizedTable['cells']

  /** Generated cell nodes keyed by `row:col`, for incremental reuse. */
  protected _cellNodes = new Map<string, Element2D>()
  /** Per-cell content+geometry snapshot, to skip unchanged cells. */
  protected _cellSnapshots = new Map<string, string>()
  protected _dirty = false
  protected _flushScheduled = false

  constructor(
    protected _parent: Element2D,
  ) {
    super()
  }

  override setProperties(properties?: Table): this {
    return super.setProperties(
      isNone(properties)
        ? undefined
        : normalizeTable(properties),
    )
  }

  protected _updateProperty(key: string, value: any, oldValue: any): void {
    super._updateProperty(key, value, oldValue)

    switch (key) {
      case 'enabled':
      case 'columns':
      case 'rows':
      case 'cells':
        this._requestUpdate()
        break
    }
  }

  /** Coalesce property changes within the same tick into a single rebuild. */
  protected _requestUpdate(): void {
    this._dirty = true
    if (this._flushScheduled) {
      return
    }
    this._flushScheduled = true
    queueMicrotask(() => {
      this._flushScheduled = false
      if (this._dirty && !this.destroyed) {
        this.update()
      }
    })
  }

  isValid(): boolean {
    return Boolean(this.enabled && this.cells.length)
  }

  get gridWidth(): number {
    return this.columns.reduce((sum, c) => sum + (c.width || DEFAULT_COLUMN_WIDTH), 0)
  }

  get gridHeight(): number {
    return this.rows.reduce((sum, r) => sum + (r.height || DEFAULT_ROW_HEIGHT), 0)
  }

  /** Synchronously (re)build cell nodes, diffing against the existing ones. */
  update(): void {
    this._dirty = false

    if (!this.isValid()) {
      this._clearCells()
      this._parent.size.set(0, 0)
      this._parent.requestDraw()
      return
    }

    const { columns, rows, cells } = this

    // grid extent (cells may reference rows/cols beyond the declared ones)
    let colCount = columns.length
    let rowCount = rows.length
    for (const cell of cells) {
      colCount = Math.max(colCount, cell.col + (cell.colSpan || 1))
      rowCount = Math.max(rowCount, cell.row + (cell.rowSpan || 1))
    }

    // prefix sums → O(1) cell geometry
    const colX: number[] = [0]
    for (let i = 0; i < colCount; i++) {
      colX.push(colX[i] + (columns[i]?.width || DEFAULT_COLUMN_WIDTH))
    }
    const rowY: number[] = [0]
    for (let i = 0; i < rowCount; i++) {
      rowY.push(rowY[i] + (rows[i]?.height || DEFAULT_ROW_HEIGHT))
    }

    this._parent.size.set(colX[columns.length] ?? 0, rowY[rows.length] ?? 0)

    const seen = new Set<string>()
    for (const cell of cells) {
      const key = `${cell.row}:${cell.col}`
      seen.add(key)
      const rect: CellRect = {
        left: colX[cell.col],
        top: rowY[cell.row],
        width: colX[cell.col + (cell.colSpan || 1)] - colX[cell.col],
        height: rowY[cell.row + (cell.rowSpan || 1)] - rowY[cell.row],
      }

      // skip cells whose content and geometry are unchanged
      const snapshot = `${JSON.stringify(cell)}|${rect.left},${rect.top},${rect.width},${rect.height}`
      if (this._cellNodes.has(key) && this._cellSnapshots.get(key) === snapshot) {
        continue
      }

      let node = this._cellNodes.get(key)
      if (!node) {
        node = Node.parse({ is: 'Element2D' }, 'Element2D') as Element2D
        this._parent.appendChild(node, 'back')
        this._cellNodes.set(key, node)
      }
      this._applyCell(node, cell, rect)
      this._cellSnapshots.set(key, snapshot)
    }

    // destroy cells that no longer exist
    for (const [key, node] of this._cellNodes) {
      if (!seen.has(key)) {
        this._parent.removeChild(node)
        node.destroy()
        this._cellNodes.delete(key)
        this._cellSnapshots.delete(key)
      }
    }

    this._parent.requestDraw()
  }

  protected _applyCell(node: Element2D, cell: NormalizedTableCell, rect: CellRect): void {
    node.style = { ...(cell.style as Record<string, any> | undefined), ...rect }
    node.background = cell.background as any // undefined resets/clears the background

    // replace the cell's children
    for (const child of [...node.getChildren(true)]) {
      node.removeChild(child)
      child.destroy()
    }
    cell.children?.forEach((child) => {
      node.appendChild(Node.parse(child as Record<string, any>, 'Element2D'))
    })
  }

  protected _clearCells(): void {
    for (const node of this._cellNodes.values()) {
      this._parent.removeChild(node)
      node.destroy()
    }
    this._cellNodes.clear()
    this._cellSnapshots.clear()
  }

  protected override _destroy(): void {
    this._clearCells()
  }
}
