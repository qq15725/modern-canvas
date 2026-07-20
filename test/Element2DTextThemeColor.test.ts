import { beforeEach, describe, expect, it } from 'vitest'
import { Element2D } from '../src'

// 语义色 token 在「栅格路径」下的解析（_resolveBaseThemeColors）。
//
// 背景：元素带 text.fill 时会被踢出 glyph atlas、走整段栅格化，由 modern-text 直接消费 base 的
// 派生结构。而 Canvas2D 取 pathStyle.fill 时 computedFill.color **优先于** style.color，
// 早前只解析了 computedStyle.color、漏了 computedFill/computedOutline，`@token` 被原样交给
// fillStyle → 非法值被忽略、沿用上一次颜色（常见是刚填过的白底）→ 整块白、文字“消失”。

const TOKENS = {
  'on-surface': { light: '#1e1e1e', dark: '#f7f7f7' },
  'surface': { light: '#ffffff', dark: '#262626' },
}

/** 最小 tree 替身：_resolveBaseThemeColors 只用到 resolveThemeColor。 */
function fakeTree(theme: 'light' | 'dark'): any {
  return {
    theme,
    resolveThemeColor(value: any) {
      if (typeof value !== 'string' || value[0] !== '@') {
        return value
      }
      return (TOKENS as any)[value.slice(1)]?.[this.theme] ?? value
    },
  }
}

function makeElement(theme: 'light' | 'dark'): { el: Element2D, tree: any } {
  const el = new Element2D()
  const tree = fakeTree(theme)
  ;(el as any)._tree = tree
  // node 环境没有真 canvas：屏蔽整段栅格（本用例只关心栅格**前**的 token 解析）
  ;(el.text as any)._rasterTexture = () => {}
  el.text = {
    content: [{ fragments: [{ content: '语义色文字', color: '@on-surface' }] }],
    fill: { enabled: true, color: '@on-surface' },
  } as any
  // 先排版出派生结构（computedStyle / computedFill），栅格前才有东西可解析
  el.text.base.update()
  return { el, tree }
}

describe('element2DText 语义色 token 解析（栅格路径）', () => {
  let el: Element2D
  let tree: any

  beforeEach(() => {
    ;({ el, tree } = makeElement('light'))
  })

  it('解析 computedFill.color —— 否则整段用未解析的 token 填色', () => {
    ;(el.text as any)._resolveBaseThemeColors()
    expect(el.text.base.computedFill?.color).toBe('#1e1e1e')
    const fragment = el.text.base.paragraphs[0]!.fragments[0]!
    expect(fragment.computedFill?.color).toBe('#1e1e1e')
  })

  it('不污染文档数据 text.fill.color（仍是 token，保存回文档才不会被写死）', () => {
    ;(el.text as any)._resolveBaseThemeColors()
    expect((el.text.fill as any)?.color).toBe('@on-surface')
    const rawFragment = (el.text.content as any)[0].fragments[0]
    expect(rawFragment.color).toBe('@on-surface')
  })

  it('主题切换后按新主题重解析（派生对象被复用也不会停在旧主题）', () => {
    ;(el.text as any)._resolveBaseThemeColors()
    const fragment = el.text.base.paragraphs[0]!.fragments[0]!
    expect(fragment.computedFill?.color).toBe('#1e1e1e')
    expect(fragment.computedStyle.color).toBe('#1e1e1e')

    // 切暗色：不重新排版（模拟布局可复用、派生对象不重建的情形）
    tree.theme = 'dark'
    ;(el.text as any)._resolveBaseThemeColors()
    expect(fragment.computedFill?.color).toBe('#f7f7f7')
    expect(fragment.computedStyle.color).toBe('#f7f7f7')

    // 切回亮色应还原，而不是停在暗色值
    tree.theme = 'light'
    ;(el.text as any)._resolveBaseThemeColors()
    expect(fragment.computedFill?.color).toBe('#1e1e1e')
    expect(fragment.computedStyle.color).toBe('#1e1e1e')
  })

  it('非 token 的字面色不受影响', () => {
    const plain = new Element2D()
    ;(plain as any)._tree = fakeTree('light')
    ;(plain.text as any)._rasterTexture = () => {}
    plain.text = {
      content: [{ fragments: [{ content: '固定色', color: '#ff0000' }] }],
      fill: { enabled: true, color: '#00ff00' },
    } as any
    plain.text.base.update()
    ;(plain.text as any)._resolveBaseThemeColors()
    // 字面色只被 normalizeFill 规范成 8 位，不经 token 解析
    expect(plain.text.base.computedFill?.color).toBe('#00ff00ff')
    expect(plain.text.base.paragraphs[0]!.fragments[0]!.computedStyle.color).toBe('#ff0000ff')
  })
})
