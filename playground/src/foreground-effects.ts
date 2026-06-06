import type { Effect } from 'modern-idoc'
import { fonts } from 'modern-font'
import {
  Engine,
} from '../../src'

// 复现并验证「前景图片 + effects」烘焙路径。
// 该路径曾因纹理 ImageBitmap 在 GPU 上传后被 close()（detached）而整张前景渲染空白。
// 这里故意让多张瓦片复用同一张 url（先有无 effects 的瓦片上传、再有带 effects 的瓦片烘焙），
// 直接踩中共享缓存 + detached 的场景；修复后每张都应正常显示。

interface Case {
  label: string
  image: string
  effects?: Effect[]
}

const cases: Case[] = [
  // 同一张 url 既无 effects（先上传）又带 effects（后烘焙）——正是触发 detached 的组合
  { label: 'no effects', image: '/example.png' },
  { label: 'outline', image: '/mask1.png', effects: [{ outline: { width: 8, color: '#FF3366' } }] },
  { label: 'fill recolor', image: '/mask1.png', effects: [{ fill: { color: '#22CCAA' } }] },
  {
    label: 'fill gradient',
    image: '/mask1.png',
    effects: [{
      fill: {
        linearGradient: {
          angle: 45,
          stops: [
            { offset: 0, color: '#7C3AED' },
            { offset: 1, color: '#F59E0B' },
          ],
        },
      },
    }],
  },
  { label: 'shadow', image: '/example.png', effects: [{ shadow: { color: '#000000AA', blur: 16, offsetX: 8, offsetY: 8 } }] },
  {
    label: 'translate ghost',
    image: '/mask1.png',
    effects: [
      { fill: { color: '#FF8800' }, transform: 'translate(16px, 16px)' },
      {}, // 末层不变换 → destination-over 把原图铺在幽灵之后
    ],
  },
  {
    label: 'double outline',
    image: '/mask1.png',
    effects: [
      { outline: { width: 6, color: '#FFFFFF' } }, // 先画细白边（在上）
      { outline: { width: 16, color: '#0EA5E9' } }, // 粗青边 destination-over 落在其后 → 同心双描边
    ],
  },
  {
    label: 'outline + shadow',
    image: '/mask1.png',
    effects: [
      { outline: { width: 6, color: '#FACC15' } },
      { shadow: { color: '#00000099', blur: 14, offsetX: 6, offsetY: 6 } },
    ],
  },
]

const COLS = 4
const CELL_W = 220
const CELL_H = 250
const TILE = 170
const ORIGIN_X = 40
const ORIGIN_Y = 80

function tile(c: Case, i: number): any {
  const col = i % COLS
  const row = Math.floor(i / COLS)
  const x = ORIGIN_X + col * CELL_W
  const y = ORIGIN_Y + row * CELL_H
  return [
    {
      is: 'Element2D',
      style: { left: x, top: y, width: TILE, height: TILE, borderRadius: 8 },
      background: { color: '#FFFFFF' },
      foreground: { image: c.image, effects: c.effects },
    },
    {
      is: 'Element2D',
      style: {
        left: x, top: y + TILE + 8, width: TILE, height: 28, fontSize: 15, color: '#1a1a2e',
        justifyContent: 'center', alignItems: 'center', textAlign: 'center',
      },
      text: c.label,
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
        style: { left: 0, top: 0, width: 2000, height: 1200 },
        background: { color: '#E6E8EF' },
        children: [
          {
            is: 'Element2D',
            style: {
              left: ORIGIN_X, top: 24, width: 800, height: 32, fontSize: 22, color: '#1a1a2e',
              alignItems: 'center',
            },
            text: 'foreground image + effects (baked)',
          },
          ...cases.flatMap((c, i) => tile(c, i)),
        ],
      },
    ],
  })

  ;(window as any).engine = engine

  document.body.append(engine.view!)
}

init()
