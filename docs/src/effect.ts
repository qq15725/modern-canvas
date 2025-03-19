import {
  DropShadowEffect,
  EmbossEffect,
  Engine,
  GaussianBlurEffect,
  GlitchEffect,
  Image2D,
  KawaseBlurEffect,
  Node,
  OutlineEffect,
  PixelateEffect,
  Timeline,
  ZoomBlurEffect,
} from '../../src'

const engine = new Engine({
  autoStart: true,
  autoResize: true,
  backgroundColor: '#F6F7F9',
  timeline: Timeline.from([0, 5000], true),
})

;(window as any).engine = engine

document.body.append(engine.view!)

function testEffect(left: number, top: number, effect: Node): Node[] {
  const size = 100
  return [
    new Image2D({
      style: { left, top, width: size, height: size },
      src: '/example.jpg',
    }, [
      effect.clone(),
    ]),
    new Image2D({
      style: { left: left + 100, top, width: size, height: size },
      src: '/example.png',
    }, [
      effect.clone(),
    ]),
    new Image2D({
      style: { left: left + 200, top, width: size, height: size },
      src: '/mask1.png',
    }, [
      effect.clone(),
    ]),
  ]
}

async function init(): Promise<void> {
  engine.root.append([
    ...testEffect(100, 10, new Node()),

    ...testEffect(100, 120, new GaussianBlurEffect()),
    ...testEffect(100, 230, new KawaseBlurEffect()),
    ...testEffect(100, 340, new ZoomBlurEffect()),
    ...testEffect(100, 450, new DropShadowEffect()),
    ...testEffect(100, 560, new OutlineEffect()),

    ...testEffect(500, 120, new EmbossEffect()),
    ...testEffect(500, 230, new PixelateEffect()),
    ...testEffect(500, 340, new GlitchEffect()),
    // ...testEffect(500, 450, new GodrayEffect()),
  ])
}

init()
