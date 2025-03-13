import type { Keyframe } from '../../src'
import {
  Animation,
  Element2D,
  Engine,
  Timeline,
} from '../../src'

const engine = new Engine({
  autoStart: true,
  autoResize: true,
  backgroundColor: '#F6F7F9',
  timeline: Timeline.from([0, 5000], true),
})

;(window as any).engine = engine

document.body.append(engine.view!)

function testAnimation(keyframes: Keyframe[], left = 100, top = 100): Element2D {
  return new Element2D({
    style: {
      left,
      top,
      width: 100,
      height: 100,
      backgroundColor: '#00FF00',
    },
  }, [
    new Animation({
      loop: true,
      keyframes,
    }),
  ])
}

async function init(): Promise<void> {
  engine.root.append([
    testAnimation([
      { opacity: 0, rotate: 180 },
    ], 100, 100),

    testAnimation([
      { opacity: 0, transform: 'translate3d(0, -100%, 0)' },
      { opacity: 1 },
    ], 200, 100),

    testAnimation([
      { opacity: 0, transform: 'translate3d(100%, 0, 0) rotate3d(0, 0, 1, -120deg)' },
    ], 300, 100),
  ])
}

init()
