export const PI = Math.PI
export const PI_2 = PI * 2

export function isPow2(v: number): boolean {
  return !(v & (v - 1)) && (!!v)
}

export interface ExportTile {
  /** Left offset of the tile in the full image (logical units). */
  x: number
  /** Top offset of the tile in the full image (logical units). */
  y: number
  /** Tile width (logical units); clamped at the right edge. */
  width: number
  /** Tile height (logical units); clamped at the bottom edge. */
  height: number
}

/**
 * Split a `width × height` image into a grid of tiles no larger than `limit`
 * on either axis. Used to export images that exceed a single GPU render pass
 * (texture / renderbuffer / viewport limits). Tiles are returned row-major and
 * cover the whole image with no overlap; edge tiles are clamped to the
 * remaining size. Returns an empty array for a degenerate (zero-area) image.
 */
export function planExportTiles(width: number, height: number, limit: number): ExportTile[] {
  const w = Math.max(0, Math.floor(width))
  const h = Math.max(0, Math.floor(height))
  const max = Math.max(1, Math.floor(limit))
  const tiles: ExportTile[] = []
  if (!w || !h) {
    return tiles
  }
  const tileW = Math.min(w, max)
  const tileH = Math.min(h, max)
  const cols = Math.ceil(w / tileW)
  const rows = Math.ceil(h / tileH)
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * tileW
      const y = row * tileH
      tiles.push({
        x,
        y,
        width: Math.min(tileW, w - x),
        height: Math.min(tileH, h - y),
      })
    }
  }
  return tiles
}
