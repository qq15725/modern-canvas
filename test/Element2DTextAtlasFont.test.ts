import { afterEach, describe, expect, it, vi } from 'vitest'
import { Element2D, sharedGlyphAtlas } from '../src'

afterEach(() => vi.restoreAllMocks())

describe('字形纹理缓存的字体切换', () => {
  it('目标字体加载后重新栅格化，继续绘制相同字体时复用缓存', () => {
    const el = new Element2D()
    const rasterize = vi.fn()
    const character = {
      content: '字',
      glyphFontId: 1,
      glyphBox: { left: 0, top: 0, width: 20, height: 20 },
      computedStyle: { fontFamily: 'Delayed', fontSize: 20, color: '#000000' },
      path: { drawTo: rasterize },
    }
    vi.spyOn(el.text.base, 'characters', 'get').mockReturnValue([character as any])
    const cached = new Set<string>()
    vi.spyOn(sharedGlyphAtlas, 'acquire').mockImplementation((key, _width, _height, raster) => {
      if (!cached.has(key)) {
        cached.add(key)
        raster({ translate() {} } as any)
      }
      // 无需 GPU，记录缓存命中后终止本次绘制。
      return null
    })

    const draw = () => (el.text as any)._atlasDraw({})
    draw()
    draw()
    expect(rasterize).toHaveBeenCalledTimes(1)

    character.glyphFontId = 2
    draw()
    draw()
    expect(rasterize).toHaveBeenCalledTimes(2)

    character.glyphFontId = 1
    draw()
    expect(rasterize).toHaveBeenCalledTimes(2)
    el.destroy()
  })
})
