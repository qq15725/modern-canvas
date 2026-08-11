import { beforeEach, describe, expect, it } from 'vitest'
import { Element2D } from '../src'

function makeElement(): Element2D {
  const el = new Element2D()
  ;(el.text as any)._rasterTexture = () => {}
  el.text = {
    content: [{ fragments: [{ content: '超长文字', color: '#ff0000' }] }],
    fill: { enabled: true, color: '#00ff00' },
  } as any
  el.text.base.update()
  return el
}

describe('element2DText glyph atlas 纯色填充', () => {
  let el: Element2D

  beforeEach(() => {
    el = makeElement()
  })

  it('允许 text.fill 纯色进入 atlas，并按 fill 优先于 style 取色', () => {
    const character = el.text.base.characters[0]!

    expect((el.text as any)._getAtlasCharacterColor(character)).toBe('#00ff00ff')
    expect((el.text as any)._computeAtlasEligible()).toBe(true)
  })

  it('允许 fragment.fill 纯色进入 atlas', () => {
    el.text = {
      content: [{
        fragments: [{
          content: '片段纯色',
          color: '#ff0000',
          fill: { enabled: true, color: '#0000ff' },
        }],
      }],
    } as any
    el.text.base.update()

    const character = el.text.base.characters[0]!
    expect((el.text as any)._getAtlasCharacterColor(character)).toBe('#0000ffff')
    expect((el.text as any)._computeAtlasEligible()).toBe(true)
  })

  it('fill 禁用时回退到 style.color', () => {
    el.text = {
      content: [{ fragments: [{ content: '禁用填充', color: '#ff0000' }] }],
      fill: { enabled: false, color: '#00ff00' },
    } as any
    el.text.base.update()

    const character = el.text.base.characters[0]!
    expect((el.text as any)._getAtlasCharacterColor(character)).toBe('#ff0000ff')
    expect((el.text as any)._computeAtlasEligible()).toBe(true)
  })

  it('复杂 fill 保持走整段栅格路径', () => {
    const character = el.text.base.characters[0]!
    character.parent.computedFill = {
      enabled: true,
      color: '#00ff00ff',
      image: 'https://example.com/fill.png',
    }

    expect((el.text as any)._getAtlasCharacterColor(character)).toBeUndefined()
    expect((el.text as any)._computeAtlasEligible()).toBe(false)
  })
})
