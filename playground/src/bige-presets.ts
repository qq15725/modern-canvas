import type { Effect } from 'modern-idoc'
import { fonts } from 'modern-font'
import { Engine } from '../../src'

// 用 bige「图片样式」预设（/new/design/photoEffects 的 content）验证 foreground.effects 烘焙，
// 对照官方预览图。每个 content 项是图片 alpha 轮廓的一个副本：
//   - filling: 重上色（纯色 color / 图案 imageContent.image）
//   - stroke[]: 嵌套描边（数组内逐条向外叠）
//   - offset: 位移（在主图背后形成阴影/重影）
//   - {}: 主图本身
// 映射规则见下方 convert（与 @mce/bigesj convertImageEffects 对齐）。

interface BigeStroke { width: number, color: string }
interface BigeEntry {
  stroke?: BigeStroke[]
  offset?: { x: number, y: number }
  filling?: { color?: string, imageContent?: { image: string } }
}

const presets: { name: string, content: BigeEntry[] }[] = [
  { name: '黑白双描边', content: [{ stroke: [{ color: '#ffffffff', width: 10 }, { color: '#000000ff', width: 5 }] }] },
  { name: '灰色阴影(图案)', content: [{}, { offset: { x: 0.1, y: 0.1 }, filling: { imageContent: { image: 'https://bige.cdn.bcebos.com/files/202105/ZYjMrXmI_cOud.png' } } }] },
  { name: '描边灰色阴影', content: [{ stroke: [{ width: 2, color: '#000000ff' }] }, { offset: { x: 0.1, y: 0.1 }, filling: { color: '#000000ff' } }] },
  { name: '灰色阴影(浅)', content: [{}, { offset: { x: 0.01, y: 0.01 }, filling: { color: '#000000cc' } }] },
  { name: '黑色阴影', content: [{}, { offset: { x: 0.1, y: 0.1 }, filling: { color: '#000000ff' } }] },
  { name: '黑色描边', content: [{ stroke: [{ width: 8, color: '#000000ff' }] }] },
  { name: '白色描边', content: [{ stroke: [{ width: 8, color: '#ffffffff' }] }] },
  { name: '多层多色描边', content: [{}, { offset: { x: -0.1, y: -0.1 }, filling: { color: '#ff0c68ff' } }, { offset: { x: 0.1, y: 0.1 }, filling: { color: '#87fff5ff' } }] },
  { name: '斜线阴影(图案)', content: [{}, { offset: { x: -0.1, y: 0.1 }, filling: { imageContent: { image: 'https://bige.cdn.bcebos.com/files/202105/ZYjMrXmI_cOud.png' } } }] },
  { name: '白描边带阴影', content: [{ stroke: [{ width: 8, color: '#ffffffff' }] }, { offset: { x: 0.03, y: 0.03 }, filling: { color: '#000000aa' } }] },
  { name: '白黑双层描边', content: [{ stroke: [{ width: 10, color: '#ffffffff' }, { width: 2, color: '#000000ff' }] }] },
  { name: '多层描边', content: [{ stroke: [{ width: 8, color: '#ffffffff' }, { width: 1.5, color: '#000000ff' }, { width: 8, color: 'white' }, { width: 1.5, color: '#000000ff' }] }] },
  { name: '黑描边阴影(图案)', content: [{ stroke: [{ width: 2, color: '#000000ff' }] }, { offset: { x: 0.1, y: -0.1 }, filling: { imageContent: { image: 'https://bige.cdn.bcebos.com/files/202105/72DXfArd_mh7j.png' } } }] },
]

// bige content → foreground.effects（对齐 @mce/bigesj convertImageEffects）
function convert(content: BigeEntry[], ratio = 50): Effect[] {
  const effects: Effect[] = []
  for (const entry of content) {
    const { filling, offset, stroke } = entry
    const transform = offset
      ? `translate(${(offset.x / 50) * ratio * 200}, ${(offset.y / 50) * ratio * 200})`
      : undefined

    let fill: Effect['fill']
    if (filling?.color)
      fill = { color: filling.color }
    else if (filling?.imageContent?.image)
      fill = { image: filling.imageContent.image }

    const strokes = Array.isArray(stroke) ? stroke : stroke ? [stroke] : []

    if (strokes.length) {
      // 嵌套描边：累积宽度，窄的在前(上/内)、宽的在后(外)
      let cum = 0
      for (const s of strokes) {
        cum += (s.width / 50) * ratio
        effects.push({ ...(transform ? { transform } : {}), outline: { color: s.color, width: cum } })
      }
    }
    else if (fill) {
      effects.push({ ...(transform ? { transform } : {}), fill })
    }
    else {
      effects.push({ ...(transform ? { transform } : {}) }) // {} 主图 / 仅位移重影
    }
  }
  return effects
}

// 生成一张青色圆角矩形占位图（模拟 bige 预览图里的图片）
function makeSource(): string {
  const w = 200
  const h = 140
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const x = c.getContext('2d')!
  const r = 10
  x.beginPath()
  x.moveTo(r, 0)
  x.arcTo(w, 0, w, h, r)
  x.arcTo(w, h, 0, h, r)
  x.arcTo(0, h, 0, 0, r)
  x.arcTo(0, 0, w, 0, r)
  x.closePath()
  const g = x.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, '#19c3ff')
  g.addColorStop(1, '#0aa6ff')
  x.fillStyle = g
  x.fill()
  // 太阳
  x.fillStyle = '#bdeaff'
  x.beginPath()
  x.arc(w - 40, 36, 12, 0, Math.PI * 2)
  x.fill()
  // 山
  x.fillStyle = '#eaf7ff'
  x.beginPath()
  x.moveTo(0, h)
  x.lineTo(60, h - 70)
  x.lineTo(110, h)
  x.closePath()
  x.fill()
  x.beginPath()
  x.moveTo(80, h)
  x.lineTo(140, h - 50)
  x.lineTo(200, h)
  x.closePath()
  x.fillStyle = '#7fd3ff'
  x.fill()
  return c.toDataURL()
}

const COLS = 5
const CELL_W = 260
const CELL_H = 230
const TILE_W = 200
const TILE_H = 140
const ORIGIN_X = 40
const ORIGIN_Y = 80

function tile(p: { name: string, content: BigeEntry[] }, i: number): any[] {
  const col = i % COLS
  const row = Math.floor(i / COLS)
  const x = ORIGIN_X + col * CELL_W
  const y = ORIGIN_Y + row * CELL_H
  return [
    {
      is: 'Element2D',
      style: { left: x, top: y, width: TILE_W, height: TILE_H },
      foreground: { image: makeSource(), effects: convert(p.content) },
    },
    {
      is: 'Element2D',
      style: {
        left: x, top: y + TILE_H + 12, width: TILE_W, height: 24, fontSize: 14, color: '#1a1a2e',
        justifyContent: 'center', alignItems: 'center', textAlign: 'center',
      },
      text: p.name,
    },
  ]
}

async function init(): Promise<void> {
  await fonts.loadFallbackFont({ family: 'fallbackFont', src: '/fonts/AaHouDiHei.woff' })

  const engine = new Engine({
    autoStart: true,
    autoResize: true,
    data: [
      { is: 'Camera2D' },
      {
        is: 'Element2D',
        style: { left: 0, top: 0, width: COLS * CELL_W + 80, height: 80 + Math.ceil(presets.length / COLS) * CELL_H + 40 },
        background: { color: '#e6e8ef' },
        children: [
          {
            is: 'Element2D',
            style: { left: ORIGIN_X, top: 24, width: 900, height: 32, fontSize: 22, color: '#1a1a2e', alignItems: 'center' },
            text: 'bige 图片样式预设 → foreground.effects',
          },
          ...presets.flatMap((p, i) => tile(p, i)),
        ],
      },
    ],
  })

  ;(window as any).engine = engine
  document.body.append(engine.view!)
}

init()
