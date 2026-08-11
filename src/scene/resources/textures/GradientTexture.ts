import type { LinearGradient, RadialGradient } from 'modern-idoc'
import type { Texture2DProperties } from './Texture2D'
import { isGradient } from 'modern-idoc'
import { createHTMLCanvas } from '../../../core'
import { Texture2D } from './Texture2D'

// 渐变本身是连续函数，不需要按目标逻辑尺寸逐像素烘焙。限制中间纹理既不改变 UV 映射，
// 又避免超长文字/图形仅为一个渐变就创建数百 MiB 的 Canvas 与 Uint8Array。
const MAX_GRADIENT_TEXTURE_PIXELS = 4 * 1024 * 1024
const MAX_GRADIENT_TEXTURE_EDGE = 4096

export class GradientTexture extends Texture2D {
  static test(value: string): boolean {
    return isGradient(value)
  }

  protected static _fitTextureSize(width: number, height: number): { width: number, height: number } {
    const scale = Math.min(
      1,
      MAX_GRADIENT_TEXTURE_EDGE / width,
      MAX_GRADIENT_TEXTURE_EDGE / height,
      Math.sqrt(MAX_GRADIENT_TEXTURE_PIXELS / (width * height)),
    )
    return {
      width: Math.max(1, Math.floor(width * scale)),
      height: Math.max(1, Math.floor(height * scale)),
    }
  }

  static linearGradient(linearGradient: LinearGradient, width: number, height: number): Texture2DProperties {
    // 容错非有限尺寸（NaN/Infinity，常见于自定义字体未就绪时的文字测量）：|| 1 挡不住 Infinity，显式校验
    const wOk = Number.isFinite(width) && width > 0
    const hOk = Number.isFinite(height) && height > 0
    const angleOk = Number.isFinite(linearGradient.angle)
    width = wOk ? width : 1
    height = hOk ? height : 1
    ;({ width, height } = this._fitTextureSize(width, height))
    const canvas = createHTMLCanvas(width, height)
    if (!canvas) {
      throw new Error('GradientTexture requires a canvas; call setCanvasFactory() in non-browser environments.')
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to parse linear gradient, get canvas context is null.')
    }
    const { stops } = linearGradient
    const w = width
    const h = height
    if (!wOk || !hOk || !angleOk) {
      // 尺寸/角度异常（如自定义字体未就绪时文字测量为 NaN）时渐变方向无意义，
      // 退化为首个有效色标的纯色填充，避免退化渐变把整块渲染成黑块；
      // 待字体就绪重绘、尺寸恢复正常后会再走下面的正常渐变逻辑
      ctx.fillStyle = stops?.find(s => s?.color)?.color ?? 'transparent'
      ctx.fillRect(0, 0, w, h)
    }
    else {
      const angle = linearGradient.angle!
      const cx = w / 2
      const cy = h / 2
      const rad = (angle + 90) * Math.PI / 180
      const dx = Math.sin(rad)
      const dy = -Math.cos(rad)
      const l = Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad))
      const g = ctx.createLinearGradient(cx - dx * (l / 2), cy - dy * (l / 2), cx + dx * (l / 2), cy + dy * (l / 2))
      for (const s of stops) {
        // 非法 offset/color 跳过单个色标，避免崩掉整张渐变
        const offset = Number.isFinite(s.offset) ? Math.min(1, Math.max(0, s.offset)) : 0
        try {
          g.addColorStop(offset, s.color)
        }
        catch {}
      }
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
    }
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    return {
      width: imageData.width,
      height: imageData.height,
      source: new Uint8Array(imageData.data.buffer),
      uploadMethodId: 'buffer',
    }
  }

  constructor(gradient: LinearGradient | RadialGradient, width: number, height: number) {
    super(
      GradientTexture.linearGradient(gradient as any, width, height),
    )
  }
}
