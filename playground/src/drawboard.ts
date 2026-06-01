import type { CheckerboardStyle } from '../../src'
import { Camera2D, DrawboardEffect, Engine, Node } from '../../src'

const engine = new Engine({ autoStart: true, autoResize: true })
;(window as any).engine = engine

engine.root.append(new Camera2D({ internalMode: 'front' }))

// full-viewport backdrop; switch checkerboardStyle live with the buttons below
const board = new DrawboardEffect({
  internalMode: 'back',
  effectMode: 'before',
  checkerboard: true,
  checkerboardStyle: 'dot',
})
engine.root.append(board)

// a few boxes so the pattern reads against real content (and through gaps)
const boxes = [
  { left: 220, top: 140, color: '#4A90D9FF' },
  { left: 420, top: 260, color: '#FF6B35FF' },
  { left: 300, top: 380, color: '#5CB85CFF' },
]
for (const { left, top, color } of boxes) {
  engine.root.append(Node.parse({
    is: 'Element2D',
    style: { left, top, width: 160, height: 110, borderRadius: 12 },
    fill: { color },
  }))
}

document.body.append(engine.view!)

// ---- control bar: switch checkerboard style / toggle pixel grid ----
const styles: CheckerboardStyle[] = ['grid', 'gridDark', 'dot', 'dotDark']

const bar = document.createElement('div')
bar.style.cssText = 'position:fixed;top:12px;left:12px;display:flex;gap:8px;'
  + 'font-family:monospace;font-size:13px;z-index:10;'
document.body.append(bar)

const styleButtons = styles.map((style) => {
  const btn = document.createElement('button')
  btn.textContent = style
  btn.style.cssText = 'padding:6px 12px;border-radius:6px;cursor:pointer;border:1px solid #888;'
  btn.onclick = () => {
    board.checkerboardStyle = style
    refresh()
  }
  bar.append(btn)
  return btn
})

const pixelBtn = document.createElement('button')
pixelBtn.style.cssText = 'padding:6px 12px;border-radius:6px;cursor:pointer;border:1px solid #888;'
pixelBtn.onclick = () => {
  board.pixelGrid = !board.pixelGrid
  refresh()
}
bar.append(pixelBtn)

// ---- second row: per-property dot colour overrides (light/dark presets are
// chosen by the style above; setting any slider here overrides the preset for
// that single channel, clearing it returns to the preset value) ----
const colorBar = document.createElement('div')
colorBar.style.cssText = 'position:fixed;top:52px;left:12px;display:flex;gap:12px;'
  + 'align-items:center;font-family:monospace;font-size:12px;z-index:10;'
  + 'background:#ffffffcc;padding:6px 10px;border-radius:6px;'
document.body.append(colorBar)

const colorProps = [
  { key: 'dotBaseColor', label: 'base' },
  { key: 'dotColor', label: 'dot' },
  { key: 'dotZoomDiff', label: 'diff' },
] as const

const sliders = colorProps.map(({ key, label }) => {
  const wrap = document.createElement('label')
  wrap.style.cssText = 'display:flex;align-items:center;gap:4px;'
  const text = document.createElement('span')
  text.textContent = label
  const slider = document.createElement('input')
  slider.type = 'range'
  slider.min = '0'
  slider.max = '1'
  slider.step = '0.01'
  slider.value = ''
  slider.style.width = '120px'
  const out = document.createElement('span')
  out.style.width = '40px'
  out.textContent = '—'
  slider.oninput = () => {
    ;(board as any)[key] = Number(slider.value)
    out.textContent = Number(slider.value).toFixed(2)
  }
  wrap.append(text, slider, out)
  colorBar.append(wrap)
  return { slider, out, key }
})

const resetBtn = document.createElement('button')
resetBtn.textContent = 'reset to preset'
resetBtn.style.cssText = 'padding:4px 10px;border-radius:4px;border:1px solid #888;cursor:pointer;'
resetBtn.onclick = () => {
  for (const { slider, out, key } of sliders) {
    ;(board as any)[key] = undefined
    slider.value = ''
    out.textContent = '—'
  }
}
colorBar.append(resetBtn)

function refresh(): void {
  styleButtons.forEach((btn, i) => {
    const active = board.checkerboardStyle === styles[i]
    btn.style.background = active ? '#0f3460' : '#fff'
    btn.style.color = active ? '#fff' : '#000'
  })
  pixelBtn.textContent = `pixelGrid: ${board.pixelGrid ? 'on' : 'off'}`
}
refresh()
