import { createHTMLCanvas } from '../../../core'
import { CanvasTexture } from './CanvasTexture'

// 一个字形在 atlas 页内的归一化采样矩形（UV）+ 所在页纹理。
export interface GlyphSlot {
  texture: CanvasTexture
  u0: number
  v0: number
  u1: number
  v1: number
}

// 把字形画进 slot 内部区域的回调：ctx 已被 atlas 预置变换（设备像素，
// 原点=ink 盒左上、缩放=超采样倍率），调用方只需把字形 path 按 ink-local 逻辑坐标绘制。
export type GlyphRasterFn = (ctx: CanvasRenderingContext2D) => void

const PAGE = 2048 // 每页设备像素尺寸（正方形）。
const PAD = 2 // slot 四周留白，防 mipmap / 线性采样跨字形溢色。

interface AtlasPage {
  texture: CanvasTexture
  ctx: CanvasRenderingContext2D
  penX: number
  penY: number
  rowH: number
}

/**
 * 共享字形 atlas：把每个唯一字形（字 + 字体 + 字号桶 + 字重 + 斜体 + 颜色）只栅格化一次到
 * 共享纹理页，文字渲染时改为「逐字形 quad 批渲染」（见 Element2DText._atlasDraw）。同一纹理的
 * quad 经 GlBatch2DSystem 自动塌缩进 ~1 个 draw call，编辑/缩放/resize 只重定位 quad，不再整篇重栅。
 */
export class GlyphAtlas {
  // 超采样倍率：slot 以 ink 盒尺寸 × SUPER 的设备像素栅格，等价旧固定 2× 纹理密度。
  readonly superSample = 2

  protected _pages: AtlasPage[] = []
  protected _slots = new Map<string, GlyphSlot | null>()

  protected _newPage(): AtlasPage {
    const texture = new CanvasTexture({ pixelRatio: 1, mipmap: true })
    texture.width = PAGE
    texture.height = PAGE
    const canvas = texture.source ?? createHTMLCanvas(PAGE, PAGE)!
    canvas.width = PAGE
    canvas.height = PAGE
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    const page: AtlasPage = { texture, ctx, penX: PAD, penY: PAD, rowH: 0 }
    this._pages.push(page)
    return page
  }

  /**
   * 取（必要时栅格化）一个字形 slot。`inkW/inkH` 为字形 ink 盒的逻辑尺寸；`raster` 在
   * 已预置变换的 2D 上下文里绘制该字形。返回 null 表示该字形超过单页容量（调用方应回退到整段栅格）。
   */
  acquire(key: string, inkW: number, inkH: number, raster: GlyphRasterFn): GlyphSlot | null {
    const cached = this._slots.get(key)
    if (cached !== undefined) {
      return cached
    }

    const s = this.superSample
    const devW = Math.ceil(inkW * s)
    const devH = Math.ceil(inkH * s)
    const cellW = devW + PAD * 2
    const cellH = devH + PAD * 2

    if (cellW > PAGE || cellH > PAGE) {
      this._slots.set(key, null) // 单字超过一页，无法装箱。
      return null
    }

    let page = this._pages[this._pages.length - 1] ?? this._newPage()
    // shelf 装箱：当前行放不下则换行；页放不下则新开一页。
    if (page.penX + cellW > PAGE) {
      page.penX = PAD
      page.penY += page.rowH + PAD
      page.rowH = 0
    }
    if (page.penY + cellH > PAGE) {
      page = this._newPage()
    }

    const dx = page.penX + PAD
    const dy = page.penY + PAD

    const ctx = page.ctx
    ctx.save()
    ctx.setTransform(s, 0, 0, s, dx, dy)
    ctx.beginPath()
    raster(ctx)
    ctx.restore()
    page.texture.requestUpdate('source')

    page.penX += cellW
    page.rowH = Math.max(page.rowH, cellH)

    const slot: GlyphSlot = {
      texture: page.texture,
      u0: dx / PAGE,
      v0: dy / PAGE,
      u1: (dx + inkW * s) / PAGE,
      v1: (dy + inkH * s) / PAGE,
    }
    this._slots.set(key, slot)
    return slot
  }

  clear(): void {
    for (const page of this._pages) {
      page.texture.destroy()
    }
    this._pages.length = 0
    this._slots.clear()
  }
}

// 进程级共享 atlas：字形跨所有文字元素复用。
export const sharedGlyphAtlas = new GlyphAtlas()
