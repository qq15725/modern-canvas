import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CanvasTexture, Element2D, GradientTexture } from '../src'

function makeElement(): Element2D {
  const el = new Element2D()
  el.text = {
    content: [{ fragments: [{ content: '文字渲染', color: '#333333' }] }],
  }
  el.text.base.update()
  return el
}

describe('element2DText 栅格内存边界与生命周期', () => {
  let el: Element2D

  beforeEach(() => {
    el = makeElement()
  })

  it('超大复杂文字在 auto 模式改走 path，必须栅格的效果仍走 texture', () => {
    el.text.base.boundingBox.width = 2048
    el.text.base.boundingBox.height = 21702

    expect(el.text.useTextureDraw()).toBe(false)

    el.text.effects = [{ fill: { enabled: true, color: '#ff0000' } }]
    expect(el.text.useTextureDraw()).toBe(true)
  })

  it('必须栅格的超大文字也不会超过硬像素预算', () => {
    const width = 2048
    const height = 21702
    const ratio = (el.text as any)._getRasterPixelRatio(width, height)

    expect(ratio).toBeLessThan(2)
    expect(Math.ceil(width * ratio) * Math.ceil(height * ratio)).toBeLessThanOrEqual(16 * 1024 * 1024)

    const extremeRatio = (el.text as any)._getRasterPixelRatio(1, 1e12)
    expect(Math.ceil(extremeRatio) * Math.ceil(1e12 * extremeRatio)).toBeLessThanOrEqual(16 * 1024 * 1024)
  })

  it('小数像素比下 Canvas 与 GPU 使用相同的整数像素尺寸', () => {
    const source = { width: 300, height: 150 } as HTMLCanvasElement
    const texture = new CanvasTexture({ pixelRatio: 0.61425781249, source })
    texture.width = 2048
    texture.height = 21703

    expect(texture.pixelWidth).toBe(texture.sourceWidth)
    expect(texture.pixelHeight).toBe(texture.sourceHeight)

    texture.pixelRatio = 0.5
    expect(texture.pixelWidth).toBe(texture.sourceWidth)
    expect(texture.pixelHeight).toBe(texture.sourceHeight)
  })

  it('超大渐变使用等比例的有界中间纹理', () => {
    const size = (GradientTexture as any)._fitTextureSize(2048, 21702)

    expect(size.width * size.height).toBeLessThanOrEqual(4 * 1024 * 1024)
    expect(size.width).toBeLessThanOrEqual(4096)
    expect(size.height).toBeLessThanOrEqual(4096)
    expect(size.width / size.height).toBeCloseTo(2048 / 21702, 3)
  })

  it('更新阶段只标记纹理失效，不为离屏文字提前栅格化', () => {
    const rasterTexture = vi.fn()
    ;(el.text as any)._rasterTexture = rasterTexture

    el.text.update()

    expect(rasterTexture).not.toHaveBeenCalled()
    expect((el.text as any)._textureStale).toBe(true)
  })

  it('文字节点销毁时释放主纹理、分块纹理和自有填充纹理', () => {
    const mainTexture = (el.text as any)._texture as CanvasTexture
    const tileTexture = new CanvasTexture()
    const fillTexture = new CanvasTexture()
    ;(el.text as any)._tiles = [{ texture: tileTexture, x: 0, y: 0, w: 1, h: 1 }]
    ;(el.text as any)._ownedTextureMap.set('fill', fillTexture)

    el.destroy()

    expect(mainTexture.destroyed).toBe(true)
    expect(tileTexture.destroyed).toBe(true)
    expect(fillTexture.destroyed).toBe(true)
  })
})
