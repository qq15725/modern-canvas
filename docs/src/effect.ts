import {
  BlurEffect,
  Engine,
  Image2D,
  KawaseBlurEffect,
  Node,
  OutlineEffect, Timeline,
} from '../../src'

const engine = new Engine({
  autoStart: true,
  autoResize: true,
  backgroundColor: '#F6F7F9',
  timeline: Timeline.from([0, 5000], true),
})

;(window as any).engine = engine

document.body.append(engine.view!)

function testEffect(top: number, effect: Node): Node[] {
  return [
    new Image2D({
      style: {
        left: 100,
        top,
        width: 100,
        height: 100,
      },
      src: '/example.jpg',
    }, [
      effect.clone(),
    ]),
    new Image2D({
      style: {
        left: 200,
        top,
        width: 100,
        height: 100,
      },
      src: '/example.png',
    }, [
      effect.clone(),
    ]),
    new Image2D({
      style: {
        left: 300,
        top,
        width: 100,
        height: 100,
      },
      src: '/mask1.png',
    }, [
      effect.clone(),
    ]),
  ]
}

async function init(): Promise<void> {
  engine.root.append([
    ...testEffect(10, new Node()),
    ...testEffect(120, new BlurEffect()),
    ...testEffect(230, new KawaseBlurEffect()),
    ...testEffect(340, new OutlineEffect()),
  ])
}

init()
