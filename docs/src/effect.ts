import type { Effect } from '../../src'
import {
  Engine,
  Image2D,
  OutlineEffect,
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

function testEffect(left: number, top: number, effect: Effect): Image2D {
  return new Image2D({
    style: {
      left,
      top,
      width: 100,
      height: 100,
    },
    src: '/mask1.png',
  }, [
    effect,
  ])
}

async function init(): Promise<void> {
  engine.root.append([
    testEffect(100, 100, new OutlineEffect()),
  ])
}

init()
