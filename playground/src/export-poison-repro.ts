import { fonts } from 'modern-font'
import { getRenderEngine, render } from '../../src'

// 「一次渲染污染下一次渲染」的隔离复现。
//
// 现场：笔格灵感广场里多选三张图下载 PNG，出来一张尺寸正确、内容全空的图。
// 链路是下载弹窗的范围选择器会给每个顶层元素渲一张缩略图，其中包含工作流连线，
// 而连线的 JSON 里没有 style.width/height（位置尺寸直写 transform）。
//
// 这里把 app / mce 全部剥掉，只留 render()：先渲一张正常大图作基线，再渲一个
// 「有问题的元素」，然后原样重渲基线，比对非透明像素数。render() 复用的是
// getRenderEngine() 的共享单例，所以中间那次一旦把引擎留在坏状态，第三次就会塌。
//
// 变量只有一个：中间那次渲染的元素**有没有 style.width/height**。

const W = 900
const H = 600

/** 基线文档：三个色块，铺满画面，便于用「非透明像素数」判断有没有画出来 */
function baseline(): any {
  const block = (left: number, top: number, w: number, h: number, color: string): any => ({
    is: 'Element2D',
    style: { left, top, width: w, height: h, backgroundColor: color },
  })
  return {
    is: 'Element2D',
    style: { width: W, height: H },
    children: [
      block(0, 0, 400, 600, '#e06c3b'),
      block(420, 0, 480, 280, '#3b7de0'),
      block(420, 300, 480, 300, '#3be08a'),
    ],
  }
}

/** 统计非透明像素数 —— 空白图是 0 */
function opaqueCount(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext('2d')!
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  let n = 0
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 10)
      n++
  }
  return n
}

async function renderBaseline(): Promise<number> {
  const canvas = await render({ data: baseline(), width: W, height: H, fonts })
  return opaqueCount(canvas)
}

/**
 * 中间那次渲染。两个自变量分开控制，用来拆「视口太小」和「元素没尺寸」哪个才是污染源：
 * - elSize：元素 style 里带不带 width/height
 * - viewport：传给 render() 的画幅
 */
async function renderProbe(elSize: boolean | 'empty', viewport?: { w: number, h: number }): Promise<string> {
  const style: any = { left: 0, top: 0, backgroundColor: '#ff00ff' }
  if (elSize === true) {
    style.width = 54
    style.height = 707
  }
  // 'empty'：连元素都不给，纯空文档 —— 用来验证「这一帧画了零个三角形」本身就是污染源
  const data: any = elSize === 'empty'
    ? { is: 'Element2D', style: { width: 54, height: 707 } }
    : { is: 'Element2D', style }
  try {
    const canvas = await render({
      data,
      width: viewport?.w,
      height: viewport?.h,
      fonts,
    })
    return `ok ${canvas.width}x${canvas.height}`
  }
  catch (e: any) {
    return `THROW ${e?.message ?? e}`
  }
}

async function main(): Promise<void> {
  const root = document.createElement('pre')
  root.style.cssText = 'font: 13px/1.7 ui-monospace, monospace; padding: 16px; white-space: pre-wrap'
  document.body.append(root)
  const log = (s: string): void => {
    root.textContent += `${s}\n`
  }

  const full = await renderBaseline()
  log(`基线（干净）: 非透明像素 ${full}`)
  log('')

  const cases: { tag: string, elSize: boolean | 'empty', viewport?: { w: number, h: number } }[] = [
    { tag: '⓪ 空文档：有画幅但一个三角形都不画', elSize: 'empty', viewport: { w: 54, h: 707 } },
    { tag: '① 元素有尺寸 + 视口 54x707（正常口径）', elSize: true, viewport: { w: 54, h: 707 } },
    { tag: '② 元素有尺寸 + 视口 1x1（大元素塞进小视口）', elSize: true, viewport: { w: 1, h: 1 } },
    { tag: '③ 元素无尺寸 + 视口 54x707（只缺元素尺寸）', elSize: false, viewport: { w: 54, h: 707 } },
    { tag: '④ 元素无尺寸 + 视口也没给（= 出问题的现场）', elSize: false },
  ]

  for (const c of cases) {
    // 先把引擎恢复到干净状态，保证每组起点一致
    await renderBaseline()
    const probe = await renderProbe(c.elSize, c.viewport)
    const el: any = (getRenderEngine() as any).root.children[0]
    const after = await renderBaseline()
    log(`[${c.tag}]`)
    log(`  探针渲染: ${probe}（元素 size ${el ? `${el.size?.x}x${el.size?.y}` : '-'}）`)
    log(`  之后重渲基线: 非透明像素 ${after} / ${full} → ${after === full ? '✅ 未受影响' : '❌ 被污染'}`)
    log('')
  }
  log('全绿 = flush() 的「没顶点可画」早退分支已把累加器清干净（见 GlBatch2DSystem.flush）')
}

main()
