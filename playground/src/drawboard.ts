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

function refresh(): void {
  styleButtons.forEach((btn, i) => {
    const active = board.checkerboardStyle === styles[i]
    btn.style.background = active ? '#0f3460' : '#fff'
    btn.style.color = active ? '#fff' : '#000'
  })
  pixelBtn.textContent = `pixelGrid: ${board.pixelGrid ? 'on' : 'off'}`
}
refresh()
