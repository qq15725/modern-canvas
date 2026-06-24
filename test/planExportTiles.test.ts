import { describe, expect, it } from 'vitest'
import { planExportTiles } from '../src'

describe('planExportTiles', () => {
  it('returns a single tile when the image fits within the limit', () => {
    expect(planExportTiles(1030, 720, 4096)).toEqual([
      { x: 0, y: 0, width: 1030, height: 720 },
    ])
  })

  it('tiles a tall image into clamped rows covering the full height', () => {
    const tiles = planExportTiles(1030, 33923, 16384)
    // 33923 / 16384 -> 3 rows, 1 column
    expect(tiles.length).toBe(3)
    expect(tiles.map(t => t.height)).toEqual([16384, 16384, 1155])
    expect(tiles.every(t => t.width === 1030 && t.x === 0)).toBe(true)
    expect(tiles.map(t => t.y)).toEqual([0, 16384, 32768])
    // rows are contiguous and exactly cover the height
    expect(tiles[2].y + tiles[2].height).toBe(33923)
  })

  it('tiles in both axes row-major with clamped edges', () => {
    const tiles = planExportTiles(2500, 2500, 1000)
    // ceil(2500/1000) = 3 -> 3x3 grid
    expect(tiles.length).toBe(9)
    // row-major order
    expect(tiles[0]).toEqual({ x: 0, y: 0, width: 1000, height: 1000 })
    expect(tiles[1]).toEqual({ x: 1000, y: 0, width: 1000, height: 1000 })
    expect(tiles[2]).toEqual({ x: 2000, y: 0, width: 500, height: 1000 })
    expect(tiles[8]).toEqual({ x: 2000, y: 2000, width: 500, height: 500 })
  })

  it('covers every pixel exactly once', () => {
    const W = 3333
    const H = 777
    const tiles = planExportTiles(W, H, 512)
    let area = 0
    for (const t of tiles) {
      area += t.width * t.height
      expect(t.x + t.width).toBeLessThanOrEqual(W)
      expect(t.y + t.height).toBeLessThanOrEqual(H)
    }
    expect(area).toBe(W * H)
  })

  it('floors fractional dimensions', () => {
    expect(planExportTiles(10.9, 5.9, 100)).toEqual([
      { x: 0, y: 0, width: 10, height: 5 },
    ])
  })

  it('returns no tiles for a degenerate image', () => {
    expect(planExportTiles(0, 100, 50)).toEqual([])
    expect(planExportTiles(100, 0, 50)).toEqual([])
  })

  it('treats a non-positive limit as 1', () => {
    const tiles = planExportTiles(3, 1, 0)
    expect(tiles).toEqual([
      { x: 0, y: 0, width: 1, height: 1 },
      { x: 1, y: 0, width: 1, height: 1 },
      { x: 2, y: 0, width: 1, height: 1 },
    ])
  })
})
