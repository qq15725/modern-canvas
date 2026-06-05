import type { NormalizedEffect, NormalizedFill, NormalizedGradientFill } from 'modern-idoc'
import { createHTMLCanvas } from '../../../core'

type Drawable = CanvasImageSource & { width: number, height: number }

function ctxOf(cvs: HTMLCanvasElement): CanvasRenderingContext2D {
  return cvs.getContext('2d')!
}

/** 由角度+色标构造 canvas 线性渐变 */
function makeLinearGradient(ctx: CanvasRenderingContext2D, grad: NormalizedGradientFill['linearGradient'], w: number, h: number): CanvasGradient {
  const angle = ((grad?.angle ?? 0) * Math.PI) / 180
  const cx = w / 2
  const cy = h / 2
  const len = (Math.abs(Math.cos(angle)) * w + Math.abs(Math.sin(angle)) * h) / 2
  const dx = Math.cos(angle) * len
  const dy = Math.sin(angle) * len
  const g = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy)
  for (const stop of grad?.stops ?? []) {
    g.addColorStop(Math.min(1, Math.max(0, stop.offset)), stop.color)
  }
  return g
}

/** 用 fill 给 source 的 alpha 轮廓重上色（source-in） */
function fillSilhouette(source: Drawable, w: number, h: number, fill: NormalizedFill, patterns: Record<string, Drawable>): Drawable {
  const cvs = createHTMLCanvas(w, h)!
  const ctx = ctxOf(cvs)
  ctx.drawImage(source, 0, 0, w, h)
  ctx.globalCompositeOperation = 'source-in'
  if (fill.linearGradient) {
    ctx.fillStyle = makeLinearGradient(ctx, fill.linearGradient, w, h)
    ctx.fillRect(0, 0, w, h)
  }
  else if (fill.image && patterns[fill.image]) {
    ctx.drawImage(patterns[fill.image], 0, 0, w, h)
  }
  else if (fill.color) {
    ctx.fillStyle = fill.color
    ctx.fillRect(0, 0, w, h)
  }
  return cvs
}

/**
 * 沿 alpha 轮廓描边（偏移多份拷贝近似，无需轮廓追踪）。
 * 描边铺底、原图盖上，结果尺寸不变。
 */
function strokeSilhouette(source: Drawable, w: number, h: number, width: number, color: string): Drawable {
  const ring = createHTMLCanvas(w, h)!
  const rctx = ctxOf(ring)
  const steps = Math.max(8, Math.ceil(width) * 2)
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2
    rctx.drawImage(source, Math.cos(a) * width, Math.sin(a) * width, w, h)
  }
  rctx.globalCompositeOperation = 'source-in'
  rctx.fillStyle = color
  rctx.fillRect(0, 0, w, h)

  const out = createHTMLCanvas(w, h)!
  const octx = ctxOf(out)
  octx.drawImage(ring, 0, 0)
  octx.drawImage(source, 0, 0, w, h)
  return out
}

/** 从 CSS transform 字符串解析平移量（仅 translate / translateX / translateY） */
function parseTranslate(transform?: string): { x: number, y: number } {
  let x = 0
  let y = 0
  if (!transform)
    return { x, y }
  const t = transform.match(/translate\(\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/)
  if (t) {
    x = Number.parseFloat(t[1])
    y = Number.parseFloat(t[2])
  }
  const tx = transform.match(/translateX\(\s*(-?[\d.]+)/)
  if (tx)
    x = Number.parseFloat(tx[1])
  const ty = transform.match(/translateY\(\s*(-?[\d.]+)/)
  if (ty)
    y = Number.parseFloat(ty[1])
  return { x, y }
}

/**
 * 把 `原图 + effects` 烘焙到一张运行时 canvas（不持久化、不转存图片）。
 * 每层按顺序：fill 重上色 → outline 描边 → 按 transform 位移 / shadow 投影合成。
 *
 * 注意：图案填充（fill.image）需异步预加载，未在 patterns 中提供则跳过该填充。
 */
export function bakeImageEffects(
  source: Drawable,
  effects: NormalizedEffect[],
  width: number,
  height: number,
  patterns: Record<string, Drawable> = {},
): HTMLCanvasElement {
  const w = Math.max(1, Math.round(width))
  const h = Math.max(1, Math.round(height))
  const out = createHTMLCanvas(w, h)!
  const ctx = ctxOf(out)

  for (const effect of effects) {
    let layer: Drawable = source

    if (effect.fill && (effect.fill.color || effect.fill.linearGradient || effect.fill.image)) {
      layer = fillSilhouette(layer, w, h, effect.fill, patterns)
    }

    if (effect.outline?.width && effect.outline.color) {
      layer = strokeSilhouette(layer, w, h, effect.outline.width, effect.outline.color)
    }

    const { x, y } = parseTranslate(effect.transform)

    ctx.save()
    if (effect.shadow) {
      ctx.shadowColor = effect.shadow.color
      ctx.shadowBlur = effect.shadow.blur ?? 0
      ctx.shadowOffsetX = effect.shadow.offsetX ?? 0
      ctx.shadowOffsetY = effect.shadow.offsetY ?? 0
    }
    if (x || y) {
      ctx.drawImage(layer, x, y, w, h)
    }
    else {
      ctx.globalCompositeOperation = 'destination-over'
      ctx.drawImage(layer, 0, 0, w, h)
    }
    ctx.restore()
  }

  return out
}
