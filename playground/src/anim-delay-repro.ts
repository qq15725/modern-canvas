import type { Keyframe } from '../../src'
import {
  Animation,
  Element2D,
  Engine,
  Timeline,
} from '../../src'

// ─────────────────────────────────────────────────────────────────────────────
// 复现：一个元素两个动画子节点 + 第二个动画「动态添加」
//   a1 = fadeIn        : delay 0,   dur 500,  loop false, opacity 0→1
//   a2 = 循环位移/旋转  : delay 933, dur 2000, loop true,  left/rotate/opacity
// 用上方按钮在「当前播放头位置」动态把 a2 加进去，观察接手那一刻的表现。
// ─────────────────────────────────────────────────────────────────────────────

const engine = new Engine({
  autoStart: true,
  autoResize: true,
  timeline: Timeline.from([0, 5000], true),
})
;(window as any).engine = engine
document.body.append(engine.view!)

// 第一个动画：fadeIn（声明式，元素一创建就带着）
const a1Keyframes: Keyframe[] = [
  // 真实数据里是 CSS 连字符写法 'ease-out'，现已由 cssEasingPresets 支持（修复前会解析成 NaN）
  { offset: 0, opacity: 0, easing: 'ease-out' },
  { offset: 1, opacity: 1 },
]

// 第二个动画：循环位移 + 旋转（动态添加用）
const a2Keyframes: Keyframe[] = [
  { offset: 0, left: 0, top: 80, rotate: 0, opacity: 1 },
  { offset: 0.5, left: 360, top: 80, rotate: 180, opacity: 0.4 },
  { offset: 1, left: 0, top: 80, rotate: 360, opacity: 1 },
]

// 第一个动画作为子节点（构造时通过第二个参数传入，会被 append 解析/实例化）
const a1 = new Animation({ name: 'a1-fadeIn', duration: 500, delay: 0, loop: false, keyframes: a1Keyframes })

const el = new Element2D({
  // ★ 想复现「父 duration 把循环动画周期裁剪」的 bug，把下面这行的注释打开（duration < 933+2000）
  // duration: 1500,
  style: {
    left: 0,
    top: 80,
    width: 120,
    height: 120,
    backgroundColor: '#00C853',
    borderRadius: 12,
  },
}, [a1])

engine.root.append(el)

let a2: Animation | undefined

function addSecondAnimation(): void {
  if (a2) {
    log('a2 已经添加过了')
    return
  }
  a2 = new Animation({
    name: 'a2-loop',
    loop: true,
    duration: 2000,
    delay: 933.3333333333334,
    keyframes: a2Keyframes,
  })
  el.append(a2)
  log(`已在 t=${Math.round(engine.timeline.currentTime)}ms 动态添加 a2`)
}

function reset(): void {
  location.reload()
}

function togglePause(): void {
  engine.timeline.paused = !engine.timeline.paused
}

// ── 简易控制面板 + HUD ───────────────────────────────────────────────────────
const panel = document.createElement('div')
panel.style.cssText = `position:fixed;top:12px;left:12px;z-index:10;font-family:monospace;font-size:13px;color:#fff;display:flex;flex-direction:column;gap:8px;`
function mkBtn(label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button')
  b.textContent = label
  b.style.cssText = `padding:8px 12px;background:#16213e;color:#a8d8ea;border:1px solid #0f3460;border-radius:6px;cursor:pointer;text-align:left;`
  b.onclick = onClick
  return b
}
const row = document.createElement('div')
row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;'
row.append(
  mkBtn('① 动态添加第二个动画(循环)', addSecondAnimation),
  mkBtn('⏯ 暂停/继续', togglePause),
  mkBtn('↺ 重置', reset),
)
const hud = document.createElement('pre')
hud.style.cssText = 'margin:0;padding:8px 10px;background:rgba(0,0,0,.55);border-radius:6px;white-space:pre;line-height:1.5;'
const logs: string[] = []
function log(msg: string): void {
  logs.unshift(`• ${msg}`)
  logs.length = Math.min(logs.length, 4)
}
panel.append(row, hud)
document.body.append(panel)

const deg = (rad: number): string => (rad * 180 / Math.PI).toFixed(0)
function tick(): void {
  const e = el as any
  hud.textContent = [
    `timeline.currentTime : ${engine.timeline.currentTime.toFixed(0)}ms${engine.timeline.paused ? '  (paused)' : ''}`,
    `element.opacity      : ${e.opacity.toFixed(2)}`,
    `element.left (pos.x) : ${e.position.x.toFixed(1)}`,
    `element.rotation     : ${deg(e.rotation)}°`,
    a2 ? `a2.globalStartTime   : ${a2.globalStartTime.toFixed(0)}ms` : 'a2: 未添加',
    a2 ? `a2.globalDuration    : ${a2.globalDuration.toFixed(0)}ms  (循环周期，应为 2000)` : '',
    '',
    ...logs,
  ].filter(Boolean).join('\n')
  requestAnimationFrame(tick)
}
tick()
