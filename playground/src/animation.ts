import type {
  Keyframe,
} from '../../src'
import {
  Engine,
} from '../../src'

const engine = new Engine({
  autoStart: true,
  autoResize: true,
})

engine.timeline.endTime = 5000
engine.timeline.loop = true

;(window as any).engine = engine

document.body.append(engine.view!)

function testcase(left = 100, top = 100, keyframes: Keyframe[]): any {
  return {
    is: 'Element2D',
    style: { left, top, width: 100, height: 100, backgroundColor: '#00FF00' },
    children: [
      { is: 'Animation', loop: true, keyframes },
    ],
  }
}

async function init(): Promise<void> {
  engine.root.append([
    testcase(100, 100, [
      { opacity: 0, rotate: 180 },
    ]),

    testcase(200, 100, [
      { opacity: 0, transform: 'rotate(-200deg)' },
    ]),

    testcase(300, 100, [
      { opacity: 0, transform: 'translate3d(0, -100%, 0)' },
      { opacity: 1 },
    ]),

    testcase(400, 100, [
      { opacity: 0, transform: 'translate3d(100%, 0, 0) rotate3d(0, 0, 1, -120deg)' },
    ]),
  ])
}

init()
