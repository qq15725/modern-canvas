import type { Canvas } from './canvas'

export function render(canvas: Canvas) {
  let then = 0
  let time = 0
  function mainLoop(now: number) {
    canvas.draw(time)
    now *= 0.001
    time += now - then
    then = now
    requestAnimationFrame(mainLoop)
  }
  requestAnimationFrame(mainLoop)
}
